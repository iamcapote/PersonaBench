"""Heads-up poker engine for multi-persona matches."""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Dict, List, Mapping, MutableMapping, Optional, Sequence

from ...core.game_master import TurnBasedGame, TurnUpdate
from .cards import (
    Card,
    best_hand_rank,
    build_deck,
    format_cards,
    legal_moves_for_stage,
    stage_label,
)


@dataclass
class PokerPlayerState:
    """Per-player state within the poker engine."""

    hand: List[Card] = field(default_factory=list)
    folded: bool = False


class HeadsUpPokerGame(TurnBasedGame):
    """Limit hold'em with a single action round per street."""

    def __init__(
        self,
        players: Sequence[str] | None = None,
        *,
        seed: int | None = None,
        bet_amount: float = 1.0,
        win_reward: float = 1.0,
        loss_penalty: float = -1.0,
        split_reward: float = 0.0,
        invalid_penalty: float = -0.5,
        fold_penalty: float = -1.0,
    ) -> None:
        players = tuple(players or ("player_button", "player_big_blind"))
        if len(players) != 2:
            raise ValueError("HeadsUpPokerGame requires exactly two players")
        self.players: Sequence[str] = players
        self._seed = seed
        self._rng = random.Random(seed)
        self._bet_amount = bet_amount
        self._win_reward = win_reward
        self._loss_penalty = loss_penalty
        self._split_reward = split_reward
        self._invalid_penalty = invalid_penalty
        self._fold_penalty = fold_penalty

        self._button_index = 0  # players[0] acts second preflop, first post-flop
        self._scores: MutableMapping[str, float] = {}
        self._player_states: Dict[str, PokerPlayerState] = {}
        self._deck: List[Card] = []
        self._board_plan: List[Card] = []
        self._board: List[Card] = []
        self._stage: str = "preflop"
        self._stage_actions: Dict[str, str] = {}
        self._awaiting_call: bool = False
        self._aggressor: Optional[str] = None
        self._current_player: str = players[1]
        self._terminal: bool = False
        self._winner: Optional[str] = None
        self._pot: float = 0.0
        self._history: List[str] = []

    def reset(self) -> None:
        self._rng = random.Random(self._seed)
        deck = build_deck()
        self._rng.shuffle(deck)

        self._deck = deck
        self._board_plan = [self._deck.pop() for _ in range(5)]
        self._board = []
        self._scores = {player: 0.0 for player in self.players}
        self._player_states = {
            player: PokerPlayerState(hand=[self._deck.pop(), self._deck.pop()])
            for player in self.players
        }
        self._stage = "preflop"
        self._stage_actions = {}
        self._awaiting_call = False
        self._aggressor = None
        self._terminal = False
        self._winner = None
        self._pot = 2 * self._bet_amount  # blinds
        self._history = ["Blinds posted. Hand begins."]
        self._current_player = self.players[1]  # big blind acts first preflop

    def current_player(self) -> str:
        return self._current_player

    def observation(self, player_id: str) -> Mapping[str, object]:
        legal_moves = list(self.legal_actions(player_id))
        observation = {
            "text": self._render_text(player_id, legal_moves),
            "stage": self._stage,
            "pot": self._pot,
            "board": [card for card in self._board],
            "hand": [card for card in self._player_states[player_id].hand],
            "legal_moves": legal_moves,
            "awaiting_call": self._awaiting_call,
            "history": list(self._history),
            "is_terminal": self._terminal,
        }
        return observation

    def legal_actions(self, player_id: str) -> Sequence[str]:
        if self._terminal or self._player_states[player_id].folded:
            return []
        if player_id != self._current_player:
            return []
        return legal_moves_for_stage(self._stage, awaiting_call=self._awaiting_call)

    def apply(self, player_id: str, command: str) -> TurnUpdate:
        if self._terminal:
            return TurnUpdate(
                observation=self.observation(player_id),
                reward=0.0,
                done=True,
                info={"reason": "hand_already_finished"},
            )

        if player_id != self._current_player:
            return TurnUpdate(
                observation=self.observation(player_id),
                reward=self._invalid_penalty,
                done=False,
                info={
                    "invalid": True,
                    "reason": "out_of_turn",
                    "legal_moves": list(self.legal_actions(self._current_player)),
                },
            )

        state = self._player_states[player_id]
        starting_score = self._scores[player_id]
        normalized = command.strip().lower()
        legal_moves = set(self.legal_actions(player_id))
        info: Dict[str, object] = {"stage": self._stage, "pot": self._pot}

        if normalized not in legal_moves:
            self._scores[player_id] += self._invalid_penalty
            info.update(
                {
                    "invalid": True,
                    "reason": "illegal_command",
                    "legal_moves": sorted(legal_moves),
                }
            )
            self._history.append(f"{player_id} submitted an invalid action: {command}.")
            reward = self._scores[player_id] - starting_score
            return TurnUpdate(
                observation=self.observation(player_id),
                reward=reward,
                done=self._terminal,
                info=info,
            )

        if normalized == "fold":
            state.folded = True
            self._scores[player_id] += self._fold_penalty
            opponent = self._opponent(player_id)
            self._scores[opponent] += self._win_reward
            self._winner = opponent
            self._terminal = True
            self._history.append(f"{player_id} folds. {opponent} wins the pot.")
        elif normalized == "bet":
            self._pot += self._bet_amount
            self._stage_actions[player_id] = "bet"
            self._awaiting_call = True
            self._aggressor = player_id
            self._history.append(f"{player_id} bets one unit.")
            self._current_player = self._opponent(player_id)
        elif normalized == "call":
            self._pot += self._bet_amount
            self._stage_actions[player_id] = "call"
            self._history.append(f"{player_id} calls.")
            self._awaiting_call = False
            self._aggressor = None
            self._advance_stage()
        else:  # check
            self._stage_actions[player_id] = "check"
            self._history.append(f"{player_id} checks.")
            if len(self._stage_actions) == len(self.players):
                self._advance_stage()
            else:
                self._current_player = self._opponent(player_id)

        reward = self._scores[player_id] - starting_score
        observation = self.observation(player_id)
        return TurnUpdate(
            observation=observation,
            reward=reward,
            done=self._terminal,
            info={**info, "action": normalized, "winner": self._winner},
        )

    def is_terminal(self) -> bool:
        return self._terminal

    def final_scores(self) -> Mapping[str, float]:
        return dict(self._scores)

    def status(self) -> Mapping[str, object]:
        return {
            "stage": self._stage,
            "board": [card for card in self._board],
            "pot": self._pot,
            "winner": self._winner,
            "history": list(self._history),
            "terminal": self._terminal,
        }

    def _advance_stage(self) -> None:
        if self._terminal:
            return

        self._stage_actions.clear()
        if self._stage == "preflop":
            self._board = self._board_plan[:3]
            self._stage = "flop"
            self._history.append("Flop revealed.")
        elif self._stage == "flop":
            self._board = self._board_plan[:4]
            self._stage = "turn"
            self._history.append("Turn card revealed.")
        elif self._stage == "turn":
            self._board = self._board_plan[:5]
            self._stage = "river"
            self._history.append("River card revealed.")
        elif self._stage == "river":
            self._stage = "showdown"
            self._resolve_showdown()
            return
        elif self._stage == "showdown":
            return

        self._current_player = self._first_actor_for_stage(self._stage)

    def _resolve_showdown(self) -> None:
        if self._terminal:
            return

        active_players = [player for player in self.players if not self._player_states[player].folded]
        if len(active_players) == 1:
            winner = active_players[0]
            self._scores[winner] += self._win_reward
            self._winner = winner
            self._terminal = True
            self._history.append(f"Showdown skipped: {winner} wins by default.")
            return

        cards = {player: self._player_states[player].hand + self._board for player in self.players}
        ranks = {player: best_hand_rank(cards[player]) for player in self.players}
        player_values = list(ranks.items())
        player_values.sort(key=lambda item: item[1], reverse=True)
        top_rank = player_values[0][1]
        winners = [player for player, rank in player_values if rank == top_rank]

        if len(winners) == 1:
            winner = winners[0]
            loser = self._opponent(winner)
            self._scores[winner] += self._win_reward
            self._scores[loser] += self._loss_penalty
            self._winner = winner
            self._history.append(f"Showdown: {winner} wins the hand.")
        else:
            for player in winners:
                self._scores[player] += self._split_reward
            self._winner = None
            self._history.append("Showdown: split pot.")

        self._terminal = True

    def _first_actor_for_stage(self, stage: str) -> str:
        if stage == "preflop":
            return self.players[1]
        return self.players[self._button_index]

    def _opponent(self, player_id: str) -> str:
        return self.players[1] if player_id == self.players[0] else self.players[0]

    def _render_text(self, player_id: str, legal_moves: Sequence[str]) -> str:
        state = self._player_states[player_id]
        opponent = self._opponent(player_id)
        opponent_hand = format_cards(self._player_states[opponent].hand) if self._terminal else "hidden"
        lines = [
            "Heads-Up Poker Match",
            f"Stage: {stage_label(self._stage)}",
            f"Pot: {self._pot}",
            f"Board: {format_cards(self._board)}",
            f"Your hand: {format_cards(state.hand)}",
            f"Opponent hand: {opponent_hand}",
            f"Legal moves: {', '.join(legal_moves) or 'none'}",
        ]
        return "\n".join(lines)


__all__ = ["HeadsUpPokerGame"]
