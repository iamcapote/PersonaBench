"""Game-related API routes."""

from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException, status

from ..catalog import CatalogError, game_tags, get_game, list_games, load_game_assets
from ..schemas import GameAssetResponse, GameSummary

router = APIRouter(tags=["games"])


def _game_summary(raw: Dict[str, Any]) -> GameSummary:
    metadata = raw.get("metadata") or {}
    tags = list(game_tags(raw))
    return GameSummary(
        key=raw.get("id", "unknown"),
        title=raw.get("title", raw.get("id", "unknown")),
        family=raw.get("family", "unknown"),
        tags=tags,
        description=metadata.get("description"),
        mode=(raw.get("raw") or {}).get("mode"),
        difficulty=metadata.get("difficulty"),
        estimated_time=metadata.get("estimated_time"),
        definition=raw.get("raw", {}),
    )


@router.get("/games", response_model=List[GameSummary])
def read_games() -> List[GameSummary]:
    """Return available playable games."""

    return [_game_summary(entry) for entry in list_games()]


@router.get("/games/{game_id}/assets", response_model=GameAssetResponse)
def read_game_assets(game_id: str) -> GameAssetResponse:
    """Return transparency assets (manifests, rules, adapters) for a game."""

    if get_game(game_id) is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail=f"Game '{game_id}' not found",
        )

    try:
        assets = load_game_assets(game_id)
    except CatalogError as exc:  # pragma: no cover - defensive guard
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    return GameAssetResponse.model_validate(assets)
