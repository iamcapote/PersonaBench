"""Scenario-related Pydantic schemas exposed by the orchestration service."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


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


class ScenarioUpsertRequest(BaseModel):
    """Request payload for creating or updating scenarios."""

    environment: str = Field(..., description="Scenario environment folder (e.g., blackjack)")
    definition: Dict[str, Any] = Field(..., description="Scenario YAML definition as a mapping")
