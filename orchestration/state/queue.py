"""Evaluation queue persistence helpers."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from typing import Any, Dict, List, MutableMapping, Optional
from uuid import uuid4

from .repository import STATE_LOCK, load_state, persist_state
from .utils import normalize_metadata

_MAX_QUEUE_ENTRIES = 500


@dataclass(slots=True)
class EvaluationQueueEntry:
    """Serialized representation of an evaluation run tracked by the service."""

    id: str
    persona_id: str
    target_id: str
    target_kind: str
    status: str
    requested_at: str
    config: Dict[str, Any] = field(default_factory=dict)
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


def _serialize_queue_entry(entry: EvaluationQueueEntry) -> Dict[str, Any]:
    return asdict(entry)


def list_queue_entries(*, limit: Optional[int] = None) -> List[Dict[str, Any]]:
    """Return recorded evaluation queue entries (ordered oldest→newest)."""

    with STATE_LOCK:
        state = load_state()
        queue: List[Dict[str, Any]] = list(state.get("queue", []))
        if limit is not None:
            return queue[-limit:]
        return queue


def enqueue_evaluation(
    *,
    persona_id: str,
    target_id: str,
    target_kind: str,
    status: str = "queued",
    requested_at: Optional[str] = None,
    config: Optional[Dict[str, Any]] = None,
    metadata: Optional[Dict[str, Any]] = None,
    entry_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Record an evaluation request in the persistent queue."""

    entry = EvaluationQueueEntry(
        id=entry_id or str(uuid4()),
        persona_id=persona_id,
        target_id=target_id,
        target_kind=target_kind,
        status=status,
        requested_at=(requested_at or datetime.now(UTC).isoformat()),
        config=dict(config or {}),
        metadata=normalize_metadata(metadata),
    )

    with STATE_LOCK:
        state = load_state()
        queue: List[Dict[str, Any]] = list(state.get("queue", []))

        queue.append(_serialize_queue_entry(entry))
        if len(queue) > _MAX_QUEUE_ENTRIES:
            queue = queue[-_MAX_QUEUE_ENTRIES:]

        state["queue"] = queue
        persist_state(state)

    return _serialize_queue_entry(entry)


def update_queue_entry(
    entry_id: str,
    *,
    status: Optional[str] = None,
    started_at: Optional[str] = None,
    completed_at: Optional[str] = None,
    error: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Update an existing queue entry and persist the modification."""

    with STATE_LOCK:
        state = load_state()
        queue: List[Dict[str, Any]] = list(state.get("queue", []))
        for index, payload in enumerate(queue):
            if payload.get("id") != entry_id:
                continue

            if status is not None:
                payload["status"] = status
            if started_at is not None:
                payload["started_at"] = started_at
            if completed_at is not None:
                payload["completed_at"] = completed_at
            if error is not None:
                payload["error"] = error
            if metadata is not None:
                payload.setdefault("metadata", {})
                existing = payload["metadata"]
                if isinstance(existing, MutableMapping):
                    existing.update(normalize_metadata(metadata))
                else:
                    payload["metadata"] = normalize_metadata(metadata)

            queue[index] = dict(payload)
            state["queue"] = queue
            persist_state(state)
            return dict(payload)

    raise KeyError(f"Queue entry '{entry_id}' not found")

__all__ = [
    "enqueue_evaluation",
    "list_queue_entries",
    "update_queue_entry",
]
