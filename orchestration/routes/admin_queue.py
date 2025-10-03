"""Administrative endpoints for evaluation queue management."""

from __future__ import annotations

from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..auth import require_admin
from ..schemas import (
    EvaluationQueueCollection,
    EvaluationQueueCreateRequest,
    EvaluationQueueEntry,
    EvaluationQueueUpdateRequest,
)
from ..state import enqueue_evaluation, list_queue_entries, summarize_queue, update_queue_entry

router = APIRouter(
    prefix="/admin/queue",
    tags=["admin", "queue"],
    dependencies=[Depends(require_admin)],
)


@router.get("", response_model=EvaluationQueueCollection)
def read_evaluation_queue(limit: Optional[int] = Query(None, ge=1, le=500)) -> EvaluationQueueCollection:
    """Return the persisted evaluation queue along with aggregate metrics."""

    entries = list_queue_entries(limit=limit)
    summary_payload = summarize_queue()
    return EvaluationQueueCollection.model_validate(
        {
            "entries": entries,
            "summary": summary_payload,
        }
    )


@router.post(
    "",
    response_model=EvaluationQueueEntry,
    status_code=status.HTTP_201_CREATED,
)
def create_queue_entry(request: EvaluationQueueCreateRequest) -> EvaluationQueueEntry:
    """Record a new evaluation request in the persistent queue."""

    entry = enqueue_evaluation(
        persona_id=request.persona_id,
        target_id=request.target_id,
        target_kind=request.target_kind,
        status=request.status or "queued",
        requested_at=request.requested_at,
        config=request.config,
        metadata=request.metadata,
    )
    return EvaluationQueueEntry.model_validate(entry)


@router.patch("/{entry_id}", response_model=EvaluationQueueEntry)
def update_queue_entry_route(
    entry_id: str,
    request: EvaluationQueueUpdateRequest,
) -> EvaluationQueueEntry:
    """Update fields on an existing queue entry."""

    try:
        payload: Dict[str, object] = update_queue_entry(
            entry_id,
            status=request.status,
            started_at=request.started_at,
            completed_at=request.completed_at,
            error=request.error,
            metadata=request.metadata,
        )
    except KeyError as exc:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail=f"Queue entry '{entry_id}' not found",
        ) from exc

    return EvaluationQueueEntry.model_validate(payload)
