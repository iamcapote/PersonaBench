"""Tests for the evaluation LangChain runnable."""

from __future__ import annotations

import asyncio
from types import SimpleNamespace
from typing import Any, Dict

import pytest

from orchestration.chains import build_evaluation_chain
class _FakeOpenAIClient:
    def __init__(self) -> None:
        self.calls: list[dict] = []
        self.chat = SimpleNamespace(completions=self)

    def create(self, *, model: str, messages: list[dict], temperature: float) -> SimpleNamespace:  # type: ignore[override]
        self.calls.append({"model": model, "messages": messages, "temperature": temperature})
        message = SimpleNamespace(content="1. draw\n2. evaluate")
        return SimpleNamespace(choices=[SimpleNamespace(message=message)])



@pytest.fixture()
def evaluation_payload() -> Dict[str, Any]:
    persona = {
        "name": "test-persona",
        "version": "0.1.0",
        "planning_horizon": 3,
        "risk_tolerance": 0.5,
        "tools": {"allowed": ["noop"]},
    }
    scenario = {
        "id": "solitaire_smoke",
        "environment": "solitaire",
        "raw": {"adapter": {"seed": 7}},
    }
    config = {
        "max_steps": 2,
    }
    return {
        "persona": persona,
        "target": scenario,
        "target_kind": "scenario",
        "target_id": scenario["id"],
        "config": config,
    }


def test_evaluation_chain_invoke_returns_trace(evaluation_payload: Dict[str, Any]) -> None:
    chain = build_evaluation_chain()
    result = chain.invoke(dict(evaluation_payload))

    assert result["status"] == "completed"
    assert result["adapter"] == "solitaire"
    assert result["summary"]["total_steps"] >= 1
    assert result["trace"], "expected trace events to be captured"
    assert all("event" in entry for entry in result["trace"])


def test_evaluation_chain_ainvoke_matches_sync(evaluation_payload: Dict[str, Any]) -> None:
    chain = build_evaluation_chain()

    async def _call() -> Dict[str, Any]:
        return await chain.ainvoke(dict(evaluation_payload))

    async_result = asyncio.run(_call())
    assert async_result["status"] == "completed"
    assert async_result["trace"]


async def _collect_stream(chain, payload):
    events = []
    async for chunk in chain.astream(dict(payload)):
        events.append(chunk)
    return events


def test_evaluation_chain_astream_produces_events(evaluation_payload: Dict[str, Any]) -> None:
    chain = build_evaluation_chain()

    events = asyncio.run(_collect_stream(chain, evaluation_payload))
    assert events, "astream should yield trace events and a final result"
    trace_events = [entry for entry in events if entry["type"] == "trace"]
    assert trace_events, "expected at least one trace event"
    assert events[-1]["type"] == "result"
    assert "trace" in events[-1]["payload"]


def test_evaluation_chain_with_llm_agent(evaluation_payload: Dict[str, Any]) -> None:
    client = _FakeOpenAIClient()
    chain = build_evaluation_chain()

    payload = dict(evaluation_payload)
    payload["config"] = dict(payload["config"])
    payload["config"]["max_steps"] = 1
    payload["config"]["agent"] = {
        "type": "llm",
        "backend": "openai_chat",
        "client": client,
        "model": "gpt-test",
        "system_prompt": "You are a solitaire assistant.",
        "default_command": "draw",
    }

    result = chain.invoke(payload)

    assert result["status"] == "completed"
    assert client.calls, "expected LLM client to be invoked"
    assert result["steps"], "expected at least one step"
    first_step = result["steps"][0]
    assert isinstance(first_step["info"].get("valid"), bool)