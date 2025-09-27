"""OpenSpiel adapter skeleton for PersonaBench."""

from __future__ import annotations

from typing import Any, Dict

from ...core.api import EnvAdapter
from ...core.types import Action, Observation, StepResult


class OpenSpielAdapter(EnvAdapter):
    """Lightweight wrapper around OpenSpiel Python environments."""

    name = "openspiel"

    def __init__(self, game: Any) -> None:
        self._game = game
        self._state = None

    def reset(self) -> Observation:
        self._state = self._game.new_initial_state()
        return Observation(payload={"state": self._state.serialize_game_state()})

    def execute(self, action: Action) -> StepResult:
        if self._state is None:
            raise RuntimeError("Adapter must be reset before execute")
        self._state.apply_action(self._translate_action(action))
        obs = Observation(payload={"state": self._state.serialize_game_state()})
        reward = self._state.player_reward(self._state.current_player())
        done = self._state.is_terminal()
        info: Dict[str, Any] = {"legal_actions": self._state.legal_actions()}
        return StepResult(observation=obs, reward=reward, done=done, info=info)

    def _translate_action(self, action: Action) -> int:
        if isinstance(action.command, int):
            return action.command
        try:
            return int(action.command)
        except ValueError as exc:  # pragma: no cover - defensive
            raise ValueError(f"Unsupported OpenSpiel action: {action.command}") from exc
