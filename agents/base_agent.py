"""Base persona-aware agent implementation."""

from __future__ import annotations

from typing import Optional

from bench.core.api import PersonaAgent
from bench.core.logging import TraceLogger
from bench.core.types import Action, Observation, Plan


class RuleBasedAgent(PersonaAgent):
    """Simple agent that echoes persona constraints into actions."""

    def __init__(self, persona: dict, trace_logger: Optional[TraceLogger] = None) -> None:
        super().__init__(trace_logger=trace_logger)
        self.persona = persona
        self.name = persona.get("name", getattr(self, "name", "persona-agent"))

    def plan(self, observation: Observation) -> Plan:
        rationale = f"Operate within risk tolerance {self.persona.get('risk_tolerance', 0.5)}"
        steps = ["analyze", "select_action", "verify"]
        return Plan(rationale=rationale, steps=steps)

    def act(self, plan: Plan, observation: Observation) -> Action:
        del plan, observation
        return Action(command="noop")
