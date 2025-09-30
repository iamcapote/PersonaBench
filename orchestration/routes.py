"""API router declarations for the orchestration service."""

from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException, status

from .catalog import (
	get_game,
	get_persona,
	get_scenario,
	game_tags,
	list_games,
	list_personas,
	list_scenarios,
	persona_exists,
	save_persona,
	save_scenario,
	scenario_exists,
	scenario_tags,
)
from .chains import build_evaluation_chain
from .schemas import (
	EvaluationRequest,
	EvaluationResult,
	GameSummary,
	PersonaSummary,
	PersonaUpsertRequest,
	ScenarioSummary,
	ScenarioUpsertRequest,
)

api_router = APIRouter()
evaluation_chain = build_evaluation_chain()


def _persona_summary(raw: dict) -> PersonaSummary:
	memory = raw.get("memory") or {}
	tools = raw.get("tools") or {}
	return PersonaSummary(
		name=raw.get("name", "unknown"),
		version=str(raw.get("version", "0")),
		description=raw.get("description"),
		risk_tolerance=raw.get("risk_tolerance"),
		planning_horizon=raw.get("planning_horizon"),
		deception_aversion=raw.get("deception_aversion"),
		memory_window=memory.get("window"),
		tools=list(tools.get("allowed", [])),
		definition=raw,
	)


def _scenario_summary(raw: dict) -> ScenarioSummary:
	tags = list(scenario_tags(raw))
	return ScenarioSummary(
		key=raw.get("id", "unknown"),
		title=raw.get("title", raw.get("id", "unknown")),
		environment=raw.get("environment", "unknown"),
		tags=tags,
		description=(raw.get("metadata") or {}).get("description"),
		mode=(raw.get("raw") or {}).get("mode"),
		definition=raw.get("raw", {}),
	)


def _game_summary(raw: dict) -> GameSummary:
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


@api_router.get("/personas", response_model=List[PersonaSummary])
def read_personas() -> List[PersonaSummary]:
	"""Return available persona definitions."""

	return [_persona_summary(entry) for entry in list_personas()]


def _validate_persona_definition(payload: Any) -> Dict[str, Any]:
	if not isinstance(payload, dict):
		raise HTTPException(
			status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
			detail="Persona definition must be an object",
		)

	definition: Dict[str, Any] = dict(payload)

	name = definition.get("name")
	if not isinstance(name, str) or not name.strip():
		raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Persona name is required")
	definition["name"] = name.strip()

	version = definition.get("version")
	if not isinstance(version, str) or not version.strip():
		raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Persona version must be a non-empty string")
	definition["version"] = version.strip()

	planning = definition.get("planning_horizon")
	try:
		planning_int = int(planning)
	except (TypeError, ValueError):
		raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail="planning_horizon must be an integer") from None
	if planning_int <= 0:
		raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail="planning_horizon must be positive")
	definition["planning_horizon"] = planning_int

	risk = definition.get("risk_tolerance")
	if not isinstance(risk, (int, float)):
		raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail="risk_tolerance must be numeric")
	if not 0 <= float(risk) <= 1:
		raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail="risk_tolerance must be between 0 and 1")
	definition["risk_tolerance"] = float(risk)

	tools = definition.get("tools")
	if not isinstance(tools, dict):
		raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail="tools must be an object")
	allowed = tools.get("allowed")
	if not isinstance(allowed, list) or not allowed:
		raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail="tools.allowed must be a non-empty list")
	for item in allowed:
		if not isinstance(item, str) or not item.strip():
			raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail="tools.allowed entries must be non-empty strings")
	definition["tools"] = {**tools, "allowed": [entry.strip() for entry in allowed]}  # type: ignore[arg-type]

	return definition


def _validate_environment_name(value: str) -> str:
	environment = value.strip()
	if not environment:
		raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail="environment must be provided")
	if any(delimiter in environment for delimiter in ("/", "\\")) or environment.startswith("."):
		raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail="environment must be a single folder name")
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
		raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Scenario id is required")
	definition["id"] = scenario_id.strip()

	mode = definition.get("mode")
	if not isinstance(mode, str) or not mode.strip():
		raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Scenario mode must be a non-empty string")
	definition["mode"] = mode.strip()

	metadata = definition.get("metadata") or {}
	if not isinstance(metadata, dict):
		raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Scenario metadata must be an object")
	definition["metadata"] = dict(metadata)

	checks = definition.get("checks")
	if checks is not None and not isinstance(checks, dict):
		raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Scenario checks must be an object if provided")

	return definition


@api_router.get("/scenarios", response_model=List[ScenarioSummary])
def read_scenarios() -> List[ScenarioSummary]:
	"""Return available evaluation scenarios."""

	return [_scenario_summary(entry) for entry in list_scenarios()]


@api_router.post("/personas", response_model=PersonaSummary, status_code=status.HTTP_201_CREATED)
def create_persona(request: PersonaUpsertRequest) -> PersonaSummary:
	"""Create a persona definition on disk."""

	definition = _validate_persona_definition(request.definition)
	name = definition["name"]
	if persona_exists(name):
		raise HTTPException(status.HTTP_409_CONFLICT, detail=f"Persona '{name}' already exists")

	saved = save_persona(definition)
	if saved is None:
		raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to persist persona definition")

	return _persona_summary(saved)


@api_router.put("/personas/{persona_name}", response_model=PersonaSummary)
def update_persona(persona_name: str, request: PersonaUpsertRequest) -> PersonaSummary:
	"""Update an existing persona definition."""

	definition = _validate_persona_definition(request.definition)
	if definition["name"] != persona_name:
		raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Path persona_name must match definition.name")

	if not persona_exists(persona_name):
		raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f"Persona '{persona_name}' not found")

	saved = save_persona(definition)
	if saved is None:
		raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to persist persona definition")

	return _persona_summary(saved)


@api_router.post("/scenarios", response_model=ScenarioSummary, status_code=status.HTTP_201_CREATED)
def create_scenario(request: ScenarioUpsertRequest) -> ScenarioSummary:
	"""Create a scenario definition in the repository."""

	environment = _validate_environment_name(request.environment)
	definition = _validate_scenario_definition(request.definition)
	scenario_id = definition["id"]
	if scenario_exists(scenario_id):
		raise HTTPException(status.HTTP_409_CONFLICT, detail=f"Scenario '{scenario_id}' already exists")

	saved = save_scenario(definition, environment=environment)
	if saved is None:
		raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to persist scenario definition")

	return _scenario_summary(saved)


@api_router.put("/scenarios/{scenario_id}", response_model=ScenarioSummary)
def update_scenario(scenario_id: str, request: ScenarioUpsertRequest) -> ScenarioSummary:
	"""Update an existing scenario definition."""

	existing = get_scenario(scenario_id)
	if existing is None:
		raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f"Scenario '{scenario_id}' not found")

	environment = _validate_environment_name(request.environment)
	if environment != existing.get("environment"):
		raise HTTPException(
			status.HTTP_422_UNPROCESSABLE_CONTENT,
			detail="Scenario environment cannot be changed via update",
		)

	definition = _validate_scenario_definition(request.definition)
	if definition["id"] != scenario_id:
		raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Path scenario_id must match definition.id")

	saved = save_scenario(definition, environment=environment)
	if saved is None:
		raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to persist scenario definition")

	return _scenario_summary(saved)


@api_router.get("/games", response_model=List[GameSummary])
def read_games() -> List[GameSummary]:
	"""Return available playable games."""

	return [_game_summary(entry) for entry in list_games()]


@api_router.post(
	"/evaluations",
	response_model=EvaluationResult,
	status_code=status.HTTP_202_ACCEPTED,
)
def create_evaluation(request: EvaluationRequest) -> EvaluationResult:
	"""Kick off a minimal evaluation chain for the provided persona and scenario or game."""

	persona = get_persona(request.persona)
	if persona is None:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail=f"Persona '{request.persona}' not found",
		)

	scenario = get_scenario(request.scenario)
	game = None if scenario is not None else get_game(request.scenario)
	if scenario is None and game is None:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail=f"Scenario or game '{request.scenario}' not found",
		)

	target_entry = scenario or game
	target_kind = "scenario" if scenario is not None else "game"
	chain_payload = {
		"persona": persona,
		"config": request.config,
		"target": target_entry,
		"target_kind": target_kind,
		"target_id": target_entry.get("id", request.scenario),
	}
	if scenario is not None:
		chain_payload["scenario"] = scenario
	if game is not None:
		chain_payload["game"] = game

	result = evaluation_chain.invoke(chain_payload)
	if not isinstance(result, dict):
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail="Evaluation chain returned unexpected payload",
		)

	status_value = str(result.get("status", "pending"))

	return EvaluationResult(status=status_value, details=result)
