"""Comparison-related Pydantic schemas exposed by the orchestration service."""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


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
