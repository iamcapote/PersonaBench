"""OSWorld adapter for PersonaBench."""

from __future__ import annotations

from typing import Any, Dict

from ...core.api import EnvAdapter
from ...core.types import Action, Observation, StepResult


class OSWorldAdapter(EnvAdapter):
    """Wraps OSWorld desktop tasks via their gRPC/python client."""

    name = "osworld"

    def __init__(self, controller: Any) -> None:
        self._controller = controller

    def reset(self) -> Observation:
        obs = self._controller.reset()
        return Observation(payload={"screen": obs["screen"]})

    def execute(self, action: Action) -> StepResult:
        result = self._controller.step(action.arguments or action.command)
        obs = Observation(payload={"screen": result["screen"]})
        reward = float(result.get("reward", 0.0))
        done = bool(result.get("done", False))
        info: Dict[str, Any] = result.get("info", {})
        return StepResult(observation=obs, reward=reward, done=done, info=info)
