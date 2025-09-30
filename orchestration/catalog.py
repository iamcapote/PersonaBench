"""Helpers for loading persona, scenario, and game metadata from the repository."""

from __future__ import annotations

import json
import re
from datetime import UTC, datetime
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


def persona_exists(name: str) -> bool:
    """Return True if a persona with the provided name exists."""

    return get_persona(name) is not None


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


def scenario_exists(scenario_id: str) -> bool:
    """Return True if a scenario with the provided id exists."""

    return get_scenario(scenario_id) is not None


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


_SAFE_CHARS_RE = re.compile(r"[^a-z0-9]+")


def _slugify(value: str) -> str:
    slug = _SAFE_CHARS_RE.sub("-", value.strip().lower()).strip("-")
    return slug or "item"


def persona_file_path(name: str) -> Path:
    slug = _slugify(name)
    return PERSONA_DIR / f"{slug}.json"


def scenario_file_path(identifier: str, environment: str) -> Path:
    slug = _slugify(identifier)
    folder = SCENARIO_DIR / environment
    folder.mkdir(parents=True, exist_ok=True)
    return folder / f"{slug}.yaml"


def invalidate_persona_cache() -> None:
    _load_personas.cache_clear()


def invalidate_scenario_cache() -> None:
    _load_scenarios.cache_clear()


def save_persona(definition: Dict[str, Any]) -> Dict[str, Any]:
    """Persist a persona definition to disk and refresh cache."""

    if "name" not in definition:
        raise CatalogError("Persona definition missing 'name'")

    PERSONA_DIR.mkdir(parents=True, exist_ok=True)
    path = persona_file_path(definition["name"])

    existing_metadata: Dict[str, Any] = {}
    if path.exists():
        with path.open("r", encoding="utf-8") as handle:
            existing_data = json.load(handle)
        existing_metadata = existing_data.get("metadata", {}) if isinstance(existing_data, dict) else {}

    timestamp = datetime.now(UTC).isoformat()
    metadata = dict(existing_metadata)

    request_metadata = definition.get("metadata") if isinstance(definition, dict) else None
    if isinstance(request_metadata, dict):
        metadata.update(request_metadata)

    created_at = existing_metadata.get("created_at") or (metadata.get("created_at") if isinstance(metadata, dict) else None)
    if not created_at:
        created_at = timestamp
    metadata["created_at"] = created_at
    metadata["updated_at"] = timestamp

    enriched = dict(definition)
    enriched["metadata"] = metadata

    with path.open("w", encoding="utf-8") as handle:
        json.dump(enriched, handle, indent=2, ensure_ascii=False)
        handle.write("\n")

    invalidate_persona_cache()
    return get_persona(definition["name"])


def save_scenario(definition: Dict[str, Any], *, environment: str) -> Dict[str, Any]:
    """Persist a scenario definition under the specified environment."""

    if "id" not in definition:
        raise CatalogError("Scenario definition missing 'id'")

    path = scenario_file_path(definition["id"], environment)

    existing_metadata: Dict[str, Any] = {}
    if path.exists():
        with path.open("r", encoding="utf-8") as handle:
            existing_data = yaml.safe_load(handle)
        if isinstance(existing_data, dict):
            existing_metadata = existing_data.get("metadata", {}) or {}

    timestamp = datetime.now(UTC).isoformat()
    metadata = dict(existing_metadata)

    request_metadata = definition.get("metadata") if isinstance(definition, dict) else None
    if isinstance(request_metadata, dict):
        metadata.update(request_metadata)

    created_at = existing_metadata.get("created_at") if existing_metadata else None
    if not created_at and isinstance(metadata, dict):
        created_at = metadata.get("created_at")
    if not created_at:
        created_at = timestamp
    metadata["created_at"] = created_at
    metadata["updated_at"] = timestamp

    enriched = dict(definition)
    enriched["metadata"] = metadata

    with path.open("w", encoding="utf-8") as handle:
        yaml.safe_dump(enriched, handle, sort_keys=False)

    invalidate_scenario_cache()
    return get_scenario(definition["id"])
