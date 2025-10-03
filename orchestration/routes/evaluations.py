"""Public evaluation execution routes."""

from __future__ import annotations

import asyncio
import hashlib
import json
from datetime import UTC, datetime
from typing import Dict, List
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Request, Response, status
from fastapi.responses import StreamingResponse

from ..catalog import get_game, get_persona, get_scenario
from ..chains import build_evaluation_chain
from ..schemas import (
    EvaluationEventPayload,
    EvaluationQueueEntry,
    EvaluationRequest,
    EvaluationResult,
)
from ..services.event_stream import get_event_stream
from ..state import (
    enqueue_evaluation,
    get_queue_entry,
    list_queue_entries,
    summarize_queue,
)
from ..services.evaluations import EvaluationJobPayload
from ..worker import get_evaluation_worker

router = APIRouter(tags=["evaluations"])

evaluation_chain = build_evaluation_chain()


@router.get("/evaluations/queue")
def get_evaluation_queue() -> Dict[str, object]:
    """Return persisted evaluation queue entries plus summary statistics."""

    entries = list_queue_entries()
    summary = summarize_queue(entries)
    return {
        "entries": entries,
        "summary": summary,
    }


@router.get("/evaluations/queue/{entry_id}", response_model=EvaluationQueueEntry)
def get_evaluation_queue_entry(
    entry_id: str,
    request: Request,
    response: Response,
) -> EvaluationQueueEntry | Response:
    """Return a single queue entry and support long-polling via ETag caching."""

    entry = get_queue_entry(entry_id)
    if entry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Queue entry '{entry_id}' not found",
        )

    etag = _compute_etag(entry)
    client_etags = _parse_client_etags(request.headers.get("if-none-match"))
    if "*" in client_etags or etag in client_etags:
        return Response(status_code=status.HTTP_304_NOT_MODIFIED, headers={"ETag": etag})

    response.headers["ETag"] = etag
    return EvaluationQueueEntry.model_validate(entry)


@router.post(
    "/evaluations",
    response_model=EvaluationResult,
    status_code=status.HTTP_202_ACCEPTED,
)
def create_evaluation(request: EvaluationRequest) -> EvaluationResult:
    """Kick off a minimal evaluation chain for the provided persona and scenario or game."""

    persona = get_persona(request.persona)
    if persona is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Persona '{request.persona}' not found",
        )

    scenario = get_scenario(request.scenario)
    game = None if scenario is not None else get_game(request.scenario)
    if scenario is None and game is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scenario or game '{request.scenario}' not found",
        )

    target_entry: Dict[str, object] = scenario or game or {}
    target_kind = "scenario" if scenario is not None else "game"
    config: Dict[str, object] = dict(request.config)
    run_id = str(config.get("run_id") or uuid4())
    config.setdefault("run_id", run_id)

    persona_identifier = str(persona.get("name") or request.persona)
    target_identifier = str(target_entry.get("id", request.scenario))

    requested_at = datetime.now(UTC).isoformat()
    queue_entry = enqueue_evaluation(
        persona_id=persona_identifier,
        target_id=target_identifier,
        target_kind=target_kind,
        status="queued",
        requested_at=requested_at,
        config=config,
        metadata={
            "persona_version": persona.get("version"),
            "target_title": target_entry.get("title") or target_entry.get("name"),
        },
    )

    chain_payload: Dict[str, object] = {
        "persona": persona,
        "config": config,
        "target": target_entry,
        "target_kind": target_kind,
        "target_id": target_identifier,
    }
    if scenario is not None:
        chain_payload["scenario"] = scenario
    if game is not None:
        chain_payload["game"] = game

    job = EvaluationJobPayload(
        queue_entry_id=queue_entry["id"],
        run_id=run_id,
        persona_id=persona_identifier,
        persona_version=str(persona.get("version")) if persona.get("version") else None,
        target_id=target_identifier,
        target_kind=target_kind,
        target_title=target_entry.get("title") or target_entry.get("name"),
        config=dict(config),
        adapter_hint=str(
            target_entry.get("environment")
            or target_entry.get("family")
            or ""
        )
        or None,
        chain_payload=chain_payload,
        runner=evaluation_chain.invoke,
    )

    get_evaluation_worker().submit(job)

    get_event_stream().publish(
        queue_entry["id"],
        {
            "type": "status",
            "status": "queued",
            "timestamp": requested_at,
            "queue_entry": queue_entry,
        },
    )

    details = {
        "queue_entry_id": queue_entry["id"],
        "run_id": run_id,
        "persona_id": persona_identifier,
        "target_id": target_identifier,
        "target_kind": target_kind,
        "status": "queued",
    }

    return EvaluationResult(status="queued", details=details)


@router.get("/evaluations/queue/{entry_id}/events")
async def stream_evaluation_events(entry_id: str) -> StreamingResponse:
    """Stream evaluation lifecycle events via Server-Sent Events."""

    entry = get_queue_entry(entry_id)
    if entry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Queue entry '{entry_id}' not found",
        )

    async def event_generator():
        loop = asyncio.get_running_loop()
        queue, history = get_event_stream().subscribe(entry_id, loop)
        try:
            for item in history:
                yield _encode_sse(item)
            if history and history[-1].get("type") in {"result", "error"}:
                return
            while True:
                event = await queue.get()
                yield _encode_sse(event)
                if event.get("type") in {"result", "error"}:
                    break
        finally:
            get_event_stream().unsubscribe(entry_id, queue)

    headers = {
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
    }
    return StreamingResponse(event_generator(), media_type="text/event-stream", headers=headers)


@router.get(
    "/evaluations/queue/{entry_id}/events/history",
    response_model=List[EvaluationEventPayload],
)
def get_evaluation_event_history(entry_id: str) -> List[EvaluationEventPayload]:
    """Return recorded events for an evaluation queue entry."""

    if get_queue_entry(entry_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Queue entry '{entry_id}' not found",
        )

    events = get_event_stream().history(entry_id)
    return [EvaluationEventPayload.model_validate(item) for item in events]


def _compute_etag(entry: Dict[str, object]) -> str:
    payload = json.dumps(entry, sort_keys=True, separators=(",", ":"))
    digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()
    return f'W/"{digest}"'


def _parse_client_etags(header_value: str | None) -> List[str]:
    if not header_value:
        return []
    tokens = (token.strip() for token in header_value.split(","))
    normalized = []
    for token in tokens:
        if not token:
            continue
        normalized.append(token)
    return normalized


def _encode_sse(event: Dict[str, object]) -> str:
    payload = json.dumps(event, separators=(",", ":"))
    return f"data: {payload}\n\n"
