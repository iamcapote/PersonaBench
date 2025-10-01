"""Game-related Pydantic schemas exposed by the orchestration service."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


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
