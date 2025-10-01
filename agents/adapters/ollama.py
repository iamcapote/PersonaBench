"""Adapter for local Ollama models."""

from __future__ import annotations

from typing import Any, Dict, Optional

from bench.core.types import Observation, Plan


class OllamaAdapter:
    """Call Ollama's HTTP API to produce persona plans."""

    def __init__(
        self,
        host: str = "http://localhost:11434",
        model: str = "llama3",
        *,
        session: Optional[Any] = None,
        request_timeout: float = 30.0,
    ) -> None:
        if session is None:
            try:
                import requests  # Lazy import to avoid hard dependency when unused
            except ModuleNotFoundError as exc:  # pragma: no cover - import guard
                raise RuntimeError("requests is required for OllamaAdapter") from exc

            session = requests.Session()

        self._session = session
        self._host = host.rstrip("/")
        self._model = model
        self._timeout = request_timeout

    def generate_plan(self, persona: Dict[str, Any], observation: Observation) -> Plan:
        response = self._session.post(
            f"{self._host}/api/generate",
            json={
                "model": self._model,
                "prompt": self._format_prompt(persona, observation),
                "options": {"temperature": persona.get("risk_tolerance", 0.5)},
            },
            timeout=self._timeout,
        )
        response.raise_for_status()
        payload = response.json()
        content = payload.get("response", "")
        steps = [line.strip() for line in content.split("\n") if line.strip()]
        return Plan(rationale=content, steps=steps[: persona.get("planning_horizon", 3)])

    def _format_prompt(self, persona: Dict[str, Any], observation: Observation) -> str:
        return (
            f"Persona: {persona['name']}\n"
            f"Description: {persona.get('description', '')}\n"
            f"Observation: {observation.payload}\n"
            "Provide a numbered plan."
        )
