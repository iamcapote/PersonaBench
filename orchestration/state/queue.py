"""Evaluation queue persistence helpers."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from typing import Any, Dict, List, MutableMapping, Optional
from uuid import uuid4

from .repository import STATE_LOCK, load_state, persist_state
from .utils import normalize_metadata, parse_timestamp

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


def get_queue_entry(entry_id: str) -> Optional[Dict[str, Any]]:
    """Return a single evaluation queue entry by identifier."""

    with STATE_LOCK:
        state = load_state()
        queue: List[Dict[str, Any]] = list(state.get("queue", []))

    for payload in reversed(queue):
        if payload.get("id") == entry_id:
            return dict(payload)
    return None


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


def summarize_queue(entries: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    """Return aggregate statistics for the evaluation queue."""

    if entries is None:
        entries = list_queue_entries()

    total = len(entries)
    queued = 0
    running = 0
    completed = 0
    failed = 0
    latest_completed_entry: Optional[Dict[str, Any]] = None
    latest_completed_at: Optional[datetime] = None
    latest_completed_duration: Optional[float] = None
    oldest_queued_entry: Optional[Dict[str, Any]] = None
    oldest_queued_at: Optional[datetime] = None

    now = datetime.now(UTC)

    for entry in entries:
        status = entry.get("status")
        if status == "queued":
            queued += 1
            if oldest_queued_entry is None:
                ts = parse_timestamp(entry.get("requested_at"))
                if ts is not None:
                    oldest_queued_entry = entry
                    oldest_queued_at = ts
        elif status == "running":
            running += 1
        elif status == "completed":
            completed += 1
        elif status == "failed":
            failed += 1

    for entry in reversed(entries):
        if entry.get("status") != "completed":
            continue

        completed_ts = parse_timestamp(entry.get("completed_at"))
        if completed_ts is None:
            continue

        latest_completed_entry = entry
        latest_completed_at = completed_ts

        started_ts = parse_timestamp(entry.get("started_at"))
        if started_ts is not None:
            latest_completed_duration = (completed_ts - started_ts).total_seconds()
        break

    return {
        "total_entries": total,
        "active_entries": queued + running,
        "queued_entries": queued,
        "running_entries": running,
    "completed_entries": completed,
        "failed_entries": failed,
        "last_completed_entry_id": (latest_completed_entry or {}).get("id"),
        "last_completed_persona_id": (latest_completed_entry or {}).get("persona_id"),
        "last_completed_target_id": (latest_completed_entry or {}).get("target_id"),
        "last_completed_at": latest_completed_at.isoformat() if latest_completed_at else None,
        "last_completed_duration_seconds": latest_completed_duration,
        "oldest_queued_entry_id": (oldest_queued_entry or {}).get("id"),
        "oldest_queued_persona_id": (oldest_queued_entry or {}).get("persona_id"),
        "oldest_queued_requested_at": oldest_queued_at.isoformat() if oldest_queued_at else None,
        "oldest_queued_wait_seconds": (now - oldest_queued_at).total_seconds() if oldest_queued_at else None,
    }

__all__ = [
    "enqueue_evaluation",
    "get_queue_entry",
    "list_queue_entries",
    "summarize_queue",
    "update_queue_entry",
]
