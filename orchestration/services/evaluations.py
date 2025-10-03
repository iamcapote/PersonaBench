"""Evaluation execution helpers used by the orchestration service."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Callable, Dict, Optional

from ..state import get_queue_entry, record_evaluation_response, update_queue_entry
from .event_stream import get_event_stream

logger = logging.getLogger(__name__)


RunnerCallable = Callable[[Dict[str, Any]], Dict[str, Any]]


@dataclass(slots=True)
class EvaluationJobPayload:
    """Context required to execute an evaluation run."""

    queue_entry_id: str
    run_id: str
    persona_id: str
    persona_version: Optional[str]
    target_id: str
    target_kind: str
    target_title: Optional[str]
    config: Dict[str, Any]
    adapter_hint: Optional[str]
    chain_payload: Dict[str, Any]
    runner: RunnerCallable


def execute_evaluation_job(job: EvaluationJobPayload) -> Dict[str, Any]:
    """Execute an evaluation run and persist queue + response state."""

    started_at = datetime.now(UTC).isoformat()
    update_queue_entry(
        job.queue_entry_id,
        status="running",
        started_at=started_at,
        metadata={"run_id": job.run_id},
    )
    _publish_status_event(job.queue_entry_id, "running", started_at)

    try:
        payload = json.loads(json.dumps(job.chain_payload))
    except (TypeError, ValueError):
        payload = dict(job.chain_payload)

    try:
        result = job.runner(payload)
    except Exception as exc:  # pragma: no cover - defensive guard
        logger.exception("Evaluation run failed", exc_info=exc)
        return _finalize_failure(job, error=str(exc), error_type=exc.__class__.__name__)

    if not isinstance(result, dict):
        return _finalize_failure(job, error="Evaluation chain returned unexpected payload")

    return _finalize_success(job, result)


def _finalize_success(job: EvaluationJobPayload, result: Dict[str, Any]) -> Dict[str, Any]:
    status_value = str(result.get("status", "pending"))
    adapter_name = _resolve_adapter_name(job, result)

    metadata = {
        "persona_version": job.persona_version,
        "target_title": job.target_title,
        "config": dict(job.config),
        "queue_entry_id": job.queue_entry_id,
    }

    record_evaluation_response(
        run_id=job.run_id,
        persona_id=job.persona_id,
        target_id=job.target_id,
        target_kind=job.target_kind,
        adapter=adapter_name,
        status=status_value,
        summary=result.get("summary") or {},
        steps=result.get("steps") or [],
        trace=result.get("trace") or [],
        metadata=metadata,
    )

    completed_at = datetime.now(UTC).isoformat()
    update_queue_entry(
        job.queue_entry_id,
        status=status_value,
        completed_at=completed_at,
        error=str(result.get("error")) if status_value != "completed" else None,
        metadata={
            "summary": result.get("summary") or {},
            "adapter": adapter_name,
        },
    )

    entry_snapshot = get_queue_entry(job.queue_entry_id)
    result_payload = dict(result)
    get_event_stream().publish(
        job.queue_entry_id,
        {
            "type": "result",
            "status": status_value,
            "timestamp": completed_at,
            "queue_entry": entry_snapshot,
            "result": result_payload,
        },
    )

    result.setdefault("queue_entry_id", job.queue_entry_id)
    result.setdefault("run_id", job.run_id)
    return result


def _finalize_failure(
    job: EvaluationJobPayload,
    *,
    error: str,
    error_type: Optional[str] = None,
) -> Dict[str, Any]:
    status_value = "failed"
    adapter_name = job.adapter_hint or ""

    summary = {"error": error}
    metadata = {
        "persona_version": job.persona_version,
        "target_title": job.target_title,
        "config": dict(job.config),
        "queue_entry_id": job.queue_entry_id,
    }

    record_evaluation_response(
        run_id=job.run_id,
        persona_id=job.persona_id,
        target_id=job.target_id,
        target_kind=job.target_kind,
        adapter=adapter_name,
        status=status_value,
        summary=summary,
        steps=[],
        trace=[],
        metadata={"error_type": error_type, **metadata} if error_type else metadata,
    )

    completed_at = datetime.now(UTC).isoformat()
    update_queue_entry(
        job.queue_entry_id,
        status=status_value,
        completed_at=completed_at,
        error=error,
        metadata={
            "summary": summary,
            "adapter": adapter_name,
        },
    )

    entry_snapshot = get_queue_entry(job.queue_entry_id)
    get_event_stream().publish(
        job.queue_entry_id,
        {
            "type": "error",
            "status": status_value,
            "timestamp": completed_at,
            "queue_entry": entry_snapshot,
            "error": error,
            "error_type": error_type,
        },
    )

    return {
        "status": status_value,
        "error": error,
        "error_type": error_type,
        "run_id": job.run_id,
        "queue_entry_id": job.queue_entry_id,
    }


def _resolve_adapter_name(job: EvaluationJobPayload, result: Dict[str, Any]) -> str:
    adapter_value = result.get("adapter") or job.adapter_hint
    if adapter_value:
        return str(adapter_value)

    target = result.get("target")
    if isinstance(target, dict):
        candidate = target.get("environment") or target.get("family")
        if candidate:
            return str(candidate)

    return ""


def _publish_status_event(entry_id: str, status_value: str, timestamp: str) -> None:
    entry_snapshot = get_queue_entry(entry_id)
    get_event_stream().publish(
        entry_id,
        {
            "type": "status",
            "status": status_value,
            "timestamp": timestamp,
            "queue_entry": entry_snapshot,
        },
    )


__all__ = [
    "EvaluationJobPayload",
    "execute_evaluation_job",
]
