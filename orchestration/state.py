"""Persistent state helpers for orchestration admin surfaces."""

from __future__ import annotations

import json
import math
from collections import defaultdict
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from threading import Lock
from typing import Any, Dict, Iterable, List, MutableMapping, Optional
from uuid import uuid4

import secrets
import copy

_STATE_DIR = Path(__file__).resolve().parent / "data"
_STATE_PATH = _STATE_DIR / "admin_state.json"
_STATE_LOCK = Lock()

_MAX_QUEUE_ENTRIES = 500
_MAX_AUDIT_ENTRIES = 1000
_MAX_RESPONSE_ENTRIES = 1000
_MAX_PAIR_ENTRIES = 500
_MAX_VOTE_ENTRIES = 5000


@dataclass(slots=True)
class EvaluationQueueEntry:
    """Serialized representation of an evaluation run tracked by the service."""

    id: str
    persona_id: str
    target_id: str
    target_kind: str
    status: str
    requested_at: str
    config: Dict[str, Any] = field(default_factory=dict)
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class AuditEvent:
    """Structured audit log event captured by the orchestration service."""

    id: str
    timestamp: str
    actor: str
    action: str
    subject: str
    status: str
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class EvaluationResponse:
    """Serialized evaluation output captured for double-blind review."""

    id: str
    run_id: str
    persona_id: str
    target_id: str
    target_kind: str
    adapter: str
    status: str
    created_at: str
    summary: Dict[str, Any] = field(default_factory=dict)
    steps: List[Dict[str, Any]] = field(default_factory=list)
    trace: List[Dict[str, Any]] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class ComparisonAssignment:
    """Mapping between an anonymised slot and a stored response."""

    response_id: str
    persona_id: str
    slot: str


@dataclass(slots=True)
class ComparisonPair:
    """Persisted pairing of two evaluation responses for review."""

    id: str
    target_id: str
    target_kind: str
    created_at: str
    adapter: str
    responses: List[ComparisonAssignment] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    status: str = "pending"


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


def _ensure_state_dir() -> None:
    _STATE_DIR.mkdir(parents=True, exist_ok=True)


def _load_state() -> Dict[str, Any]:
    """Return the persisted admin state dictionary."""

    if _STATE_PATH.exists():
        try:
            with _STATE_PATH.open("r", encoding="utf-8") as handle:
                data = json.load(handle)
            if isinstance(data, MutableMapping):
                state: Dict[str, Any] = dict(data)
                state.setdefault("queue", [])
                state.setdefault("audit", [])
                state.setdefault("responses", [])
                state.setdefault("pairs", [])
                state.setdefault("votes", [])
                return state
        except json.JSONDecodeError:
            pass
    return {"queue": [], "audit": [], "responses": [], "pairs": [], "votes": []}


def _persist_state(state: Dict[str, Any]) -> None:
    _ensure_state_dir()
    tmp_path = _STATE_PATH.with_suffix(".tmp")
    with tmp_path.open("w", encoding="utf-8") as handle:
        json.dump(state, handle, indent=2, ensure_ascii=False)
    tmp_path.replace(_STATE_PATH)


def _normalize_metadata(payload: Any) -> Dict[str, Any]:
    if isinstance(payload, MutableMapping):
        return dict(payload)
    return {}


def _normalize_for_storage(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, MutableMapping):
        return {key: _normalize_for_storage(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_normalize_for_storage(item) for item in value]
    if isinstance(value, tuple):
        return [_normalize_for_storage(item) for item in value]
    return value


def list_queue_entries(*, limit: Optional[int] = None) -> List[Dict[str, Any]]:
    """Return recorded evaluation queue entries (ordered oldest→newest)."""

    with _STATE_LOCK:
        state = _load_state()
        queue: List[Dict[str, Any]] = list(state.get("queue", []))
        if limit is not None:
            return queue[-limit:]
        return queue


def _serialize_queue_entry(entry: EvaluationQueueEntry) -> Dict[str, Any]:
    return asdict(entry)


def _serialize_response(response: EvaluationResponse) -> Dict[str, Any]:
    return asdict(response)


def _serialize_pair(pair: ComparisonPair) -> Dict[str, Any]:
    return asdict(pair)


def _serialize_vote(vote: ComparisonVote) -> Dict[str, Any]:
    return asdict(vote)


def _sanitize_metadata(payload: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not isinstance(payload, MutableMapping):
        return {}
    sanitized: Dict[str, Any] = {}
    for key, value in payload.items():
        if key.lower().startswith("persona_"):
            continue
        sanitized[key] = value
    return sanitized


def _anonymized_pair_payload(
    pair_record: Dict[str, Any],
    responses_index: Dict[str, Dict[str, Any]],
) -> Dict[str, Any]:
    responses_payload: List[Dict[str, Any]] = []
    for assignment in pair_record.get("responses", []):
        response_id = assignment.get("response_id")
        slot = assignment.get("slot")
        if response_id is None or slot is None:
            continue
        source = responses_index.get(response_id)
        if not source:
            continue

        metadata = _sanitize_metadata(source.get("metadata"))
        response_entry = {
            "slot": slot,
            "response_id": response_id,
            "recorded_at": source.get("created_at"),
            "adapter": source.get("adapter"),
            "summary": copy.deepcopy(source.get("summary", {})),
            "steps": copy.deepcopy(source.get("steps", [])),
            "trace": copy.deepcopy(source.get("trace", [])),
            "metadata": metadata,
        }
        responses_payload.append(response_entry)

    responses_payload.sort(key=lambda entry: entry["slot"])

    pair_metadata = _sanitize_metadata(pair_record.get("metadata"))
    if not pair_metadata:
        # fall back to extracting target title from first response metadata if available
        if responses_payload:
            first_metadata = responses_payload[0].get("metadata", {})
            target_title = first_metadata.get("target_title")
            if target_title:
                pair_metadata["target_title"] = target_title

    return {
        "id": pair_record.get("id"),
        "target_id": pair_record.get("target_id"),
        "target_kind": pair_record.get("target_kind"),
        "created_at": pair_record.get("created_at"),
        "adapter": pair_record.get("adapter"),
        "status": pair_record.get("status", "pending"),
        "responses": responses_payload,
        "metadata": pair_metadata,
    }


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
        "metadata": _sanitize_metadata(vote_record.get("metadata")),
    }


def enqueue_evaluation(
    *,
    persona_id: str,
    target_id: str,
    target_kind: str,
    status: str = "queued",
    requested_at: Optional[str] = None,
    config: Optional[Dict[str, Any]] = None,
    metadata: Optional[Dict[str, Any]] = None,
    entry_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Record an evaluation request in the persistent queue."""

    entry = EvaluationQueueEntry(
        id=entry_id or str(uuid4()),
        persona_id=persona_id,
        target_id=target_id,
        target_kind=target_kind,
        status=status,
        requested_at=(requested_at or datetime.now(UTC).isoformat()),
        config=dict(config or {}),
        metadata=_normalize_metadata(metadata),
    )

    with _STATE_LOCK:
        state = _load_state()
        queue: List[Dict[str, Any]] = list(state.get("queue", []))

        queue.append(_serialize_queue_entry(entry))
        if len(queue) > _MAX_QUEUE_ENTRIES:
            queue = queue[-_MAX_QUEUE_ENTRIES:]

        state["queue"] = queue
        _persist_state(state)

    return _serialize_queue_entry(entry)


def update_queue_entry(
    entry_id: str,
    *,
    status: Optional[str] = None,
    started_at: Optional[str] = None,
    completed_at: Optional[str] = None,
    error: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Update an existing queue entry and persist the modification."""

    with _STATE_LOCK:
        state = _load_state()
        queue: List[Dict[str, Any]] = list(state.get("queue", []))
        for index, payload in enumerate(queue):
            if payload.get("id") != entry_id:
                continue

            if status is not None:
                payload["status"] = status
            if started_at is not None:
                payload["started_at"] = started_at
            if completed_at is not None:
                payload["completed_at"] = completed_at
            if error is not None:
                payload["error"] = error
            if metadata is not None:
                payload.setdefault("metadata", {})
                if isinstance(payload["metadata"], MutableMapping):
                    payload["metadata"].update(_normalize_metadata(metadata))
                else:
                    payload["metadata"] = _normalize_metadata(metadata)

            queue[index] = dict(payload)
            state["queue"] = queue
            _persist_state(state)
            return dict(payload)

    raise KeyError(f"Queue entry '{entry_id}' not found")


def list_audit_events(*, limit: Optional[int] = None) -> List[Dict[str, Any]]:
    """Return recorded audit events (ordered oldest→newest)."""

    with _STATE_LOCK:
        state = _load_state()
        events: List[Dict[str, Any]] = list(state.get("audit", []))
        if limit is not None:
            return events[-limit:]
        return events


def _serialize_audit_event(event: AuditEvent) -> Dict[str, Any]:
    return asdict(event)


def record_audit_event(
    *,
    actor: str,
    action: str,
    subject: str,
    status: str,
    timestamp: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    event_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Persist an audit event in the service log."""

    entry = AuditEvent(
        id=event_id or str(uuid4()),
        timestamp=(timestamp or datetime.now(UTC).isoformat()),
        actor=actor,
        action=action,
        subject=subject,
        status=status,
        metadata=_normalize_metadata(metadata),
    )

    with _STATE_LOCK:
        state = _load_state()
        events: List[Dict[str, Any]] = list(state.get("audit", []))
        events.append(_serialize_audit_event(entry))
        if len(events) > _MAX_AUDIT_ENTRIES:
            events = events[-_MAX_AUDIT_ENTRIES:]

        state["audit"] = events
        _persist_state(state)

    return _serialize_audit_event(entry)


def list_evaluation_responses(
    *,
    persona_id: Optional[str] = None,
    target_id: Optional[str] = None,
    target_kind: Optional[str] = None,
    status: Optional[str] = None,
    limit: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """Return persisted evaluation responses filtered for review."""

    with _STATE_LOCK:
        state = _load_state()
        entries: List[Dict[str, Any]] = list(state.get("responses", []))

    filtered: List[Dict[str, Any]] = []
    for payload in entries:
        if persona_id and payload.get("persona_id") != persona_id:
            continue
        if target_id and payload.get("target_id") != target_id:
            continue
        if target_kind and payload.get("target_kind") != target_kind:
            continue
        if status and payload.get("status") != status:
            continue
        filtered.append(dict(payload))

    if limit is not None:
        filtered = filtered[-limit:]

    filtered.reverse()
    return filtered


def get_evaluation_response(response_id: str) -> Optional[Dict[str, Any]]:
    """Return a single evaluation response by identifier."""

    with _STATE_LOCK:
        state = _load_state()
        entries: List[Dict[str, Any]] = list(state.get("responses", []))
    for payload in reversed(entries):
        if payload.get("id") == response_id:
            return dict(payload)
    return None


def record_evaluation_response(
    *,
    run_id: str,
    persona_id: str,
    target_id: str,
    target_kind: str,
    adapter: str,
    status: str,
    summary: Dict[str, Any],
    steps: Iterable[Dict[str, Any]] | None = None,
    trace: Iterable[Dict[str, Any]] | None = None,
    metadata: Optional[Dict[str, Any]] = None,
    response_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Persist an evaluation response for downstream feedback workflows."""

    entry = EvaluationResponse(
        id=response_id or str(uuid4()),
        run_id=run_id,
        persona_id=persona_id,
        target_id=target_id,
        target_kind=target_kind,
        adapter=adapter,
        status=status,
        created_at=datetime.now(UTC).isoformat(),
        summary=_normalize_for_storage(dict(summary)),
        steps=[_normalize_for_storage(step) for step in (steps or [])],
        trace=[_normalize_for_storage(event) for event in (trace or [])],
        metadata=_normalize_metadata(metadata),
    )

    with _STATE_LOCK:
        state = _load_state()
        entries: List[Dict[str, Any]] = list(state.get("responses", []))
        entries.append(_serialize_response(entry))
        if len(entries) > _MAX_RESPONSE_ENTRIES:
            entries = entries[-_MAX_RESPONSE_ENTRIES:]
        state["responses"] = entries
        _persist_state(state)

    return _serialize_response(entry)


def list_comparison_pairs(*, limit: Optional[int] = None) -> List[Dict[str, Any]]:
    """Return anonymised comparison pairs for reviewer listings."""

    with _STATE_LOCK:
        state = _load_state()
        pairs_raw: List[Dict[str, Any]] = [dict(entry) for entry in state.get("pairs", [])]
        responses_index = {
            entry.get("id"): dict(entry)
            for entry in state.get("responses", [])
            if isinstance(entry, MutableMapping) and entry.get("id")
        }

    if limit is not None:
        pairs_raw = pairs_raw[-limit:]

    pairs_raw.reverse()
    return [_anonymized_pair_payload(pair, responses_index) for pair in pairs_raw]


def get_comparison_pair(pair_id: str) -> Optional[Dict[str, Any]]:
    """Return a specific anonymised comparison pair by identifier."""

    with _STATE_LOCK:
        state = _load_state()
        responses_index = {
            entry.get("id"): dict(entry)
            for entry in state.get("responses", [])
            if isinstance(entry, MutableMapping) and entry.get("id")
        }
        for payload in reversed(state.get("pairs", [])):
            if payload.get("id") == pair_id:
                return _anonymized_pair_payload(dict(payload), responses_index)
    return None


def create_comparison_pair(
    *,
    target_id: Optional[str] = None,
    target_kind: Optional[str] = None,
    status: str = "completed",
    exclude_responses: Optional[Iterable[str]] = None,
) -> Dict[str, Any]:
    """Create and persist a comparison pair ready for double-blind review."""

    exclude_ids = {response_id for response_id in (exclude_responses or [])}

    with _STATE_LOCK:
        state = _load_state()
        responses: List[Dict[str, Any]] = [dict(entry) for entry in state.get("responses", [])]

        eligible: List[Dict[str, Any]] = []
        for entry in responses:
            if status and entry.get("status") != status:
                continue
            if target_id and entry.get("target_id") != target_id:
                continue
            if target_kind and entry.get("target_kind") != target_kind:
                continue
            if entry.get("id") in exclude_ids:
                continue
            eligible.append(entry)

        eligible.sort(key=lambda item: item.get("created_at", ""), reverse=True)

        chosen_pair: Optional[tuple[Dict[str, Any], Dict[str, Any]]] = None
        for index, first in enumerate(eligible):
            for second in eligible[index + 1 :]:
                if first.get("id") == second.get("id"):
                    continue
                if first.get("persona_id") == second.get("persona_id"):
                    continue
                if first.get("target_id") != second.get("target_id"):
                    continue
                if target_kind and second.get("target_kind") != target_kind:
                    continue
                chosen_pair = (first, second)
                break
            if chosen_pair:
                break

        if chosen_pair is None:
            raise ValueError("No eligible evaluation responses available for pairing")

        first, second = chosen_pair
        slots = ["A", "B"]
        if secrets.randbelow(2):
            slots.reverse()

        target_title = (
            first.get("metadata", {}).get("target_title")
            or second.get("metadata", {}).get("target_title")
        )

        pair_metadata: Dict[str, Any] = {}
        if target_title:
            pair_metadata["target_title"] = target_title

        pair_record = ComparisonPair(
            id=str(uuid4()),
            target_id=first.get("target_id", target_id or ""),
            target_kind=first.get("target_kind", target_kind or "scenario"),
            created_at=datetime.now(UTC).isoformat(),
            adapter=first.get("adapter", ""),
            responses=[
                ComparisonAssignment(response_id=first["id"], persona_id=first.get("persona_id", ""), slot=slots[0]),
                ComparisonAssignment(response_id=second["id"], persona_id=second.get("persona_id", ""), slot=slots[1]),
            ],
            metadata=pair_metadata,
        )

        pairs: List[Dict[str, Any]] = list(state.get("pairs", []))
        pairs.append(_serialize_pair(pair_record))
        if len(pairs) > _MAX_PAIR_ENTRIES:
            pairs = pairs[-_MAX_PAIR_ENTRIES:]
        state["pairs"] = pairs
        responses_index = {entry["id"]: entry for entry in responses if entry.get("id")}
        pair_payload = _anonymized_pair_payload(_serialize_pair(pair_record), responses_index)
        _persist_state(state)

    return pair_payload


def list_comparison_votes(
    *, pair_id: Optional[str] = None, limit: Optional[int] = None
) -> List[Dict[str, Any]]:
    """Return recorded comparison votes ordered newest first."""

    with _STATE_LOCK:
        state = _load_state()
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

    with _STATE_LOCK:
        state = _load_state()
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
            metadata=_normalize_metadata(metadata),
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
        _persist_state(state)

    return _public_vote_payload(_serialize_vote(vote))


def _compute_bradley_terry_scores(
    win_counts: Dict[str, Dict[str, int]],
    personas: Iterable[str],
    *,
    max_iterations: int = 500,
    tolerance: float = 1e-6,
) -> tuple[Dict[str, float], int, bool]:
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
    with _STATE_LOCK:
        state = _load_state()
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


def clear_state() -> None:
    """Utility for tests to remove persisted state."""

    with _STATE_LOCK:
        if _STATE_PATH.exists():
            _STATE_PATH.unlink()