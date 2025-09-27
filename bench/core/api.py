"""Persona-aware step loop interfaces and helpers."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Iterable, Optional

from .logging import TraceLogger
from .types import Action, Observation, Plan, Reaction, StepResult


class PersonaAgent(ABC):
    """Base class for agents that expose the PersonaBench step API."""

    name: str = "persona-agent"

    def __init__(self, trace_logger: Optional[TraceLogger] = None) -> None:
        self._trace_logger = trace_logger or TraceLogger.null_logger()

    @abstractmethod
    def plan(self, observation: Observation) -> Plan:
        """Return a plan describing intended behaviour for the next step."""

    @abstractmethod
    def act(self, plan: Plan, observation: Observation) -> Action:
        """Execute the given plan against the current observation."""

    def react(self, observation: Observation, events: Iterable[str]) -> Reaction:
        """Optional adjustment after executing an action."""

        del observation, events
        return Reaction(adjustment="noop")

    def step(self, observation: Observation, adapter: "EnvAdapter") -> StepResult:
        """Perform a single plan→act→react iteration against an environment adapter."""

        plan = self.plan(observation)
        self._trace_logger.log_plan(self.name, plan)

        action = self.act(plan, observation)
        self._trace_logger.log_action(self.name, action)

        result = adapter.execute(action)
        self._trace_logger.log_step_result(self.name, result)

        reaction = self.react(result.observation, [event.name for event in result.events])
        self._trace_logger.log_reaction(self.name, reaction)

        return result


class EnvAdapter(ABC):
    """Common interface for all benchmark environment adapters."""

    name: str

    @abstractmethod
    def reset(self) -> Observation:
        """Return the initial observation for a new episode."""

    @abstractmethod
    def execute(self, action: Action) -> StepResult:
        """Apply an action and return the resulting observation and rewards."""

    def close(self) -> None:
        """Optional cleanup hook."""


__all__ = ["PersonaAgent", "EnvAdapter"]
