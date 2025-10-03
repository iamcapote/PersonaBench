"""Tests for asynchronous evaluation execution."""

from __future__ import annotations

import json
import time

from fastapi.testclient import TestClient

from orchestration import state
from orchestration.app import create_app
from orchestration.services.event_stream import reset_event_stream
from orchestration.worker import reset_evaluation_worker


def _await_queue_completion(entry_id: str, *, timeout: float = 10.0) -> dict[str, object]:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        entry = state.get_queue_entry(entry_id)
        if entry and entry.get("status") in {"completed", "failed"}:
            return entry
        time.sleep(0.05)
    raise AssertionError(f"Timed out waiting for queue entry '{entry_id}' to complete")


def test_create_evaluation_schedules_background_job(monkeypatch) -> None:
    reset_evaluation_worker()
    reset_event_stream()
    state.clear_state()
    app = create_app()
    client = TestClient(app)

    def _fake_invoke(payload: dict[str, object]) -> dict[str, object]:
        return {
            "status": "completed",
            "adapter": "solitaire",
            "summary": {"total_steps": 1},
            "steps": [],
            "trace": [],
        }

    monkeypatch.setattr(
        "orchestration.routes.evaluations.evaluation_chain.invoke",
        _fake_invoke,
    )

    response = client.post(
        "/api/evaluations",
        json={
            "persona": "cooperative_planner",
            "scenario": "solitaire-practice",
            "config": {"max_steps": 1},
        },
    )
    assert response.status_code == 202, response.text
    payload = response.json()
    assert payload["status"] == "queued"
    details = payload["details"]
    entry_id = details["queue_entry_id"]
    assert entry_id

    entry = _await_queue_completion(entry_id)
    assert entry["status"] == "completed"
    assert entry.get("metadata", {}).get("summary", {}).get("total_steps") == 1

    responses = state.list_evaluation_responses()
    assert responses, "expected evaluation response to be persisted"
    assert any(response_item.get("run_id") == details["run_id"] for response_item in responses)

    reset_evaluation_worker()
    reset_event_stream()
    state.clear_state()


def test_queue_event_stream_provides_lifecycle(monkeypatch) -> None:
    reset_evaluation_worker()
    reset_event_stream()
    state.clear_state()
    app = create_app()
    client = TestClient(app)

    def _fake_invoke(payload: dict[str, object]) -> dict[str, object]:
        time.sleep(0.05)
        return {
            "status": "completed",
            "adapter": "solitaire",
            "summary": {"total_steps": 1},
            "steps": [],
            "trace": [],
        }

    monkeypatch.setattr(
        "orchestration.routes.evaluations.evaluation_chain.invoke",
        _fake_invoke,
    )

    response = client.post(
        "/api/evaluations",
        json={
            "persona": "cooperative_planner",
            "scenario": "solitaire-practice",
            "config": {"max_steps": 1},
        },
    )
    assert response.status_code == 202, response.text
    entry_id = response.json()["details"]["queue_entry_id"]

    events: list[dict[str, object]] = []
    with client.stream("GET", f"/api/evaluations/queue/{entry_id}/events") as stream:
        for line in stream.iter_lines():
            if not line:
                continue
            assert line.startswith("data: "), line
            event = json.loads(line[6:])
            events.append(event)
            if event.get("type") in {"result", "error"}:
                break

    statuses = [event.get("status") for event in events]
    assert statuses[0] == "queued"
    assert "running" in statuses
    assert statuses[-1] in {"completed", "failed"}

    for event in events:
        queue_entry = event.get("queue_entry")
        assert isinstance(queue_entry, dict)
        assert queue_entry.get("id") == entry_id

    history_response = client.get(f"/api/evaluations/queue/{entry_id}/events/history")
    assert history_response.status_code == 200, history_response.text
    history = history_response.json()
    assert history, "expected history endpoint to return recorded events"
    assert history[-1]["type"] == events[-1]["type"]
    assert history[0]["status"] == "queued"

    reset_evaluation_worker()
    reset_event_stream()
    state.clear_state()
