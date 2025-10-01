"""Persona-related Pydantic schemas exposed by the orchestration service."""

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
        None, description="Size of the rolling memory window"
    )
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


class PersonaUpsertRequest(BaseModel):
    """Request payload for creating or updating personas."""

    definition: Dict[str, Any] = Field(..., description="Complete persona JSON definition")
