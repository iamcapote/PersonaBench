"""Comparison vote persistence and aggregation helpers."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from typing import Any, Dict, Iterable, List, MutableMapping, Optional, Tuple
from uuid import uuid4

from .repository import STATE_LOCK, load_state, persist_state
from .utils import normalize_metadata, sanitize_metadata

_MAX_VOTE_ENTRIES = 5000


@dataclass(slots=True)
class ComparisonVote:
    """Recorded reviewer preference between anonymised responses."""

    id: str
    pair_id: str
    target_id: str
    target_kind: str
    adapter: Optional[str]
    winner_slot: str
    winning_response_id: str
    losing_response_id: str
    winning_persona_id: str
    losing_persona_id: str
    recorded_at: str
    reviewer: Optional[str] = None
    rationale: Optional[str] = None
    confidence: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


def _public_vote_payload(vote_record: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": vote_record.get("id"),
        "pair_id": vote_record.get("pair_id"),
        "winner_slot": vote_record.get("winner_slot"),
        "winning_response_id": vote_record.get("winning_response_id"),
        "losing_response_id": vote_record.get("losing_response_id"),
        "recorded_at": vote_record.get("recorded_at"),
        "reviewer": vote_record.get("reviewer"),
        "rationale": vote_record.get("rationale"),
        "confidence": vote_record.get("confidence"),
        "metadata": sanitize_metadata(vote_record.get("metadata")),
    }


def list_comparison_votes(
    *, pair_id: Optional[str] = None, limit: Optional[int] = None
) -> List[Dict[str, Any]]:
    """Return recorded comparison votes ordered newest first."""

    with STATE_LOCK:
        state = load_state()
        votes_raw: List[Dict[str, Any]] = [dict(entry) for entry in state.get("votes", [])]

    filtered: List[Dict[str, Any]] = []
    for payload in votes_raw:
        if pair_id and payload.get("pair_id") != pair_id:
            continue
        filtered.append(payload)

    if limit is not None:
        filtered = filtered[-limit:]

    filtered.reverse()
    return [_public_vote_payload(entry) for entry in filtered]


def _serialize_vote(vote: ComparisonVote) -> Dict[str, Any]:
    return asdict(vote)


def record_comparison_vote(
    *,
    pair_id: str,
    winner_slot: str,
    reviewer: Optional[str] = None,
    rationale: Optional[str] = None,
    confidence: Optional[float] = None,
    metadata: Optional[Dict[str, Any]] = None,
    vote_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Persist a reviewer vote for an existing comparison pair."""

    normalized_slot = winner_slot.strip().upper()
    if normalized_slot not in {"A", "B"}:
        raise ValueError("winner_slot must be either 'A' or 'B'")

    with STATE_LOCK:
        state = load_state()
        pairs: List[Dict[str, Any]] = [dict(entry) for entry in state.get("pairs", [])]
        pair_record: Optional[Dict[str, Any]] = None
        for entry in pairs:
            if entry.get("id") == pair_id:
                pair_record = dict(entry)
                break

        if pair_record is None:
            raise KeyError(f"Comparison pair '{pair_id}' not found")

        assignments = pair_record.get("responses", [])
        slot_index = {
            assignment.get("slot"): assignment
            for assignment in assignments
            if isinstance(assignment, MutableMapping)
            and assignment.get("slot") in {"A", "B"}
            and assignment.get("response_id")
        }

        winning_assignment = slot_index.get(normalized_slot)
        if winning_assignment is None:
            raise ValueError(
                f"Comparison pair '{pair_id}' does not include slot '{normalized_slot}'"
            )

        losing_slot = "B" if normalized_slot == "A" else "A"
        losing_assignment = slot_index.get(losing_slot)
        if losing_assignment is None:
            raise ValueError(
                "Comparison pair must contain two distinct responses before recording votes"
            )

        vote = ComparisonVote(
            id=vote_id or str(uuid4()),
            pair_id=pair_id,
            target_id=str(pair_record.get("target_id", "")),
            target_kind=str(pair_record.get("target_kind", "scenario")),
            adapter=pair_record.get("adapter"),
            winner_slot=normalized_slot,
            winning_response_id=str(winning_assignment.get("response_id")),
            losing_response_id=str(losing_assignment.get("response_id")),
            winning_persona_id=str(winning_assignment.get("persona_id", "")),
            losing_persona_id=str(losing_assignment.get("persona_id", "")),
            recorded_at=datetime.now(UTC).isoformat(),
            reviewer=reviewer,
            rationale=rationale,
            confidence=confidence,
            metadata=normalize_metadata(metadata),
        )

        votes: List[Dict[str, Any]] = list(state.get("votes", []))
        votes.append(_serialize_vote(vote))
        if len(votes) > _MAX_VOTE_ENTRIES:
            votes = votes[-_MAX_VOTE_ENTRIES:]

        vote_count = sum(1 for entry in votes if entry.get("pair_id") == pair_id)

        for index, entry in enumerate(pairs):
            if entry.get("id") != pair_id:
                continue
            updated = dict(entry)
            updated["status"] = "completed"
            existing_metadata = updated.get("metadata")
            if isinstance(existing_metadata, MutableMapping):
                metadata_payload = dict(existing_metadata)
            else:
                metadata_payload = {}
            metadata_payload["last_vote_recorded_at"] = vote.recorded_at
            metadata_payload["vote_count"] = vote_count
            updated["metadata"] = metadata_payload
            pairs[index] = updated
            break

        state["pairs"] = pairs
        state["votes"] = votes
        persist_state(state)

    return _public_vote_payload(_serialize_vote(vote))


def _compute_bradley_terry_scores(
    win_counts: Dict[str, Dict[str, int]],
    personas: Iterable[str],
    *,
    max_iterations: int = 500,
    tolerance: float = 1e-6,
) -> Tuple[Dict[str, float], int, bool]:
    personas_list = list(dict.fromkeys(personas))
    if not personas_list:
        return {}, 0, True

    prior = 1e-6
    strengths: Dict[str, float] = {
        persona: 1.0 / len(personas_list) for persona in personas_list
    }

    for iteration in range(1, max_iterations + 1):
        updated: Dict[str, float] = {}
        max_diff = 0.0

        for persona in personas_list:
            wins = sum(win_counts.get(persona, {}).values()) + prior
            denominator = 0.0
            for opponent in personas_list:
                if opponent == persona:
                    continue
                total = win_counts.get(persona, {}).get(opponent, 0) + win_counts.get(opponent, {}).get(persona, 0)
                if total == 0:
                    continue
                denominator += total / (strengths[persona] + strengths[opponent])

            if denominator == 0.0:
                updated_strength = strengths[persona]
            else:
                updated_strength = wins / denominator

            updated[persona] = updated_strength

        total_strength = sum(updated.values())
        if total_strength <= 0:
            updated = {persona: 1.0 / len(personas_list) for persona in personas_list}
        else:
            for persona in personas_list:
                updated[persona] /= total_strength

        for persona in personas_list:
            max_diff = max(max_diff, abs(updated[persona] - strengths[persona]))

        strengths = updated
        if max_diff < tolerance:
            return strengths, iteration, True

    return strengths, max_iterations, False


def aggregate_comparison_votes(
    *,
    target_id: Optional[str] = None,
    target_kind: Optional[str] = None,
    adapter: Optional[str] = None,
    max_iterations: int = 200,
    tolerance: float = 1e-6,
) -> Dict[str, Any]:
    with STATE_LOCK:
        state = load_state()
        votes_raw: List[Dict[str, Any]] = [dict(entry) for entry in state.get("votes", [])]

    if target_id is not None:
        votes_raw = [vote for vote in votes_raw if vote.get("target_id") == target_id]
    if target_kind is not None:
        votes_raw = [vote for vote in votes_raw if vote.get("target_kind") == target_kind]
    if adapter is not None:
        votes_raw = [vote for vote in votes_raw if vote.get("adapter") == adapter]

    if not votes_raw:
        return {
            "rankings": {},
            "summary": {
                "total_votes": 0,
                "pair_count": 0,
                "persona_count": 0,
                "last_vote_recorded_at": None,
                "converged": True,
                "iterations": 0,
                "target_id": target_id,
                "target_kind": target_kind,
                "adapter": adapter,
            },
        }

    win_counts: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
    personas: set[str] = set()
    pair_ids: set[str] = set()
    last_recorded_at: Optional[str] = None

    for vote in votes_raw:
        winner_persona = vote.get("winning_persona_id")
        loser_persona = vote.get("losing_persona_id")
        if not winner_persona or not loser_persona:
            continue
        personas.add(str(winner_persona))
        personas.add(str(loser_persona))
        win_counts[str(winner_persona)][str(loser_persona)] += 1
        pair_id = vote.get("pair_id")
        if pair_id:
            pair_ids.add(str(pair_id))
        recorded_at = vote.get("recorded_at")
        if recorded_at and (last_recorded_at is None or str(recorded_at) > last_recorded_at):
            last_recorded_at = str(recorded_at)

    if not personas:
        return {
            "rankings": {},
            "summary": {
                "total_votes": len(votes_raw),
                "pair_count": len(pair_ids),
                "persona_count": 0,
                "last_vote_recorded_at": last_recorded_at,
                "converged": True,
                "iterations": 0,
                "target_id": target_id,
                "target_kind": target_kind,
                "adapter": adapter,
            },
        }

    strengths, iterations, converged = _compute_bradley_terry_scores(
        win_counts,
        personas,
        max_iterations=max_iterations,
        tolerance=tolerance,
    )

    return {
        "rankings": strengths,
        "summary": {
            "total_votes": len(votes_raw),
            "pair_count": len(pair_ids),
            "persona_count": len(personas),
            "last_vote_recorded_at": last_recorded_at,
            "converged": converged,
            "iterations": iterations,
            "target_id": target_id,
            "target_kind": target_kind,
            "adapter": adapter,
        },
    }

__all__ = [
    "aggregate_comparison_votes",
    "list_comparison_votes",
    "record_comparison_vote",
]
