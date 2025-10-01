"""Administrative endpoints for evaluation artifacts."""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..auth import require_admin
from ..schemas import (
    ComparisonAggregationResult,
    ComparisonPair,
    ComparisonPairRequest,
    ComparisonVote,
    ComparisonVoteCreateRequest,
    EvaluationResponseDetail,
    EvaluationResponseSummary,
)
from ..state import (
    aggregate_comparison_votes,
    create_comparison_pair,
    get_comparison_pair,
    get_evaluation_response,
    list_comparison_pairs,
    list_comparison_votes,
    list_evaluation_responses,
    record_comparison_vote,
)

router = APIRouter(
    prefix="/admin/evaluations",
    tags=["admin", "evaluations"],
    dependencies=[Depends(require_admin)],
)


@router.get("/responses", response_model=List[EvaluationResponseSummary])
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


@router.get("/responses/{response_id}", response_model=EvaluationResponseDetail)
def read_evaluation_response(response_id: str) -> EvaluationResponseDetail:
    """Return the full payload for a stored evaluation response."""

    entry = get_evaluation_response(response_id)
    if entry is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail=f"Evaluation response '{response_id}' not found",
        )
    return EvaluationResponseDetail.model_validate(entry)


@router.get("/pairs", response_model=List[ComparisonPair])
def read_comparison_pairs(
    limit: Optional[int] = Query(None, ge=1, le=500),
) -> List[ComparisonPair]:
    """Return anonymised comparison pairs ready for review."""

    entries = list_comparison_pairs(limit=limit)
    return [ComparisonPair.model_validate(entry) for entry in entries]


@router.get("/pairs/{pair_id}", response_model=ComparisonPair)
def read_comparison_pair(pair_id: str) -> ComparisonPair:
    """Return a specific anonymised comparison pair."""

    entry = get_comparison_pair(pair_id)
    if entry is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail=f"Comparison pair '{pair_id}' not found",
        )
    return ComparisonPair.model_validate(entry)


@router.post(
    "/pairs",
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


@router.get("/votes", response_model=List[ComparisonVote])
def read_comparison_votes(
    pair: Optional[str] = Query(None, description="Restrict results to a specific comparison pair"),
    limit: Optional[int] = Query(None, ge=1, le=5000, description="Maximum number of votes to return"),
) -> List[ComparisonVote]:
    """Return recorded reviewer votes across comparison pairs."""

    entries = list_comparison_votes(pair_id=pair, limit=limit)
    return [ComparisonVote.model_validate(entry) for entry in entries]


@router.get("/pairs/{pair_id}/votes", response_model=List[ComparisonVote])
def read_comparison_pair_votes(
    pair_id: str,
    limit: Optional[int] = Query(None, ge=1, le=5000, description="Maximum number of votes to return"),
) -> List[ComparisonVote]:
    """Return votes recorded for a specific comparison pair."""

    entries = list_comparison_votes(pair_id=pair_id, limit=limit)
    return [ComparisonVote.model_validate(entry) for entry in entries]


@router.post(
    "/pairs/{pair_id}/votes",
    response_model=ComparisonVote,
    status_code=status.HTTP_201_CREATED,
)
def create_comparison_vote_route(
    pair_id: str,
    request: ComparisonVoteCreateRequest,
) -> ComparisonVote:
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


@router.get("/aggregate", response_model=ComparisonAggregationResult)
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
