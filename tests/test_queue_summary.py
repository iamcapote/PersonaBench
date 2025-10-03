"""Tests for orchestration queue summary aggregation."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from orchestration.state import (
    clear_state,
    enqueue_evaluation,
    summarize_queue,
    update_queue_entry,
)


@pytest.fixture(autouse=True)
def _clear_state() -> None:
    """Ensure queue state is reset before and after each test."""

    clear_state()
    yield
    clear_state()


def test_summarize_queue_includes_counts_and_metadata() -> None:
    """Queue summary should report counts, backlog, and completion stats."""

    now = datetime.now(UTC).replace(microsecond=0)

    oldest_request = (now - timedelta(hours=2)).isoformat()
    running_request = (now - timedelta(hours=1, minutes=15)).isoformat()
    completed_request = (now - timedelta(hours=1)).isoformat()
    failed_request = (now - timedelta(minutes=30)).isoformat()

    queued_entry = enqueue_evaluation(
        persona_id="persona-queued",
        target_id="scenario-queued",
        target_kind="scenario",
        requested_at=oldest_request,
    )

    running_entry = enqueue_evaluation(
        persona_id="persona-running",
        target_id="scenario-running",
        target_kind="scenario",
        requested_at=running_request,
    )
    update_queue_entry(
        running_entry["id"],
        status="running",
        started_at=(now - timedelta(hours=1)).isoformat(),
    )

    completed_entry = enqueue_evaluation(
        persona_id="persona-completed",
        target_id="scenario-completed",
        target_kind="scenario",
        requested_at=completed_request,
    )
    started_at = (now - timedelta(minutes=20)).isoformat()
    completed_at = (now - timedelta(minutes=5)).isoformat()
    update_queue_entry(
        completed_entry["id"],
        status="running",
        started_at=started_at,
    )
    update_queue_entry(
        completed_entry["id"],
        status="completed",
        completed_at=completed_at,
    )

    failed_entry = enqueue_evaluation(
        persona_id="persona-failed",
        target_id="scenario-failed",
        target_kind="scenario",
        requested_at=failed_request,
    )
    update_queue_entry(
        failed_entry["id"],
        status="failed",
        completed_at=(now - timedelta(minutes=10)).isoformat(),
        error="cancelled",
    )

    summary = summarize_queue()

    assert summary["total_entries"] == 4
    assert summary["active_entries"] == 2
    assert summary["queued_entries"] == 1
    assert summary["running_entries"] == 1
    assert summary["completed_entries"] == 1
    assert summary["failed_entries"] == 1

    assert summary["last_completed_entry_id"] == completed_entry["id"]
    assert summary["last_completed_persona_id"] == "persona-completed"
    assert summary["last_completed_target_id"] == "scenario-completed"
    assert summary["last_completed_at"] == completed_at
    assert summary["last_completed_duration_seconds"] == pytest.approx(15 * 60, abs=1)

    assert summary["oldest_queued_entry_id"] == queued_entry["id"]
    assert summary["oldest_queued_persona_id"] == "persona-queued"
    assert summary["oldest_queued_requested_at"] == oldest_request
    assert summary["oldest_queued_wait_seconds"] == pytest.approx(2 * 60 * 60, abs=5)
