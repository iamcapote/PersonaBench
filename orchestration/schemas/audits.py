"""Audit-related Pydantic schemas exposed by the orchestration service."""

from __future__ import annotations

from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class AuditEventPayload(BaseModel):
    """Shared fields for capturing audit log events."""

    actor: str = Field(..., description="Actor responsible for the event (e.g., operator, orchestrator)")
    action: str = Field(..., description="Symbolic action identifier suitable for filtering")
    subject: str = Field(..., description="Resource identifier affected by the action")
    status: str = Field(..., description="Outcome status such as success or failure")
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Arbitrary metadata payload providing additional context",
    )


class AuditEventCreateRequest(AuditEventPayload):
    """Request payload for recording audit entries."""

    timestamp: Optional[str] = Field(
        None,
        description="ISO timestamp to use for the event (defaults to server time if omitted)",
    )


class AuditEvent(AuditEventPayload):
    """Persisted audit log entry."""

    id: str = Field(..., description="Unique identifier for the audit event")
    timestamp: str = Field(..., description="ISO timestamp when the event occurred")
