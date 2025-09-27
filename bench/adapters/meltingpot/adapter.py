"""Melting Pot evaluation adapter."""

from __future__ import annotations

from typing import Any, Dict

from ...core.api import EnvAdapter
from ...core.types import Action, Observation, StepResult


class MeltingPotAdapter(EnvAdapter):
    """Wraps DeepMind Melting Pot substrates with the PersonaBench API."""

    name = "meltingpot"

    def __init__(self, substrate: Any) -> None:
        self._substrate = substrate
        self._timestep = None

    def reset(self) -> Observation:
        self._timestep = self._substrate.reset()
        return Observation(payload={"observation": self._timestep.observation})

    def execute(self, action: Action) -> StepResult:
        if self._timestep is None:
            raise RuntimeError("Adapter must be reset before execute")
        self._timestep = self._substrate.step(action.command)
        obs = Observation(payload={"observation": self._timestep.observation})
        reward = float(self._timestep.reward)
        done = bool(self._timestep.last())
        info: Dict[str, Any] = {"discount": float(self._timestep.discount)}
        return StepResult(observation=obs, reward=reward, done=done, info=info)
