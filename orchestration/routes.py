"""API router declarations for the orchestration service."""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, HTTPException, status

from .catalog import (
	get_game,
	get_persona,
	get_scenario,
	game_tags,
	list_games,
	list_personas,
	list_scenarios,
	scenario_tags,
)
from .chains import build_evaluation_chain
from .schemas import (
	EvaluationRequest,
	EvaluationResult,
	GameSummary,
	PersonaSummary,
	ScenarioSummary,
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


@api_router.get("/scenarios", response_model=List[ScenarioSummary])
def read_scenarios() -> List[ScenarioSummary]:
	"""Return available evaluation scenarios."""

	return [_scenario_summary(entry) for entry in list_scenarios()]


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
