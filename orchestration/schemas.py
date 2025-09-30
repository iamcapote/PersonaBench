"""Pydantic schemas exposed by the orchestration service."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

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


class EvaluationRequest(BaseModel):
    """Request payload to trigger an evaluation run."""

    persona: str = Field(..., description="Persona identifier to evaluate")
    scenario: str = Field(..., description="Scenario or game identifier to run")
    config: Dict[str, Any] = Field(default_factory=dict, description="Optional override config")


class EvaluationResult(BaseModel):
    """Minimal evaluation result payload."""

    status: str = Field(..., description="Lifecycle status of the evaluation run")
    details: Dict[str, Any] = Field(default_factory=dict, description="Raw chain output")


class PersonaUpsertRequest(BaseModel):
    """Request payload for creating or updating personas."""

    definition: Dict[str, Any] = Field(..., description="Complete persona JSON definition")


class ScenarioUpsertRequest(BaseModel):
    """Request payload for creating or updating scenarios."""

    environment: str = Field(..., description="Scenario environment folder (e.g., blackjack)")
    definition: Dict[str, Any] = Field(..., description="Scenario YAML definition as a mapping")
