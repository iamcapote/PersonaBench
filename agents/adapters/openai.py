"""Adapter that proxies PersonaBench agents to OpenAI-compatible APIs."""

from __future__ import annotations

from typing import Any, Dict, Iterable

from bench.core.types import Observation, Plan


class OpenAIChatAdapter:
    """Minimal wrapper calling an OpenAI-compatible chat completion endpoint."""

    def __init__(self, client: Any, model: str, system_prompt: str = "") -> None:
        self._client = client
        self._model = model
        self._system_prompt = system_prompt

    def generate_plan(self, persona: Dict[str, Any], observation: Observation) -> Plan:
        prompt = self._build_prompt(persona, observation)
        response = self._client.chat.completions.create(
            model=self._model,
            messages=prompt,
            temperature=persona.get("risk_tolerance", 0.5),
        )
        content = response.choices[0].message.content
        steps = [line.strip() for line in content.split("\n") if line.strip()]
        return Plan(rationale=content, steps=steps[: persona.get("planning_horizon", 3)])

    def _build_prompt(self, persona: Dict[str, Any], observation: Observation) -> Iterable[Dict[str, str]]:
        return [
            {"role": "system", "content": self._system_prompt},
            {
                "role": "user",
                "content": (
                    "Persona: "
                    + persona.get("description", persona["name"])
                    + "\nObservation: "
                    + str(observation.payload)
                ),
            },
        ]
