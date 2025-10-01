"""Unit tests for LLM-backed persona adapters."""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from agents.adapters.ollama import OllamaAdapter
from agents.adapters.openai import OpenAIChatAdapter
from bench.core.types import Observation


class _FakeOpenAICompletions:
    def __init__(self, call_log: list[dict]) -> None:
        self._call_log = call_log

    def create(self, *, model: str, messages: list[dict], temperature: float) -> SimpleNamespace:  # type: ignore[override]
        self._call_log.append({"model": model, "messages": messages, "temperature": temperature})
        message = SimpleNamespace(content="1. Explore options\n2. Execute best move")
        return SimpleNamespace(choices=[SimpleNamespace(message=message)])


class _FakeOpenAIClient:
    def __init__(self) -> None:
        self.calls: list[dict] = []
        self.chat = SimpleNamespace(completions=_FakeOpenAICompletions(self.calls))


class _FakeResponse:
    def __init__(self, payload: dict) -> None:
        self._payload = payload
        self.raise_called = False

    def raise_for_status(self) -> None:
        self.raise_called = True

    def json(self) -> dict:
        return self._payload


class _FakeSession:
    def __init__(self) -> None:
        self.posts: list[dict] = []

    def post(self, url: str, json: dict, timeout: float) -> _FakeResponse:  # type: ignore[override]
        self.posts.append({"url": url, "json": json, "timeout": timeout})
        return _FakeResponse({"response": "1. Assess\n2. Decide"})


@pytest.mark.parametrize(
    "persona",
    [
        {"name": "Explorer", "planning_horizon": 2, "risk_tolerance": 0.3},
        {"name": "Fallback", "risk_tolerance": 0.7},
    ],
)
def test_openai_adapter_generates_plan(persona):
    client = _FakeOpenAIClient()
    adapter = OpenAIChatAdapter(client=client, model="gpt-test", system_prompt="Test prompt")
    observation = Observation(payload={"state": "initial"})

    plan = adapter.generate_plan(persona, observation)

    assert plan.steps
    assert len(plan.steps) <= persona.get("planning_horizon", len(plan.steps))
    last_call = client.calls[-1]
    assert last_call["model"] == "gpt-test"
    assert last_call["messages"][0]["role"] == "system"
    assert last_call["messages"][1]["content"].startswith("Persona:")
    assert pytest.approx(persona.get("risk_tolerance", 0.5)) == last_call["temperature"]


def test_ollama_adapter_generates_plan():
    session = _FakeSession()
    adapter = OllamaAdapter(host="http://ollama", model="llama3", session=session, request_timeout=5)
    persona = {"name": "Strategist", "planning_horizon": 1, "risk_tolerance": 0.1}
    observation = Observation(payload={"board": "state"})

    plan = adapter.generate_plan(persona, observation)

    assert plan.steps == ["1. Assess"]
    assert plan.rationale.startswith("1. Assess")
    post_call = session.posts[-1]
    assert post_call["url"] == "http://ollama/api/generate"
    assert post_call["timeout"] == 5
    assert post_call["json"]["model"] == "llama3"
    assert "Persona: Strategist" in post_call["json"]["prompt"]