"""Tests for evaluation queue API responses."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient

from orchestration.app import create_app
from orchestration.state import clear_state, enqueue_evaluation, update_queue_entry
from orchestration.services.event_stream import get_event_stream, reset_event_stream


def _seed_completed_entry() -> dict[str, object]:
    reset_event_stream()
    clear_state()
    now = datetime.now(UTC).replace(microsecond=0)
    entry = enqueue_evaluation(
        persona_id="persona-test",
        target_id="scenario-test",
        target_kind="scenario",
        requested_at=(now - timedelta(minutes=10)).isoformat(),
    )
    update_queue_entry(
        entry["id"],
        status="running",
        started_at=(now - timedelta(minutes=9)).isoformat(),
    )
    update_queue_entry(
        entry["id"],
        status="completed",
        completed_at=(now - timedelta(minutes=1)).isoformat(),
        metadata={"run_id": "run-public"},
    )
    return entry


def test_public_queue_endpoint_returns_summary() -> None:
    entry = _seed_completed_entry()

    app = create_app()
    client = TestClient(app)

    response = client.get("/api/evaluations/queue")
    assert response.status_code == 200, response.text
    payload = response.json()

    assert payload["summary"]["total_entries"] == 1
    assert payload["summary"]["completed_entries"] == 1
    assert payload["entries"][0]["id"] == entry["id"]
    assert payload["summary"]["last_completed_entry_id"] == entry["id"]

    clear_state()
    reset_event_stream()


def test_admin_queue_endpoint_requires_admin(admin_headers: dict[str, str]) -> None:
    entry = _seed_completed_entry()

    app = create_app()
    client = TestClient(app)

    unauthorized = client.get("/api/admin/queue")
    assert unauthorized.status_code == 403

    response = client.get("/api/admin/queue", headers=admin_headers)
    assert response.status_code == 200, response.text
    payload = response.json()

    assert payload["summary"]["total_entries"] == 1
    assert payload["summary"]["last_completed_entry_id"] == entry["id"]
    assert payload["entries"][0]["persona_id"] == "persona-test"

    clear_state()
    reset_event_stream()


def test_queue_entry_endpoint_supports_etag() -> None:
    entry = _seed_completed_entry()

    app = create_app()
    client = TestClient(app)

    first = client.get(f"/api/evaluations/queue/{entry['id']}")
    assert first.status_code == 200, first.text
    etag = first.headers.get("ETag")
    assert etag, "expected ETag header on queue entry response"

    second = client.get(
        f"/api/evaluations/queue/{entry['id']}",
        headers={"If-None-Match": etag},
    )
    assert second.status_code == 304, second.text

    clear_state()
    reset_event_stream()


def test_queue_event_history_returns_persisted_events() -> None:
    entry = _seed_completed_entry()

    stream = get_event_stream()
    stream.publish(
        entry["id"],
        {
            "type": "status",
            "status": "completed",
            "timestamp": datetime.now(UTC).isoformat(),
            "queue_entry": entry,
        },
    )

    app = create_app()
    client = TestClient(app)

    response = client.get(f"/api/evaluations/queue/{entry['id']}/events/history")
    assert response.status_code == 200, response.text
    payload = response.json()

    assert isinstance(payload, list)
    assert len(payload) == 1
    event = payload[0]
    assert event["type"] == "status"
    assert event["status"] == "completed"
    assert event["queue_entry"]["id"] == entry["id"]

    clear_state()
    reset_event_stream()
