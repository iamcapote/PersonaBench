"""Helpers for loading persona, scenario, and game metadata from the repository."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

import yaml

ROOT = Path(__file__).resolve().parent.parent
PERSONA_DIR = ROOT / "personas" / "examples"
SCENARIO_DIR = ROOT / "scenarios"
GAME_DIR = ROOT / "games"


class CatalogError(RuntimeError):
    """Raised when catalog data cannot be loaded."""


@lru_cache(maxsize=1)
def _load_personas() -> Dict[str, Dict[str, Any]]:
    if not PERSONA_DIR.exists():
        raise CatalogError(f"Persona directory missing: {PERSONA_DIR}")

    personas: Dict[str, Dict[str, Any]] = {}
    for path in PERSONA_DIR.glob("*.json"):
        with path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
        name = data.get("name") or path.stem
        personas[name] = data
    return personas


def list_personas() -> List[Dict[str, Any]]:
    """Return raw persona definitions."""

    return list(_load_personas().values())


def get_persona(name: str) -> Optional[Dict[str, Any]]:
    """Return a single persona definition if present."""

    return _load_personas().get(name)


@lru_cache(maxsize=1)
def _load_scenarios() -> Dict[str, Dict[str, Any]]:
    if not SCENARIO_DIR.exists():
        raise CatalogError(f"Scenario directory missing: {SCENARIO_DIR}")

    scenarios: Dict[str, Dict[str, Any]] = {}
    for yaml_path in SCENARIO_DIR.rglob("*.yaml"):
        with yaml_path.open("r", encoding="utf-8") as handle:
            data = yaml.safe_load(handle)
        scenario_id = data.get("id") or yaml_path.stem
        environment = yaml_path.parent.name
        metadata = data.get("metadata", {})
        scenarios[scenario_id] = {
            "id": scenario_id,
            "title": metadata.get("title") or metadata.get("description") or scenario_id,
            "environment": environment,
            "metadata": metadata,
            "raw": data,
        }
    return scenarios


def list_scenarios() -> List[Dict[str, Any]]:
    """Return scenario metadata entries."""

    return list(_load_scenarios().values())


def get_scenario(scenario_id: str) -> Optional[Dict[str, Any]]:
    """Return a scenario entry if present."""

    return _load_scenarios().get(scenario_id)


@lru_cache(maxsize=1)
def _load_games() -> Dict[str, Dict[str, Any]]:
    if not GAME_DIR.exists():
        raise CatalogError(f"Game directory missing: {GAME_DIR}")

    games: Dict[str, Dict[str, Any]] = {}
    for yaml_path in GAME_DIR.rglob("*.yaml"):
        with yaml_path.open("r", encoding="utf-8") as handle:
            data = yaml.safe_load(handle)
        game_id = data.get("id") or yaml_path.stem
        family = yaml_path.parent.name
        metadata = data.get("metadata", {})
        games[game_id] = {
            "id": game_id,
            "title": metadata.get("title") or metadata.get("description") or game_id,
            "family": family,
            "metadata": metadata,
            "raw": data,
        }
    return games


def list_games() -> List[Dict[str, Any]]:
    """Return game metadata entries."""

    return list(_load_games().values())


def get_game(game_id: str) -> Optional[Dict[str, Any]]:
    """Return a game entry if present."""

    return _load_games().get(game_id)


def scenario_tags(entry: Dict[str, Any]) -> Iterable[str]:
    """Derive UI tags from scenario metadata."""

    metadata = entry.get("metadata", {})
    tags = []
    if domain := metadata.get("domain"):
        tags.append(str(domain))
    if mode := entry.get("raw", {}).get("mode"):
        tags.append(str(mode))
    return tags


def game_tags(entry: Dict[str, Any]) -> Iterable[str]:
    """Derive UI tags for games."""

    metadata = entry.get("metadata", {})
    tags = []
    if category := metadata.get("category"):
        tags.append(str(category))
    if labelled_tags := metadata.get("tags"):
        tags.extend(str(tag) for tag in labelled_tags)
    return tags
