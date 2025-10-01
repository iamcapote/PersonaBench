"""Turn-based game master orchestration for multi-persona matches."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Mapping, MutableMapping, Optional, Sequence

from .api import PersonaAgent
from .types import Action, Event, Observation, StepResult


@dataclass
class TurnUpdate:
    """Result returned by a turn-based game after applying an action."""

    observation: Mapping[str, object]
    reward: float
    done: bool
    info: Mapping[str, object] = field(default_factory=dict)
    events: Iterable[Event] = field(default_factory=tuple)


@dataclass
class TurnRecord:
    """Audit trail entry for a completed turn."""

    turn_index: int
    player_id: str
    command: str
    reward: float
    info: Mapping[str, object]


@dataclass
class MatchResult:
    """Summary returned after a match concludes."""

    turns: List[TurnRecord]
    scores: Mapping[str, float]
    winner: Optional[str]
    status: Mapping[str, object]
    completed: bool


class TurnBasedGame:
    """Abstract interface for synchronous turn-based games."""

    players: Sequence[str]

    def reset(self) -> None:
        """Initialise a new match."""

        raise NotImplementedError

    def current_player(self) -> str:
        """Return the identifier of the player expected to act."""

        raise NotImplementedError

    def observation(self, player_id: str) -> Mapping[str, object]:
        """Return an observation dictionary for the supplied player."""

        raise NotImplementedError

    def legal_actions(self, player_id: str) -> Sequence[str]:
        """Return a list of legal commands for the player."""

        raise NotImplementedError

    def apply(self, player_id: str, command: str) -> TurnUpdate:
        """Apply a player's command and return the resulting turn update."""

        raise NotImplementedError

    def is_terminal(self) -> bool:
        """Return ``True`` if the match has concluded."""

        raise NotImplementedError

    def final_scores(self) -> Mapping[str, float]:
        """Return final reward totals for each player."""

        raise NotImplementedError

    def status(self) -> Mapping[str, object]:
        """Return a free-form status payload summarising the match."""

        raise NotImplementedError


class GameMaster:
    """Coordinates persona agents playing a synchronous turn-based game."""

    def __init__(
        self,
        game: TurnBasedGame,
        agents: Mapping[str, PersonaAgent],
        *,
        max_turns: int = 200,
    ) -> None:
        missing = [player for player in game.players if player not in agents]
        if missing:
            raise ValueError(f"Agents missing for players: {', '.join(missing)}")

        self._game = game
        self._agents = agents
        self._max_turns = max(1, int(max_turns))

    def run(self) -> MatchResult:
        self._game.reset()
        turns: List[TurnRecord] = []
        scores: MutableMapping[str, float] = {player: 0.0 for player in self._game.players}

        for turn_index in range(self._max_turns):
            if self._game.is_terminal():
                break

            player_id = self._game.current_player()
            agent = self._agents[player_id]
            observation_payload = dict(self._game.observation(player_id))
            observation_payload.setdefault("legal_moves", list(self._game.legal_actions(player_id)))
            observation = Observation(payload=observation_payload)

            recorded_action: Optional[Action] = None

            def executor(action: Action) -> StepResult:
                nonlocal recorded_action
                recorded_action = action
                update = self._game.apply(player_id, action.command)
                step_observation = Observation(payload=dict(update.observation))
                return StepResult(
                    observation=step_observation,
                    reward=update.reward,
                    done=update.done,
                    info=dict(update.info),
                    events=tuple(update.events),
                )

            step_result = agent.perform_iteration(observation, executor)

            if recorded_action is None:
                raise RuntimeError("Agent failed to execute an action")

            scores[player_id] += float(step_result.reward)
            turns.append(
                TurnRecord(
                    turn_index=turn_index,
                    player_id=player_id,
                    command=str(recorded_action.command),
                    reward=float(step_result.reward),
                    info=dict(step_result.info),
                )
            )

            if step_result.done and self._game.is_terminal():
                break

        completed = self._game.is_terminal()
        final_scores = dict(self._game.final_scores()) if completed else dict(scores)
        winner = _determine_winner(final_scores) if completed else None

        return MatchResult(
            turns=turns,
            scores=final_scores,
            winner=winner,
            status=dict(self._game.status()),
            completed=completed,
        )


def _determine_winner(scores: Mapping[str, float]) -> Optional[str]:
    if not scores:
        return None
    best_score = max(scores.values())
    leaders = [player for player, score in scores.items() if score == best_score]
    if len(leaders) == 1:
        return leaders[0]
    return None


__all__ = [
    "GameMaster",
    "MatchResult",
    "TurnBasedGame",
    "TurnRecord",
    "TurnUpdate",
]
