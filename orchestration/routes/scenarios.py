"""Scenario-related API routes."""

from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, status

from ..auth import require_admin
from ..catalog import get_scenario, list_scenarios, save_scenario, scenario_exists, scenario_tags
from ..schemas import ScenarioSummary, ScenarioUpsertRequest
from .shared import relative_source_path

router = APIRouter(tags=["scenarios"])


def _scenario_summary(raw: Dict[str, Any]) -> ScenarioSummary:
    tags = list(scenario_tags(raw))
    source_path = raw.get("path")
    return ScenarioSummary(
        key=raw.get("id", "unknown"),
        title=raw.get("title", raw.get("id", "unknown")),
        environment=raw.get("environment", "unknown"),
        tags=tags,
        description=(raw.get("metadata") or {}).get("description"),
        mode=(raw.get("raw") or {}).get("mode"),
        source_path=relative_source_path(source_path),
        definition=raw.get("raw", {}),
    )


def _validate_environment_name(value: str) -> str:
    environment = value.strip()
    if not environment:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="environment must be provided",
        )
    if any(delimiter in environment for delimiter in ("/", "\\")) or environment.startswith("."):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="environment must be a single folder name",
        )
    return environment


def _validate_scenario_definition(payload: Any) -> Dict[str, Any]:
    if not isinstance(payload, dict):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Scenario definition must be an object",
        )

    definition: Dict[str, Any] = dict(payload)

    scenario_id = definition.get("id")
    if not isinstance(scenario_id, str) or not scenario_id.strip():
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Scenario id is required",
        )
    definition["id"] = scenario_id.strip()

    mode = definition.get("mode")
    if not isinstance(mode, str) or not mode.strip():
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Scenario mode must be a non-empty string",
        )
    definition["mode"] = mode.strip()

    metadata = definition.get("metadata") or {}
    if not isinstance(metadata, dict):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Scenario metadata must be an object",
        )
    definition["metadata"] = dict(metadata)

    checks = definition.get("checks")
    if checks is not None and not isinstance(checks, dict):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Scenario checks must be an object if provided",
        )

    return definition


@router.get("/scenarios", response_model=List[ScenarioSummary])
def read_scenarios() -> List[ScenarioSummary]:
    """Return available evaluation scenarios."""

    return [_scenario_summary(entry) for entry in list_scenarios()]


@router.post(
    "/scenarios",
    response_model=ScenarioSummary,
    status_code=status.HTTP_201_CREATED,
)
def create_scenario(
    request: ScenarioUpsertRequest,
    _: None = Depends(require_admin),
) -> ScenarioSummary:
    """Create a scenario definition in the repository."""

    environment = _validate_environment_name(request.environment)
    definition = _validate_scenario_definition(request.definition)
    scenario_id = definition["id"]
    if scenario_exists(scenario_id):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail=f"Scenario '{scenario_id}' already exists",
        )

    saved = save_scenario(definition, environment=environment)
    if saved is None:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to persist scenario definition",
        )

    return _scenario_summary(saved)


@router.put("/scenarios/{scenario_id}", response_model=ScenarioSummary)
def update_scenario(
    scenario_id: str,
    request: ScenarioUpsertRequest,
    _: None = Depends(require_admin),
) -> ScenarioSummary:
    """Update an existing scenario definition."""

    existing = get_scenario(scenario_id)
    if existing is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail=f"Scenario '{scenario_id}' not found",
        )

    environment = _validate_environment_name(request.environment)
    if environment != existing.get("environment"):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Scenario environment cannot be changed via update",
        )

    definition = _validate_scenario_definition(request.definition)
    if definition["id"] != scenario_id:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Path scenario_id must match definition.id",
        )

    saved = save_scenario(definition, environment=environment)
    if saved is None:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to persist scenario definition",
        )

    return _scenario_summary(saved)
