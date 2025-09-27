"""TALES text-world adapter."""

from __future__ import annotations

from typing import Any, Dict

from ...core.api import EnvAdapter
from ...core.types import Action, Observation, StepResult


class TALESAdapter(EnvAdapter):
    """Adapter for TALES-compatible text adventure environments."""

    name = "tales"

    def __init__(self, env: Any) -> None:
        self._env = env

    def reset(self) -> Observation:
        obs = self._env.reset()
        return Observation(payload={"text": obs})

    def execute(self, action: Action) -> StepResult:
        obs, reward, done, info = self._env.step(action.command)
        observation = Observation(payload={"text": obs})
        info = info or {}
        return StepResult(observation=observation, reward=float(reward), done=bool(done), info=info)
