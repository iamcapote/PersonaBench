"""Persona-related API routes."""

from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, status

from ..auth import require_admin
from ..catalog import list_personas, persona_exists, save_persona
from ..schemas import PersonaSummary, PersonaUpsertRequest
from .shared import relative_source_path

router = APIRouter(tags=["personas"])


def _persona_summary(raw: Dict[str, Any]) -> PersonaSummary:
    definition = dict(raw)
    source_path = definition.pop("_source_path", None)
    memory = definition.get("memory") or {}
    tools = definition.get("tools") or {}
    return PersonaSummary(
        name=definition.get("name", "unknown"),
        version=str(definition.get("version", "0")),
        description=definition.get("description"),
        risk_tolerance=definition.get("risk_tolerance"),
        planning_horizon=definition.get("planning_horizon"),
        deception_aversion=definition.get("deception_aversion"),
        memory_window=memory.get("window"),
        tools=list(tools.get("allowed", [])),
        source_path=relative_source_path(source_path),
        definition=definition,
    )


def _validate_persona_definition(payload: Any) -> Dict[str, Any]:
    if not isinstance(payload, dict):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Persona definition must be an object",
        )

    definition: Dict[str, Any] = dict(payload)

    name = definition.get("name")
    if not isinstance(name, str) or not name.strip():
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Persona name is required",
        )
    definition["name"] = name.strip()

    version = definition.get("version")
    if not isinstance(version, str) or not version.strip():
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Persona version must be a non-empty string",
        )
    definition["version"] = version.strip()

    planning = definition.get("planning_horizon")
    try:
        planning_int = int(planning)
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="planning_horizon must be an integer",
        ) from exc
    if planning_int <= 0:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="planning_horizon must be positive",
        )
    definition["planning_horizon"] = planning_int

    risk = definition.get("risk_tolerance")
    if not isinstance(risk, (int, float)):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="risk_tolerance must be numeric",
        )
    if not 0 <= float(risk) <= 1:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="risk_tolerance must be between 0 and 1",
        )
    definition["risk_tolerance"] = float(risk)

    tools = definition.get("tools")
    if not isinstance(tools, dict):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="tools must be an object",
        )
    allowed = tools.get("allowed")
    if not isinstance(allowed, list) or not allowed:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="tools.allowed must be a non-empty list",
        )
    normalized_allowed: List[str] = []
    for item in allowed:
        if not isinstance(item, str) or not item.strip():
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="tools.allowed entries must be non-empty strings",
            )
        normalized_allowed.append(item.strip())
    definition["tools"] = {**tools, "allowed": normalized_allowed}

    return definition


@router.get("/personas", response_model=List[PersonaSummary])
def read_personas() -> List[PersonaSummary]:
    """Return available persona definitions."""

    return [_persona_summary(entry) for entry in list_personas()]


@router.post(
    "/personas",
    response_model=PersonaSummary,
    status_code=status.HTTP_201_CREATED,
)
def create_persona(
    request: PersonaUpsertRequest,
    _: None = Depends(require_admin),
) -> PersonaSummary:
    """Create a persona definition on disk."""

    definition = _validate_persona_definition(request.definition)
    name = definition["name"]
    if persona_exists(name):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail=f"Persona '{name}' already exists",
        )

    saved = save_persona(definition)
    if saved is None:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to persist persona definition",
        )

    return _persona_summary(saved)


@router.put("/personas/{persona_name}", response_model=PersonaSummary)
def update_persona(
    persona_name: str,
    request: PersonaUpsertRequest,
    _: None = Depends(require_admin),
) -> PersonaSummary:
    """Update an existing persona definition."""

    definition = _validate_persona_definition(request.definition)
    if definition["name"] != persona_name:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Path persona_name must match definition.name",
        )

    if not persona_exists(persona_name):
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail=f"Persona '{persona_name}' not found",
        )

    saved = save_persona(definition)
    if saved is None:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to persist persona definition",
        )

    return _persona_summary(saved)
