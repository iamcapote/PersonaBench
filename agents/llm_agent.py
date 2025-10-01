"""LLM-backed persona agent implementations."""

from __future__ import annotations

import re
from typing import Any, Mapping, Optional, Sequence

from bench.core.api import PersonaAgent
from bench.core.types import Action, Observation, Plan, Reaction


class LLMPlanningAgent(PersonaAgent):
    """Persona agent that delegates planning to an LLM adapter."""

    _COMMAND_PATTERN = re.compile(r"^\s*(\d+\s*[\.)]\s*)", re.UNICODE)

    def __init__(
        self,
        persona: Mapping[str, Any],
        planner: Any,
        *,
        default_command: str = "noop",
        trace_logger: Optional[Any] = None,
    ) -> None:
        super().__init__(trace_logger=trace_logger)
        self.persona = dict(persona)
        self.name = self.persona.get("name", getattr(self, "name", "persona-agent"))
        self._planner = planner
        self._default_command = str(default_command).strip().lower()
        self._last_plan: Plan | None = None

    def plan(self, observation: Observation) -> Plan:
        plan = self._planner.generate_plan(self.persona, observation)
        self._last_plan = plan
        return plan

    def act(self, plan: Plan, observation: Observation) -> Action:
        del observation
        command = self._select_command(plan.steps)
        return Action(command=command)

    def react(self, observation: Observation, events: Sequence[str]) -> Reaction:
        del observation, events
        return Reaction(adjustment="noop")

    def _select_command(self, steps: Sequence[str]) -> str:
        for step in steps:
            command = self._normalise_step(step)
            if command:
                return command
        return self._default_command

    def _normalise_step(self, step: str) -> str:
        text = str(step).strip()
        if not text:
            return ""
        text = self._COMMAND_PATTERN.sub("", text, count=1)
        if text.startswith("- "):
            text = text[2:]
        text = text.strip()
        text = text.rstrip(".;")
        return text.lower()
