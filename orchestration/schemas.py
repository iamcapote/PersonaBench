"""Pydantic schemas exposed by the orchestration service."""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class PersonaSummary(BaseModel):
    """Lightweight persona representation for listings."""

    name: str = Field(..., description="Human-readable persona name")
    version: str = Field(..., description="Semantic version of the persona definition")
    description: Optional[str] = Field(
        None, description="Short description suitable for UI previews"
    )
    risk_tolerance: Optional[float] = Field(
        None, description="Probability-weighted appetite for risk"
    )
    planning_horizon: Optional[int] = Field(
        None, description="Number of steps the persona typically plans ahead"
    )
    deception_aversion: Optional[float] = Field(
        None, description="Tendency to avoid deceptive tactics"
    )
    memory_window: Optional[int] = Field(
        None, description="Size of the rolling memory window")
    tools: List[str] = Field(
        default_factory=list,
        description="Tool identifiers the persona is allowed to use",
    )
    source_path: Optional[str] = Field(
        None, description="Repository-relative path to the persona source file"
    )
    definition: Dict[str, Any] = Field(
        default_factory=dict,
        description="Raw persona specification for client-side rendering",
    )


class ScenarioSummary(BaseModel):
    """Scenario metadata returned to clients."""

    key: str = Field(..., description="Unique scenario identifier")
    title: str = Field(..., description="Display name for the scenario")
    environment: str = Field(..., description="Environment adapter key")
    tags: List[str] = Field(default_factory=list, description="Arbitrary scenario tags")
    description: Optional[str] = Field(
        None, description="Brief description sourced from metadata"
    )
    mode: Optional[str] = Field(None, description="Scenario execution mode")
    source_path: Optional[str] = Field(
        None, description="Repository-relative path to the scenario definition"
    )
    definition: Dict[str, Any] = Field(
        default_factory=dict,
        description="Raw scenario definition for client rendering",
    )


class GameSummary(BaseModel):
    """Game metadata returned to clients."""

    key: str = Field(..., description="Unique game identifier")
    title: str = Field(..., description="Display name for the game")
    family: str = Field(..., description="Game family or variant key")
    tags: List[str] = Field(default_factory=list, description="Tags representing mechanics or skills")
    description: Optional[str] = Field(None, description="Short description sourced from metadata")
    mode: Optional[str] = Field(None, description="Game execution mode")
    difficulty: Optional[str] = Field(None, description="Relative difficulty level for the game")
    estimated_time: Optional[int] = Field(None, description="Estimated minutes to complete a run")
    definition: Dict[str, Any] = Field(
        default_factory=dict,
        description="Raw game definition for client rendering",
    )


class AssetSnippet(BaseModel):
    """Structured snippet returned for transparency assets."""

    path: str = Field(..., description="Repository-relative path to the asset")
    content: str = Field(..., description="Raw file contents for the asset")
    language: Optional[str] = Field(
        None, description="Suggested syntax highlighting language for the asset"
    )


class GameAssetResponse(BaseModel):
    """Transparency payload surfacing game manifests and adapters."""

    manifest: AssetSnippet = Field(..., description="Primary game manifest definition")
    rule_pack: Optional[AssetSnippet] = Field(
        None,
        description="Optional rule pack or supplemental definition for the game",
    )
    adapter: Optional[AssetSnippet] = Field(
        None,
        description="Adapter implementation powering the game environment",
    )


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
    """Persisted evaluation response summary for reviewer listings."""

    id: str = Field(..., description="Unique identifier of the stored evaluation response")
    run_id: str = Field(..., description="Run identifier associated with the evaluation")
    persona_id: str = Field(..., description="Identifier of the evaluated persona")
    target_id: str = Field(..., description="Scenario or game identifier used during evaluation")
    target_kind: Literal["scenario", "game"] = Field(
        ..., description="Whether the evaluation targeted a scenario or game"
    )
    adapter: str = Field(..., description="Adapter key that executed the evaluation")
    status: str = Field(..., description="Outcome status recorded for the evaluation run")
    created_at: str = Field(..., description="Timestamp when the response was recorded")
    summary: Dict[str, Any] = Field(
        default_factory=dict,
        description="Lightweight summary metrics for display",
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Supplemental metadata for reviewer context",
    )


class EvaluationResponseDetail(EvaluationResponseSummary):
    """Full evaluation response payload including steps and traces."""

    steps: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Serialized step-by-step rollout results",
    )
    trace: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Trace events captured during evaluation",
    )


class EvaluationResponseSummary(BaseModel):
    """Stored evaluation response available for double-blind review."""

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


class ComparisonPairRequest(BaseModel):
    """Request payload for generating anonymised comparison pairs."""

    target_id: Optional[str] = Field(
        None,
        description="Scenario or game identifier to constrain pairing",
    )
    target_kind: Optional[Literal["scenario", "game"]] = Field(
        None,
        description="Restrict pairing to scenario or game runs",
    )
    status: Optional[str] = Field(
        "completed",
        description="Lifecycle status filter applied before pairing",
    )
    exclude_responses: List[str] = Field(
        default_factory=list,
        description="Response identifiers that should not be included in the pair",
    )


class ComparisonResponse(BaseModel):
    """An anonymised evaluation response presented for review."""

    slot: Literal["A", "B"] = Field(..., description="Anonymised slot assigned to the response")
    response_id: str = Field(..., description="Identifier of the underlying stored response")
    recorded_at: Optional[str] = Field(
        None,
        description="Timestamp when the response was captured",
    )
    adapter: Optional[str] = Field(
        None,
        description="Adapter that produced the response",
    )
    summary: Dict[str, Any] = Field(
        default_factory=dict,
        description="Summary metrics exposed to reviewers",
    )
    steps: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Step-by-step rollout artefacts for qualitative review",
    )
    trace: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Trace log entries with contextual metadata",
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Supplemental metadata safe for disclosure",
    )


class ComparisonPair(BaseModel):
    """An anonymised A/B comparison payload for double-blind review."""

    id: str = Field(..., description="Unique identifier assigned to the comparison pair")
    target_id: str = Field(..., description="Scenario or game identifier shared by both responses")
    target_kind: Literal["scenario", "game"] = Field(
        ...,
        description="Whether the pair references a scenario or game run",
    )
    created_at: str = Field(..., description="Timestamp when the pair was generated")
    adapter: Optional[str] = Field(
        None,
        description="Adapter associated with the paired responses",
    )
    status: str = Field(..., description="Lifecycle status for the comparison pair")
    responses: List[ComparisonResponse] = Field(
        ..., description="Anonymised responses included in the comparison"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Contextual metadata safe for reviewer consumption",
    )


class ComparisonVoteCreateRequest(BaseModel):
    """Request payload for recording reviewer preferences."""

    winner_slot: Literal["A", "B"] = Field(
        ...,
        description="Anonymised slot that the reviewer preferred",
    )
    reviewer: Optional[str] = Field(
        None,
        description="Optional reviewer identifier for audit trails",
    )
    rationale: Optional[str] = Field(
        None,
        description="Optional free-form justification for the selection",
    )
    confidence: Optional[float] = Field(
        None,
        ge=0.0,
        le=1.0,
        description="Optional confidence score between 0 and 1",
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional metadata captured alongside the vote",
    )


class ComparisonVote(BaseModel):
    """Persisted reviewer vote associated with a comparison pair."""

    id: str = Field(..., description="Unique identifier assigned to the stored vote")
    pair_id: str = Field(..., description="Identifier of the comparison pair that was reviewed")
    winner_slot: Literal["A", "B"] = Field(
        ...,
        description="Slot that the reviewer selected as the winner",
    )
    winning_response_id: str = Field(
        ...,
        description="Identifier of the evaluation response assigned to the winning slot",
    )
    losing_response_id: str = Field(
        ...,
        description="Identifier of the evaluation response assigned to the losing slot",
    )
    recorded_at: str = Field(
        ...,
        description="Timestamp when the vote was recorded by the service",
    )
    reviewer: Optional[str] = Field(
        None,
        description="Reviewer identifier recorded with the vote",
    )
    rationale: Optional[str] = Field(
        None,
        description="Free-form reviewer justification, if provided",
    )
    confidence: Optional[float] = Field(
        None,
        ge=0.0,
        le=1.0,
        description="Reviewer-reported confidence score between 0 and 1",
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Sanitised metadata associated with the vote",
    )


class ComparisonAggregationSummary(BaseModel):
    """Summary statistics for Bradley–Terry aggregation runs."""

    total_votes: int = Field(..., description="Total number of votes included in the aggregation")
    pair_count: int = Field(..., description="Number of unique comparison pairs represented")
    persona_count: int = Field(..., description="Distinct personas included in the results")
    last_vote_recorded_at: Optional[str] = Field(
        None, description="Timestamp of the most recent vote included"
    )
    converged: bool = Field(..., description="Whether the solver converged within iteration limits")
    iterations: int = Field(..., description="Number of iterations executed by the solver")
    target_id: Optional[str] = Field(None, description="Optional target identifier filter applied")
    target_kind: Optional[str] = Field(None, description="Optional target kind filter applied")
    adapter: Optional[str] = Field(None, description="Optional adapter filter applied")


class ComparisonAggregationResult(BaseModel):
    """Bradley–Terry aggregation payload returned to clients."""

    rankings: Dict[str, float] = Field(
        default_factory=dict,
        description="Normalized Bradley–Terry scores per persona identifier",
    )
    summary: ComparisonAggregationSummary = Field(
        ..., description="Summary statistics accompanying the aggregation"
    )


class PersonaUpsertRequest(BaseModel):
    """Request payload for creating or updating personas."""

    definition: Dict[str, Any] = Field(..., description="Complete persona JSON definition")


class ScenarioUpsertRequest(BaseModel):
    """Request payload for creating or updating scenarios."""

    environment: str = Field(..., description="Scenario environment folder (e.g., blackjack)")
    definition: Dict[str, Any] = Field(..., description="Scenario YAML definition as a mapping")
