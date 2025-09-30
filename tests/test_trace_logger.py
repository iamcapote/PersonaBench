"""Trace logger behaviour tests."""

from __future__ import annotations

import io
import json
from datetime import UTC, datetime

from bench.core.logging import TraceLogger
from bench.core.types import Action, Observation, Plan, Reaction, StepResult, Event


def _strip_timestamps(record: dict) -> dict:
    record = dict(record)
    record.pop("timestamp", None)
    return record


def test_trace_logger_context_and_tool_summary() -> None:
    buffer = io.StringIO()
    logger = TraceLogger(
        buffer,
        run_id="run-123",
        persona="persona-alpha",
        scenario="scenario-beta",
        extra_context={"evaluation": "eval-456"},
    )

    logger.log_context()
    logger.log_plan(
        "persona-alpha",
        Plan(rationale="test", steps=["do"], metadata={"seed": 1}),
    )
    logger.log_action(
        "persona-alpha",
        Action(
            command="use_tool",
            arguments={"arg": 1},
            tool_calls=[{"name": "browser", "metadata": {}}],
        ),
    )
    logger.log_tool_summary()

    records = [json.loads(line) for line in buffer.getvalue().strip().splitlines()]
    assert records[0]["event"] == "context"
    assert records[0]["run_id"] == "run-123"
    assert records[0]["evaluation"] == "eval-456"

    plan_record = records[1]
    assert plan_record["event"] == "plan"
    assert plan_record["persona"] == "persona-alpha"
    assert plan_record["scenario"] == "scenario-beta"
    assert plan_record["run_id"] == "run-123"

    summary_record = records[-1]
    assert summary_record["event"] == "tool_summary"
    assert summary_record["tool_usage"] == {"browser": 1}


def test_trace_logger_step_result_contains_events() -> None:
    buffer = io.StringIO()
    logger = TraceLogger(buffer)

    observation = Observation(payload={"state": "s"}, timestamp=datetime.now(UTC))
    step_result = StepResult(
        observation=observation,
        reward=0.5,
        done=False,
        info={"status": "ok"},
        events=[Event(name="ping", payload={"value": 1})],
    )
    logger.log_step_result("agent", step_result)
    logger.log_reaction("agent", Reaction(adjustment="noop"))

    records = [json.loads(line) for line in buffer.getvalue().strip().splitlines()]
    step_record = _strip_timestamps(records[0])
    assert step_record["event"] == "step_result"
    assert step_record["payload"]["observation"]["payload"] == {"state": "s"}
    assert step_record["payload"]["events"][0]["name"] == "ping"

    reaction_record = _strip_timestamps(records[1])
    assert reaction_record["event"] == "reaction"
    assert reaction_record["payload"]["adjustment"] == "noop"
