"""Adapter for local Ollama models."""

from __future__ import annotations

from typing import Dict

from bench.core.types import Observation, Plan


class OllamaAdapter:
    """Call Ollama's HTTP API to produce persona plans."""

    def __init__(self, host: str = "http://localhost:11434", model: str = "llama3") -> None:
        import requests

        self._session = requests.Session()
        self._host = host.rstrip("/")
        self._model = model

    def generate_plan(self, persona: Dict[str, Any], observation: Observation) -> Plan:
        response = self._session.post(
            f"{self._host}/api/generate",
            json={
                "model": self._model,
                "prompt": self._format_prompt(persona, observation),
                "options": {"temperature": persona.get("risk_tolerance", 0.5)},
            },
            timeout=30,
        )
        response.raise_for_status()
        content = response.json()["response"]
        steps = [line.strip() for line in content.split("\n") if line.strip()]
        return Plan(rationale=content, steps=steps[: persona.get("planning_horizon", 3)])

    def _format_prompt(self, persona: Dict[str, Any], observation: Observation) -> str:
        return (
            f"Persona: {persona['name']}\n"
            f"Description: {persona.get('description', '')}\n"
            f"Observation: {observation.payload}\n"
            "Provide a numbered plan."
        )
