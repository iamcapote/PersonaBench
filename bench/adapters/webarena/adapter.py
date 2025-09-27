"""WebArena adapter for PersonaBench."""

from __future__ import annotations

from typing import Any, Dict

from ...core.api import EnvAdapter
from ...core.types import Action, Observation, StepResult


class WebArenaAdapter(EnvAdapter):
    """Interacts with a BrowserGym/WebArena task server."""

    name = "webarena"

    def __init__(self, client: Any) -> None:
        self._client = client

    def reset(self) -> Observation:
        state = self._client.reset()
        return Observation(payload={"page": state["observation"]})

    def execute(self, action: Action) -> StepResult:
        result = self._client.step(action.arguments or action.command)
        obs = Observation(payload={"page": result["observation"]})
        reward = float(result.get("reward", 0.0))
        done = bool(result.get("done", False))
        info: Dict[str, Any] = result.get("info", {})
        return StepResult(observation=obs, reward=reward, done=done, info=info)
