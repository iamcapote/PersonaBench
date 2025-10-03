"""Tests for the double-blind feedback persistence pipeline."""

from __future__ import annotations

import time

import pytest
from fastapi.testclient import TestClient

from orchestration import state
from orchestration.app import create_app
from orchestration.services.event_stream import reset_event_stream
from orchestration.worker import reset_evaluation_worker


def _await_queue_completion(entry_id: str, *, timeout: float = 20.0) -> dict[str, object]:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        entry = state.get_queue_entry(entry_id)
        if entry is None:
            time.sleep(0.05)
            continue
        status = entry.get("status")
        if status in {"completed", "failed"}:
            return entry
        time.sleep(0.05)
    raise AssertionError(f"Timed out waiting for evaluation '{entry_id}' to complete")


def _submit_evaluation(client: TestClient, payload: dict[str, object]) -> dict[str, object]:
    response = client.post("/api/evaluations", json=payload)
    assert response.status_code == 202, response.text
    details = response.json()["details"]
    entry_id = details["queue_entry_id"]
    _await_queue_completion(entry_id)
    return details


def test_evaluation_responses_are_persisted_and_queryable(admin_headers) -> None:
    reset_evaluation_worker()
    reset_event_stream()
    state.clear_state()
    app = create_app()
    client = TestClient(app)
    client.headers.update(admin_headers)

    try:
        _submit_evaluation(
            client,
            {
                "persona": "cooperative_planner",
                "scenario": "solitaire-practice",
                "config": {"max_steps": 2},
            },
        )

        listing = client.get("/api/admin/evaluations/responses")
        assert listing.status_code == 200, listing.text
        entries = listing.json()
        assert entries, "expected at least one stored evaluation response"

        latest = entries[0]
        assert latest["persona_id"] == "cooperative_planner"
        assert latest["target_id"] == "solitaire-practice"
        assert latest["target_kind"] == "scenario"
        assert latest["status"] == "completed"
        assert latest["summary"]["total_steps"] >= 1
        assert latest["metadata"]["persona_version"]

        detail = client.get(f"/api/admin/evaluations/responses/{latest['id']}")
        assert detail.status_code == 200, detail.text
        payload = detail.json()
        assert payload["run_id"] == latest["run_id"]
        assert payload["steps"], "expected detailed steps to be recorded"
        assert payload["trace"], "expected trace events to be persisted"
        assert payload["metadata"]["config"]["max_steps"] == 2

        filtered = client.get(
            "/api/admin/evaluations/responses",
            params={
                "persona": "cooperative_planner",
                "target": "solitaire-practice",
                "target_kind": "scenario",
                "status_filter": "completed",
                "limit": 1,
            },
        )
        assert filtered.status_code == 200, filtered.text
        filtered_entries = filtered.json()
        assert len(filtered_entries) == 1
        assert filtered_entries[0]["id"] == latest["id"]

        empty = client.get(
            "/api/admin/evaluations/responses",
            params={"persona": "does-not-exist"},
        )
        assert empty.status_code == 200, empty.text
        assert empty.json() == []

        _submit_evaluation(
            client,
            {
                "persona": "ruthless_optimizer",
                "scenario": "solitaire-practice",
                "config": {"max_steps": 2},
            },
        )

        updated_listing = client.get("/api/admin/evaluations/responses")
        assert updated_listing.status_code == 200, updated_listing.text
        persona_ids = {
            entry["persona_id"]
            for entry in updated_listing.json()
            if entry["target_id"] == "solitaire-practice"
        }
        assert len(persona_ids) >= 2, "expected at least two personas recorded for pairing"

        pair_attempt = client.post(
            "/api/admin/evaluations/pairs",
            json={
                "target_id": "solitaire-practice",
            },
        )
        assert pair_attempt.status_code == 201, pair_attempt.text
        pair_payload = pair_attempt.json()
        assert pair_payload["target_id"] == "solitaire-practice"
        assert pair_payload["status"] == "pending"
        slots = {entry["slot"] for entry in pair_payload["responses"]}
        assert slots == {"A", "B"}
        for entry in pair_payload["responses"]:
            assert entry["summary"], "expected anonymised summaries to be present"
            assert "persona_id" not in entry
            assert entry["metadata"].get("persona_version") is None

        pair_listing = client.get("/api/admin/evaluations/pairs")
        assert pair_listing.status_code == 200, pair_listing.text
        pair_entries = pair_listing.json()
        assert any(item["id"] == pair_payload["id"] for item in pair_entries)

        pair_detail = client.get(f"/api/admin/evaluations/pairs/{pair_payload['id']}")
        assert pair_detail.status_code == 200, pair_detail.text
        assert pair_detail.json()["id"] == pair_payload["id"]

        pair_votes = client.get(f"/api/admin/evaluations/pairs/{pair_payload['id']}/votes")
        assert pair_votes.status_code == 200, pair_votes.text
        assert pair_votes.json() == []

        winner_slot = pair_payload["responses"][0]["slot"]
        vote_response = client.post(
            f"/api/admin/evaluations/pairs/{pair_payload['id']}/votes",
            json={
                "winner_slot": winner_slot,
                "rationale": "Clearer plan and better execution",
                "confidence": 0.7,
                "metadata": {
                    "comment": "preferred narrative",
                    "persona_hint": "should be stripped",
                },
            },
        )
        assert vote_response.status_code == 201, vote_response.text
        vote_payload = vote_response.json()
        assert vote_payload["pair_id"] == pair_payload["id"]
        assert vote_payload["winner_slot"] == winner_slot
        assert vote_payload["confidence"] == pytest.approx(0.7)
        assert vote_payload["metadata"] == {"comment": "preferred narrative"}

        votes_listing = client.get("/api/admin/evaluations/votes")
        assert votes_listing.status_code == 200, votes_listing.text
        vote_ids = {entry["id"] for entry in votes_listing.json()}
        assert vote_payload["id"] in vote_ids

        pair_votes_after = client.get(f"/api/admin/evaluations/pairs/{pair_payload['id']}/votes")
        assert pair_votes_after.status_code == 200, pair_votes_after.text
        assert any(entry["id"] == vote_payload["id"] for entry in pair_votes_after.json())

        pair_detail_after_vote = client.get(f"/api/admin/evaluations/pairs/{pair_payload['id']}")
        assert pair_detail_after_vote.status_code == 200, pair_detail_after_vote.text
        pair_metadata = pair_detail_after_vote.json()["metadata"]
        assert pair_metadata.get("vote_count") == 1
        assert pair_metadata.get("last_vote_recorded_at")
    finally:
        state.clear_state()


def test_evaluation_response_detail_not_found(admin_headers) -> None:
    reset_evaluation_worker()
    reset_event_stream()
    state.clear_state()
    app = create_app()
    client = TestClient(app)
    client.headers.update(admin_headers)

    try:
        response = client.get("/api/admin/evaluations/responses/missing")
        assert response.status_code == 404
    finally:
        state.clear_state()


def test_comparison_pair_requires_distinct_responses(admin_headers) -> None:
    reset_evaluation_worker()
    reset_event_stream()
    state.clear_state()
    app = create_app()
    client = TestClient(app)
    client.headers.update(admin_headers)

    try:
        _submit_evaluation(
            client,
            {
                "persona": "cooperative_planner",
                "scenario": "solitaire-practice",
                "config": {"max_steps": 2},
            },
        )

        pair_attempt = client.post(
            "/api/admin/evaluations/pairs",
            json={"target_id": "solitaire-practice"},
        )
        assert pair_attempt.status_code == 404, pair_attempt.text
    finally:
        state.clear_state()


def test_comparison_vote_requires_valid_slot_and_pair(admin_headers) -> None:
    reset_evaluation_worker()
    reset_event_stream()
    state.clear_state()
    app = create_app()
    client = TestClient(app)
    client.headers.update(admin_headers)

    try:
        missing_pair_vote = client.post(
            "/api/admin/evaluations/pairs/missing/votes",
            json={"winner_slot": "A"},
        )
        assert missing_pair_vote.status_code == 404, missing_pair_vote.text

        for persona_name in ("cooperative_planner", "ruthless_optimizer"):
            _submit_evaluation(
                client,
                {
                    "persona": persona_name,
                    "scenario": "solitaire-practice",
                    "config": {"max_steps": 2},
                },
            )

        pair_attempt = client.post(
            "/api/admin/evaluations/pairs",
            json={"target_id": "solitaire-practice"},
        )
        assert pair_attempt.status_code == 201, pair_attempt.text
        pair_payload = pair_attempt.json()

        invalid_vote = client.post(
            f"/api/admin/evaluations/pairs/{pair_payload['id']}/votes",
            json={"winner_slot": "Z"},
        )
        assert invalid_vote.status_code == 422, invalid_vote.text
    finally:
        state.clear_state()
