"""Adapter for running PersonaBench agents with vLLM endpoints."""

from __future__ import annotations

from typing import Any, Dict

from bench.core.types import Observation, Plan


class VLLMAdapter:
    """Wraps a vLLM HTTP endpoint for plan generation."""

    def __init__(self, client: Any, model: str) -> None:
        self._client = client
        self._model = model

    def generate_plan(self, persona: Dict[str, Any], observation: Observation) -> Plan:
        payload = {
            "model": self._model,
            "prompt": self._format_prompt(persona, observation),
            "temperature": persona.get("risk_tolerance", 0.5),
        }
        response = self._client.post("/generate", json=payload, timeout=30)
        content = response.json()["text"]
        steps = [line.strip("- ") for line in content.split("\n") if line.strip()]
        return Plan(rationale=content, steps=steps[: persona.get("planning_horizon", 3)])

    def _format_prompt(self, persona: Dict[str, Any], observation: Observation) -> str:
        return (
            f"You are persona {persona['name']} with description: {persona.get('description', '')}.\n"
            f"Observation: {observation.payload}"
        )
