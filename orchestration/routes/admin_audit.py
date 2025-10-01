"""Administrative endpoints for audit log access."""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status

from ..auth import require_admin
from ..schemas import AuditEvent, AuditEventCreateRequest
from ..state import list_audit_events, record_audit_event

router = APIRouter(
    prefix="/admin/audit",
    tags=["admin", "audit"],
    dependencies=[Depends(require_admin)],
)


@router.get("", response_model=List[AuditEvent])
def read_audit_log(limit: Optional[int] = Query(None, ge=1, le=1000)) -> List[AuditEvent]:
    """Return persisted audit log events."""

    events = list_audit_events(limit=limit)
    return [AuditEvent.model_validate(entry) for entry in events]


@router.post(
    "",
    response_model=AuditEvent,
    status_code=status.HTTP_201_CREATED,
)
def create_audit_log_entry(request: AuditEventCreateRequest) -> AuditEvent:
    """Record an audit log event."""

    event = record_audit_event(
        actor=request.actor,
        action=request.action,
        subject=request.subject,
        status=request.status,
        timestamp=request.timestamp,
        metadata=request.metadata,
    )
    return AuditEvent.model_validate(event)
