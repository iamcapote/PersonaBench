"""Evaluation-related Pydantic schemas exposed by the orchestration service."""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class EvaluationQueueCreateRequest(BaseModel):
    """Request payload for enqueuing evaluation runs."""

    persona_id: str = Field(..., description="Identifier of the persona to evaluate")
    target_id: str = Field(..., description="Scenario or game identifier to run")
    target_kind: Literal["scenario", "game"] = Field(
        ...,
        description="Whether the target identifier references a scenario or a game",
    )
    status: Optional[str] = Field(
        None,
        description="Initial lifecycle status (defaults to queued if omitted)",
    )
    requested_at: Optional[str] = Field(
        None,
        description="Client-provided ISO timestamp for when the evaluation was requested",
    )
    config: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional configuration forwarded to the evaluation runner",
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Supplemental metadata for UI surfaces",
    )


class EvaluationQueueEntry(BaseModel):
    """Persisted evaluation queue entry."""

    id: str = Field(..., description="Unique identifier assigned to the evaluation run")
    persona_id: str = Field(..., description="Identifier of the persona to evaluate")
    target_id: str = Field(..., description="Scenario or game identifier to run")
    target_kind: Literal["scenario", "game"] = Field(
        ...,
        description="Whether the target identifier references a scenario or a game",
    )
    status: str = Field(..., description="Lifecycle status of the evaluation run")
    requested_at: str = Field(..., description="Timestamp when the run was enqueued")
    started_at: Optional[str] = Field(
        None,
        description="Timestamp when the run began execution",
    )
    completed_at: Optional[str] = Field(
        None,
        description="Timestamp when the run completed or failed",
    )
    error: Optional[str] = Field(
        None,
        description="Failure reason if the run ended unsuccessfully",
    )
    config: Dict[str, Any] = Field(
        default_factory=dict,
        description="Configuration forwarded to the evaluation runner",
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Supplemental metadata for UI surfaces",
    )


class EvaluationQueueSummary(BaseModel):
    """Aggregate statistics for the evaluation queue."""

    total_entries: int = Field(..., description="Total number of tracked evaluation runs")
    active_entries: int = Field(..., description="Queued + running evaluations")
    queued_entries: int = Field(..., description="Evaluations waiting to start")
    running_entries: int = Field(..., description="Evaluations currently executing")
    completed_entries: int = Field(..., description="Evaluations completed successfully")
    failed_entries: int = Field(..., description="Evaluations that ended with failure")
    last_completed_entry_id: Optional[str] = Field(
        None,
        description="Identifier of the most recently completed run",
    )
    last_completed_persona_id: Optional[str] = Field(
        None,
        description="Persona for the most recently completed run",
    )
    last_completed_target_id: Optional[str] = Field(
        None,
        description="Scenario or game identifier for the last completed run",
    )
    last_completed_at: Optional[str] = Field(
        None,
        description="Completion timestamp of the most recent run",
    )
    last_completed_duration_seconds: Optional[float] = Field(
        None,
        description="Duration in seconds of the most recent completed run",
    )
    oldest_queued_entry_id: Optional[str] = Field(
        None,
        description="Identifier of the oldest queued run",
    )
    oldest_queued_persona_id: Optional[str] = Field(
        None,
        description="Persona associated with the oldest queued run",
    )
    oldest_queued_requested_at: Optional[str] = Field(
        None,
        description="Timestamp when the oldest queued run was requested",
    )
    oldest_queued_wait_seconds: Optional[float] = Field(
        None,
        description="Elapsed seconds since the oldest queued run was requested",
    )


class EvaluationQueueCollection(BaseModel):
    """Compound payload containing queue entries and summary metadata."""

    entries: List[EvaluationQueueEntry] = Field(
        default_factory=list,
        description="Serialized queue entries ordered oldest→newest",
    )
    summary: EvaluationQueueSummary = Field(..., description="Aggregate queue metrics")


class EvaluationQueueUpdateRequest(BaseModel):
    """Partial update for evaluation queue entries."""

    status: Optional[str] = Field(None, description="Updated lifecycle status")
    started_at: Optional[str] = Field(
        None,
        description="Timestamp when execution started",
    )
    completed_at: Optional[str] = Field(
        None,
        description="Timestamp when execution finished",
    )
    error: Optional[str] = Field(None, description="Failure reason if applicable")
    metadata: Optional[Dict[str, Any]] = Field(
        None,
        description="Metadata to merge into the existing entry",
    )


class EvaluationRequest(BaseModel):
    """Request payload to trigger an evaluation run."""

    persona: str = Field(..., description="Persona identifier to evaluate")
    scenario: str = Field(..., description="Scenario or game identifier to run")
    config: Dict[str, Any] = Field(default_factory=dict, description="Optional override config")


class EvaluationResult(BaseModel):
    """Minimal evaluation result payload."""

    status: str = Field(..., description="Lifecycle status of the evaluation run")
    details: Dict[str, Any] = Field(default_factory=dict, description="Raw chain output")


class EvaluationEventPayload(BaseModel):
    """Structured event emitted during evaluation queue processing."""

    type: Literal["status", "result", "error"] = Field(
        ..., description="Event category emitted by the evaluation service",
    )
    status: Optional[str] = Field(None, description="Evaluation status at the time of the event")
    timestamp: str = Field(..., description="ISO timestamp when the event was recorded")
    queue_entry: Dict[str, Any] = Field(
        default_factory=dict,
        description="Snapshot of the queue entry when the event fired",
    )
    result: Optional[Dict[str, Any]] = Field(
        None,
        description="Evaluation result payload when the run completes successfully",
    )
    error: Optional[str] = Field(None, description="Error message when the run fails")
    error_type: Optional[str] = Field(
        None,
        description="Exception class name associated with a failure event",
    )


class EvaluationResponseSummary(BaseModel):
    """Persisted evaluation response metadata exposed to reviewers."""

    id: str = Field(..., description="Unique identifier for the stored response")
    run_id: str = Field(..., description="Run identifier associated with the evaluation")
    persona_id: str = Field(..., description="Persona identifier used for the evaluation")
    target_id: str = Field(..., description="Scenario or game identifier evaluated")
    target_kind: Literal["scenario", "game"] = Field(
        ...,
        description="Whether the response belongs to a scenario or game run",
    )
    adapter: str = Field(..., description="Adapter responsible for executing the evaluation")
    status: str = Field(..., description="Lifecycle status of the evaluation run")
    created_at: str = Field(..., description="Timestamp when the response was recorded")
    summary: Dict[str, Any] = Field(
        default_factory=dict,
        description="Summary statistics for the evaluation run",
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Supplemental metadata useful for reviewers",
    )


class EvaluationResponseDetail(EvaluationResponseSummary):
    """Detailed evaluation response including replay artefacts."""

    steps: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Serialized step results captured during the rollout",
    )
    trace: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Trace log entries recorded throughout the run",
    )
