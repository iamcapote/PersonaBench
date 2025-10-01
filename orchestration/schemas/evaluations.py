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
