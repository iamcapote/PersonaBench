"""Public evaluation execution routes."""

from __future__ import annotations

from typing import Dict

from fastapi import APIRouter, HTTPException, status

from ..catalog import get_game, get_persona, get_scenario
from ..chains import build_evaluation_chain
from ..schemas import EvaluationRequest, EvaluationResult
from ..state import record_evaluation_response

router = APIRouter(tags=["evaluations"])

evaluation_chain = build_evaluation_chain()


@router.post(
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

    target_entry: Dict[str, object] = scenario or game or {}
    target_kind = "scenario" if scenario is not None else "game"
    chain_payload: Dict[str, object] = {
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
