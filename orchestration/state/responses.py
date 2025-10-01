"""Evaluation response persistence helpers."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from typing import Any, Dict, Iterable, List, Optional
from uuid import uuid4

from .repository import STATE_LOCK, load_state, persist_state
from .utils import normalize_for_storage, normalize_metadata

_MAX_RESPONSE_ENTRIES = 1000


@dataclass(slots=True)
class EvaluationResponse:
    """Serialized evaluation output captured for double-blind review."""

    id: str
    run_id: str
    persona_id: str
    target_id: str
    target_kind: str
    adapter: str
    status: str
    created_at: str
    summary: Dict[str, Any] = field(default_factory=dict)
    steps: List[Dict[str, Any]] = field(default_factory=list)
    trace: List[Dict[str, Any]] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


def list_evaluation_responses(
    *,
    persona_id: Optional[str] = None,
    target_id: Optional[str] = None,
    target_kind: Optional[str] = None,
    status: Optional[str] = None,
    limit: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """Return persisted evaluation responses filtered for review."""

    with STATE_LOCK:
        state = load_state()
        entries: List[Dict[str, Any]] = list(state.get("responses", []))

    filtered: List[Dict[str, Any]] = []
    for payload in entries:
        if persona_id and payload.get("persona_id") != persona_id:
            continue
        if target_id and payload.get("target_id") != target_id:
            continue
        if target_kind and payload.get("target_kind") != target_kind:
            continue
        if status and payload.get("status") != status:
            continue
        filtered.append(dict(payload))

    if limit is not None:
        filtered = filtered[-limit:]

    filtered.reverse()
    return filtered


def get_evaluation_response(response_id: str) -> Optional[Dict[str, Any]]:
    """Return a single evaluation response by identifier."""

    with STATE_LOCK:
        state = load_state()
        entries: List[Dict[str, Any]] = list(state.get("responses", []))
    for payload in reversed(entries):
        if payload.get("id") == response_id:
            return dict(payload)
    return None


def record_evaluation_response(
    *,
    run_id: str,
    persona_id: str,
    target_id: str,
    target_kind: str,
    adapter: str,
    status: str,
    summary: Dict[str, Any],
    steps: Iterable[Dict[str, Any]] | None = None,
    trace: Iterable[Dict[str, Any]] | None = None,
    metadata: Optional[Dict[str, Any]] = None,
    response_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Persist an evaluation response for downstream feedback workflows."""

    entry = EvaluationResponse(
        id=response_id or str(uuid4()),
        run_id=run_id,
        persona_id=persona_id,
        target_id=target_id,
        target_kind=target_kind,
        adapter=adapter,
        status=status,
        created_at=datetime.now(UTC).isoformat(),
        summary=normalize_for_storage(dict(summary)),
        steps=[normalize_for_storage(step) for step in (steps or [])],
        trace=[normalize_for_storage(event) for event in (trace or [])],
        metadata=normalize_metadata(metadata),
    )

    with STATE_LOCK:
        state = load_state()
        entries: List[Dict[str, Any]] = list(state.get("responses", []))
        entries.append(asdict(entry))
        if len(entries) > _MAX_RESPONSE_ENTRIES:
            entries = entries[-_MAX_RESPONSE_ENTRIES:]
        state["responses"] = entries
        persist_state(state)

    return asdict(entry)

__all__ = [
    "get_evaluation_response",
    "list_evaluation_responses",
    "record_evaluation_response",
]
