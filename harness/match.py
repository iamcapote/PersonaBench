"""Multi-persona match runner built on top of the game master."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping

from bench.core.api import PersonaAgent
from bench.core.game_master import GameMaster, MatchResult, TurnBasedGame


@dataclass
class MatchConfig:
    """Configuration for multi-agent matches."""

    max_turns: int = 200


class MatchRunner:
    """Execute a multi-persona match within a turn-based game."""

    def __init__(
        self,
        agents: Mapping[str, PersonaAgent],
        game: TurnBasedGame,
        config: MatchConfig | None = None,
    ) -> None:
        self._agents = dict(agents)
        self._game = game
        self._config = config or MatchConfig()

    def run(self) -> MatchResult:
        master = GameMaster(self._game, self._agents, max_turns=self._config.max_turns)
        return master.run()
