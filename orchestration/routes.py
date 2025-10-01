"""API router declarations for the orchestration service."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query, status

from .catalog import (
	CatalogError,
	get_game,
	get_persona,
	get_scenario,
	game_tags,
	list_games,
	list_personas,
	list_scenarios,
	load_game_assets,
	persona_exists,
	save_persona,
	save_scenario,
	scenario_exists,
	scenario_tags,
)
from .chains import build_evaluation_chain
from .schemas import (
	AuditEvent,
	AuditEventCreateRequest,
	EvaluationQueueCreateRequest,
	EvaluationQueueEntry,
	EvaluationQueueUpdateRequest,
	EvaluationRequest,
	EvaluationResponseDetail,
	EvaluationResponseSummary,
	EvaluationResult,
	ComparisonPair,
	ComparisonPairRequest,
	ComparisonVote,
	ComparisonVoteCreateRequest,
	ComparisonAggregationResult,
	GameAssetResponse,
	GameSummary,
	PersonaSummary,
	PersonaUpsertRequest,
	ScenarioSummary,
	ScenarioUpsertRequest,
)
from .state import (
	enqueue_evaluation,
	get_evaluation_response,
	get_comparison_pair,
	list_audit_events,
	list_comparison_pairs,
	list_evaluation_responses,
	list_queue_entries,
	list_comparison_votes,
	record_audit_event,
	record_evaluation_response,
	record_comparison_vote,
	aggregate_comparison_votes,
	create_comparison_pair,
	update_queue_entry,
)

api_router = APIRouter()
evaluation_chain = build_evaluation_chain()
_REPO_ROOT = Path(__file__).resolve().parent.parent


def _relative_source_path(value: str | None) -> str | None:
	if not value:
		return None
	path = Path(value)
	try:
		return str(path.relative_to(_REPO_ROOT))
	except ValueError:
		return str(path)


def _persona_summary(raw: dict) -> PersonaSummary:
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
		source_path=_relative_source_path(source_path),
		definition=definition,
	)


def _scenario_summary(raw: dict) -> ScenarioSummary:
	tags = list(scenario_tags(raw))
	source_path = raw.get("path")
	return ScenarioSummary(
		key=raw.get("id", "unknown"),
		title=raw.get("title", raw.get("id", "unknown")),
		environment=raw.get("environment", "unknown"),
		tags=tags,
		description=(raw.get("metadata") or {}).get("description"),
		mode=(raw.get("raw") or {}).get("mode"),
		source_path=_relative_source_path(source_path),
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


@api_router.get("/admin/queue", response_model=List[EvaluationQueueEntry])
def read_evaluation_queue(limit: Optional[int] = Query(None, ge=1, le=500)) -> List[EvaluationQueueEntry]:
	"""Return the persisted evaluation queue."""

	entries = list_queue_entries(limit=limit)
	return [EvaluationQueueEntry.model_validate(entry) for entry in entries]


@api_router.post(
	"/admin/queue",
	response_model=EvaluationQueueEntry,
	status_code=status.HTTP_201_CREATED,
)
def create_queue_entry(request: EvaluationQueueCreateRequest) -> EvaluationQueueEntry:
	"""Record a new evaluation request in the persistent queue."""

	entry = enqueue_evaluation(
		persona_id=request.persona_id,
		target_id=request.target_id,
		target_kind=request.target_kind,
		status=request.status or "queued",
		requested_at=request.requested_at,
		config=request.config,
		metadata=request.metadata,
	)
	return EvaluationQueueEntry.model_validate(entry)


@api_router.patch("/admin/queue/{entry_id}", response_model=EvaluationQueueEntry)
def update_queue_entry_route(entry_id: str, request: EvaluationQueueUpdateRequest) -> EvaluationQueueEntry:
	"""Update fields on an existing queue entry."""

	try:
		payload = update_queue_entry(
			entry_id,
			status=request.status,
			started_at=request.started_at,
			completed_at=request.completed_at,
			error=request.error,
			metadata=request.metadata,
		)
	except KeyError as exc:
		raise HTTPException(
			status.HTTP_404_NOT_FOUND,
			detail=f"Queue entry '{entry_id}' not found",
		) from exc

	return EvaluationQueueEntry.model_validate(payload)


@api_router.get("/admin/audit", response_model=List[AuditEvent])
def read_audit_log(limit: Optional[int] = Query(None, ge=1, le=1000)) -> List[AuditEvent]:
	"""Return persisted audit log events."""

	events = list_audit_events(limit=limit)
	return [AuditEvent.model_validate(entry) for entry in events]


@api_router.post(
	"/admin/audit",
	response_model=AuditEvent,
	status_code=status.HTTP_201_CREATED,
)
def create_audit_log_entry(request: AuditEventCreateRequest) -> AuditEvent:
	"""Record an audit log event."""

	event = record_audit_event(
		actor=request.actor,
		action=request.action,
		subject=request.subject,
		status=request.status,
		timestamp=request.timestamp,
		metadata=request.metadata,
	)
	return AuditEvent.model_validate(event)


@api_router.get(
	"/admin/evaluations/responses",
	response_model=List[EvaluationResponseSummary],
)
def read_evaluation_responses(
	persona: Optional[str] = Query(None, description="Filter by persona identifier"),
	target: Optional[str] = Query(None, description="Filter by target identifier"),
	target_kind: Optional[str] = Query(None, description="Filter by target kind (scenario or game)"),
	status_filter: Optional[str] = Query(None, description="Filter by evaluation status"),
	limit: Optional[int] = Query(None, ge=1, le=1000, description="Maximum number of responses to return"),
) -> List[EvaluationResponseSummary]:
	"""Return persisted evaluation responses suitable for double-blind review."""

	entries = list_evaluation_responses(
		persona_id=persona,
		target_id=target,
		target_kind=target_kind,
		status=status_filter,
		limit=limit,
	)
	return [EvaluationResponseSummary.model_validate(entry) for entry in entries]


@api_router.get(
	"/admin/evaluations/responses/{response_id}",
	response_model=EvaluationResponseDetail,
)
def read_evaluation_response(response_id: str) -> EvaluationResponseDetail:
	"""Return the full payload for a stored evaluation response."""

	entry = get_evaluation_response(response_id)
	if entry is None:
		raise HTTPException(
			status.HTTP_404_NOT_FOUND,
			detail=f"Evaluation response '{response_id}' not found",
		)
	return EvaluationResponseDetail.model_validate(entry)


@api_router.get(
	"/admin/evaluations/pairs",
	response_model=List[ComparisonPair],
)
def read_comparison_pairs(limit: Optional[int] = Query(None, ge=1, le=500)) -> List[ComparisonPair]:
	"""Return anonymised comparison pairs ready for review."""

	entries = list_comparison_pairs(limit=limit)
	return [ComparisonPair.model_validate(entry) for entry in entries]


@api_router.get(
	"/admin/evaluations/pairs/{pair_id}",
	response_model=ComparisonPair,
)
def read_comparison_pair(pair_id: str) -> ComparisonPair:
	"""Return a specific anonymised comparison pair."""

	entry = get_comparison_pair(pair_id)
	if entry is None:
		raise HTTPException(
			status.HTTP_404_NOT_FOUND,
			detail=f"Comparison pair '{pair_id}' not found",
		)
	return ComparisonPair.model_validate(entry)


@api_router.post(
	"/admin/evaluations/pairs",
	response_model=ComparisonPair,
	status_code=status.HTTP_201_CREATED,
)
def create_comparison_pair_route(request: ComparisonPairRequest) -> ComparisonPair:
	"""Generate a new anonymised comparison pair from stored responses."""

	status_filter = request.status or "completed"
	try:
		payload = create_comparison_pair(
			target_id=request.target_id,
			target_kind=request.target_kind,
			status=status_filter,
			exclude_responses=request.exclude_responses,
		)
	except ValueError as exc:
		raise HTTPException(
			status.HTTP_404_NOT_FOUND,
			detail=str(exc),
		) from exc
	return ComparisonPair.model_validate(payload)


@api_router.get(
	"/admin/evaluations/votes",
	response_model=List[ComparisonVote],
)
def read_comparison_votes(
	pair: Optional[str] = Query(None, description="Restrict results to a specific comparison pair"),
	limit: Optional[int] = Query(None, ge=1, le=5000, description="Maximum number of votes to return"),
) -> List[ComparisonVote]:
	"""Return recorded reviewer votes across comparison pairs."""

	entries = list_comparison_votes(pair_id=pair, limit=limit)
	return [ComparisonVote.model_validate(entry) for entry in entries]


@api_router.get(
	"/admin/evaluations/pairs/{pair_id}/votes",
	response_model=List[ComparisonVote],
)
def read_comparison_pair_votes(
	pair_id: str,
	limit: Optional[int] = Query(None, ge=1, le=5000, description="Maximum number of votes to return"),
) -> List[ComparisonVote]:
	"""Return votes recorded for a specific comparison pair."""

	entries = list_comparison_votes(pair_id=pair_id, limit=limit)
	return [ComparisonVote.model_validate(entry) for entry in entries]


@api_router.post(
	"/admin/evaluations/pairs/{pair_id}/votes",
	response_model=ComparisonVote,
	status_code=status.HTTP_201_CREATED,
)
def create_comparison_vote_route(pair_id: str, request: ComparisonVoteCreateRequest) -> ComparisonVote:
	"""Record a reviewer preference for a comparison pair."""

	try:
		payload = record_comparison_vote(
			pair_id=pair_id,
			winner_slot=request.winner_slot,
			reviewer=request.reviewer,
			rationale=request.rationale,
			confidence=request.confidence,
			metadata=request.metadata,
		)
	except KeyError as exc:
		raise HTTPException(
			status.HTTP_404_NOT_FOUND,
			detail=str(exc),
		) from exc
	except ValueError as exc:
		raise HTTPException(
			status.HTTP_422_UNPROCESSABLE_CONTENT,
			detail=str(exc),
		) from exc

	return ComparisonVote.model_validate(payload)


@api_router.get(
	"/admin/evaluations/aggregate",
	response_model=ComparisonAggregationResult,
)
def read_comparison_aggregation(
	target: Optional[str] = Query(None, description="Filter aggregation by scenario or game identifier"),
	target_kind: Optional[str] = Query(None, description="Restrict aggregation to scenario or game votes"),
	adapter: Optional[str] = Query(None, description="Restrict aggregation to a specific adapter"),
) -> ComparisonAggregationResult:
	"""Return Bradley–Terry rankings computed from stored comparison votes."""

	if target_kind is not None and target_kind not in {"scenario", "game"}:
		raise HTTPException(
			status.HTTP_422_UNPROCESSABLE_CONTENT,
			detail="target_kind must be either 'scenario' or 'game'",
		)

	payload = aggregate_comparison_votes(
		target_id=target,
		target_kind=target_kind,
		adapter=adapter,
	)
	return ComparisonAggregationResult.model_validate(payload)


@api_router.get("/games/{game_id}/assets", response_model=GameAssetResponse)
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
	run_id = str(result.get("run_id") or "")
	persona_identifier = str(persona.get("name") or request.persona)
	target_identifier = str(target_entry.get("id", request.scenario))
	adapter_name = str(
		result.get("adapter")
		or target_entry.get("environment")
		or target_entry.get("family")
		or ""
	)
	metadata = {
		"persona_version": persona.get("version"),
		"target_title": target_entry.get("title") or target_entry.get("name"),
		"config": dict(request.config),
	}
	record_evaluation_response(
		run_id=run_id,
		persona_id=persona_identifier,
		target_id=target_identifier,
		target_kind=target_kind,
		adapter=adapter_name,
		status=status_value,
		summary=result.get("summary") or {},
		steps=result.get("steps") or [],
		trace=result.get("trace") or [],
		metadata=metadata,
	)

	return EvaluationResult(status=status_value, details=result)
