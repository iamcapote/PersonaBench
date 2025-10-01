"""Comparison pair persistence helpers."""

from __future__ import annotations

import copy
import secrets
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from typing import Any, Dict, Iterable, List, MutableMapping, Optional
from uuid import uuid4

from .repository import STATE_LOCK, load_state, persist_state
from .utils import normalize_metadata, sanitize_metadata

_MAX_PAIR_ENTRIES = 500


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


def _serialize_pair(pair: ComparisonPair) -> Dict[str, Any]:
    return asdict(pair)


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

        metadata = sanitize_metadata(source.get("metadata"))
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

    pair_metadata = sanitize_metadata(pair_record.get("metadata"))
    if not pair_metadata and responses_payload:
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


def list_comparison_pairs(*, limit: Optional[int] = None) -> List[Dict[str, Any]]:
    """Return anonymised comparison pairs for reviewer listings."""

    with STATE_LOCK:
        state = load_state()
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

    with STATE_LOCK:
        state = load_state()
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

    with STATE_LOCK:
        state = load_state()
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
                ComparisonAssignment(
                    response_id=str(first["id"]),
                    persona_id=str(first.get("persona_id", "")),
                    slot=slots[0],
                ),
                ComparisonAssignment(
                    response_id=str(second["id"]),
                    persona_id=str(second.get("persona_id", "")),
                    slot=slots[1],
                ),
            ],
            metadata=normalize_metadata(pair_metadata),
        )

        pairs: List[Dict[str, Any]] = list(state.get("pairs", []))
        serialized_pair = _serialize_pair(pair_record)
        pairs.append(serialized_pair)
        if len(pairs) > _MAX_PAIR_ENTRIES:
            pairs = pairs[-_MAX_PAIR_ENTRIES:]
        state["pairs"] = pairs

        responses_index = {entry["id"]: entry for entry in responses if entry.get("id")}
        pair_payload = _anonymized_pair_payload(serialized_pair, responses_index)
        persist_state(state)

    return pair_payload

__all__ = [
    "ComparisonPair",
    "create_comparison_pair",
    "get_comparison_pair",
    "list_comparison_pairs",
]
