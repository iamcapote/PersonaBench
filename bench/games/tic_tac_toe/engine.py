"""Tic-tac-toe engine compatible with the PersonaBench game master."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import ClassVar, Dict, Iterable, List, Mapping, Sequence

from ...core.game_master import TurnBasedGame, TurnUpdate
from ...core.types import Event


@dataclass
class TicTacToeGame(TurnBasedGame):
    """Classic tic-tac-toe with alternating turns and penalties for invalid play."""

    players: Sequence[str] = ("player_x", "player_o")
    win_reward: float = 1.0
    loss_penalty: float = -1.0
    invalid_penalty: float = -0.5

    _board: List[str] = field(init=False, default_factory=list)
    _current_index: int = field(init=False, default=0)
    _winner: str | None = field(init=False, default=None)
    _terminal: bool = field(init=False, default=False)
    _scores: Dict[str, float] = field(init=False, default_factory=dict)
    _turn_count: int = field(init=False, default=0)

    SYMBOLS: ClassVar[Mapping[str, str]] = {"player_x": "X", "player_o": "O"}

    def reset(self) -> None:
        self._board = [" "] * 9
        self._current_index = 0
        self._winner = None
        self._terminal = False
        self._turn_count = 0
        self._scores = {player: 0.0 for player in self.players}

    def current_player(self) -> str:
        return self.players[self._current_index]

    def observation(self, player_id: str) -> Mapping[str, object]:
        return {
            "text": self._render_board(player_id),
            "board": list(self._board),
            "your_symbol": self.SYMBOLS[player_id],
            "opponent_symbol": self.SYMBOLS[self._opponent(player_id)],
            "turn_count": self._turn_count,
            "is_terminal": self._terminal,
        }

    def legal_actions(self, player_id: str) -> Sequence[str]:
        if self._terminal or player_id != self.current_player():
            return []
        return [str(index + 1) for index, cell in enumerate(self._board) if cell == " "]

    def apply(self, player_id: str, command: str) -> TurnUpdate:
        if self._terminal:
            return TurnUpdate(
                observation=self.observation(player_id),
                reward=0.0,
                done=True,
                info={"reason": "match_already_finished"},
            )

        if player_id != self.current_player():
            self._scores[player_id] += self.invalid_penalty
            return TurnUpdate(
                observation=self.observation(player_id),
                reward=self.invalid_penalty,
                done=False,
                info={
                    "invalid": True,
                    "reason": "out_of_turn",
                    "legal_moves": self.legal_actions(self.current_player()),
                },
            )

        move_index = self._parse_move(command)
        if move_index is None or self._board[move_index] != " ":
            self._scores[player_id] += self.invalid_penalty
            return TurnUpdate(
                observation=self.observation(player_id),
                reward=self.invalid_penalty,
                done=False,
                info={
                    "invalid": True,
                    "reason": "illegal_move",
                    "legal_moves": self.legal_actions(player_id),
                },
            )

        symbol = self.SYMBOLS[player_id]
        self._board[move_index] = symbol
        self._turn_count += 1

        events: Iterable[Event] = (
            Event(name="move", payload={"player": player_id, "position": move_index + 1, "symbol": symbol}),
        )

        if self._check_win(symbol):
            self._terminal = True
            self._winner = player_id
            opponent = self._opponent(player_id)
            self._scores[player_id] += self.win_reward
            self._scores[opponent] += self.loss_penalty
            return TurnUpdate(
                observation=self.observation(player_id),
                reward=self.win_reward,
                done=True,
                info={
                    "outcome": "win",
                    "winner": player_id,
                    "final_board": list(self._board),
                },
                events=events,
            )

        if all(cell != " " for cell in self._board):
            self._terminal = True
            self._winner = None
            return TurnUpdate(
                observation=self.observation(player_id),
                reward=0.0,
                done=True,
                info={
                    "outcome": "draw",
                    "winner": None,
                    "final_board": list(self._board),
                },
                events=events,
            )

        # Continue match: switch player and provide neutral reward
        self._advance_player()
        return TurnUpdate(
            observation=self.observation(player_id),
            reward=0.0,
            done=False,
            info={
                "outcome": "ongoing",
                "legal_moves": self.legal_actions(self.current_player()),
            },
            events=events,
        )

    def is_terminal(self) -> bool:
        return self._terminal

    def final_scores(self) -> Mapping[str, float]:
        return dict(self._scores)

    def status(self) -> Mapping[str, object]:
        return {
            "winner": self._winner,
            "board": list(self._board),
            "turns": self._turn_count,
            "terminal": self._terminal,
        }

    def _advance_player(self) -> None:
        self._current_index = (self._current_index + 1) % len(self.players)

    def _opponent(self, player_id: str) -> str:
        for player in self.players:
            if player != player_id:
                return player
        return player_id

    def _parse_move(self, command: str) -> int | None:
        text = command.strip().lower()
        if not text:
            return None
        tokens = text.replace("-", " ").split()
        for token in tokens:
            if token.isdigit():
                value = int(token)
                if 1 <= value <= 9:
                    return value - 1
        return None

    def _check_win(self, symbol: str) -> bool:
        win_indices = [
            (0, 1, 2),
            (3, 4, 5),
            (6, 7, 8),
            (0, 3, 6),
            (1, 4, 7),
            (2, 5, 8),
            (0, 4, 8),
            (2, 4, 6),
        ]
        for line in win_indices:
            if all(self._board[index] == symbol for index in line):
                return True
        return False

    def _render_board(self, player_id: str) -> str:
        rows = [
            " | ".join(self._board[row:row + 3])
            for row in range(0, 9, 3)
        ]
        header = f"Tic-Tac-Toe — you are '{self.SYMBOLS[player_id]}'"
        footer = f"Turn {self._turn_count}. {'Game over.' if self._terminal else 'Awaiting moves.'}"
        return "\n".join([header, "---------", *rows, "---------", footer])
