"""Audit log persistence helpers."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

from .repository import STATE_LOCK, load_state, persist_state
from .utils import normalize_metadata

_MAX_AUDIT_ENTRIES = 1000


@dataclass(slots=True)
class AuditEvent:
    """Structured audit log event captured by the orchestration service."""

    id: str
    timestamp: str
    actor: str
    action: str
    subject: str
    status: str
    metadata: Dict[str, Any] = field(default_factory=dict)


def list_audit_events(*, limit: Optional[int] = None) -> List[Dict[str, Any]]:
    """Return recorded audit events (ordered oldest→newest)."""

    with STATE_LOCK:
        state = load_state()
        events: List[Dict[str, Any]] = list(state.get("audit", []))
        if limit is not None:
            return events[-limit:]
        return events


def record_audit_event(
    *,
    actor: str,
    action: str,
    subject: str,
    status: str,
    timestamp: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    event_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Persist an audit event in the service log."""

    entry = AuditEvent(
        id=event_id or str(uuid4()),
        timestamp=(timestamp or datetime.now(UTC).isoformat()),
        actor=actor,
        action=action,
        subject=subject,
        status=status,
        metadata=normalize_metadata(metadata),
    )

    with STATE_LOCK:
        state = load_state()
        events: List[Dict[str, Any]] = list(state.get("audit", []))
        events.append(asdict(entry))
        if len(events) > _MAX_AUDIT_ENTRIES:
            events = events[-_MAX_AUDIT_ENTRIES:]

        state["audit"] = events
        persist_state(state)

    return asdict(entry)

__all__ = ["list_audit_events", "record_audit_event"]
