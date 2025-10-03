"""Multi-player blackjack engine compatible with the PersonaBench game master."""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Mapping, MutableMapping, Optional, Sequence

from ...core.game_master import TurnBasedGame, TurnUpdate
from .utils import card_label, create_deck, hand_value


@dataclass
class BlackjackPlayerState:
    """Per-player blackjack state."""

    hand: List[int] = field(default_factory=list)
    done: bool = False
    outcome: Optional[str] = None
    stood: bool = False


class BlackjackGame(TurnBasedGame):
    """Turn-based blackjack with shared dealer and multiple persona players."""

    def __init__(
        self,
        players: Sequence[str] | None = None,
        *,
        seed: int | None = None,
        win_reward: float = 1.0,
        push_reward: float = 0.1,
        lose_penalty: float = -1.0,
        bust_penalty: float = -1.5,
        invalid_penalty: float = -2.0,
    ) -> None:
        self.players: Sequence[str] = tuple(players or ("player_one", "player_two"))
        if not self.players:
            raise ValueError("BlackjackGame requires at least one player")

        self._seed = seed
        self._rng = random.Random(seed)
        self._win_reward = win_reward
        self._push_reward = push_reward
        self._lose_penalty = lose_penalty
        self._bust_penalty = bust_penalty
        self._invalid_penalty = invalid_penalty

        self._scores: MutableMapping[str, float] = {}
        self._player_states: Dict[str, BlackjackPlayerState] = {}
        self._deck: List[int] = []
        self._dealer_hand: List[int] = []
        self._current_index: int = 0
        self._terminal: bool = False
        self._dealer_resolved: bool = False

    def reset(self) -> None:
        self._rng = random.Random(self._seed)
        self._deck = create_deck()
        self._rng.shuffle(self._deck)

        self._scores = {player: 0.0 for player in self.players}
        self._player_states = {}
        for player in self.players:
            hand = [self._deck.pop(), self._deck.pop()]
            self._player_states[player] = BlackjackPlayerState(hand=hand)
        self._dealer_hand = [self._deck.pop(), self._deck.pop()]
        self._current_index = 0
        self._terminal = False
        self._dealer_resolved = False

    def current_player(self) -> str:
        self._ensure_current_index()
        return self.players[self._current_index]

    def observation(self, player_id: str) -> Mapping[str, object]:
        state = self._player_states[player_id]
        reveal_dealer = self._dealer_resolved or self._terminal
        dealer_cards: Iterable[str]
        if reveal_dealer:
            dealer_cards = [card_label(card) for card in self._dealer_hand]
            dealer_total: object = hand_value(self._dealer_hand)
        else:
            dealer_cards = [card_label(self._dealer_hand[0]), "hidden"]
            dealer_total = card_label(self._dealer_hand[0])

        payload = {
            "text": self._render_text(player_id, reveal_dealer=reveal_dealer),
            "hand": list(state.hand),
            "hand_total": hand_value(state.hand),
            "dealer_cards": list(dealer_cards),
            "dealer_total": dealer_total,
            "outcome": state.outcome,
            "is_terminal": self._terminal,
            "legal_moves": list(self.legal_actions(player_id)),
        }
        return payload

    def legal_actions(self, player_id: str) -> Sequence[str]:
        if self._terminal:
            return []
        state = self._player_states[player_id]
        if state.done:
            return []
        return ["hit", "stand"]

    def apply(self, player_id: str, command: str) -> TurnUpdate:
        if self._terminal:
            return TurnUpdate(
                observation=self.observation(player_id),
                reward=0.0,
                done=True,
                info={"reason": "match_already_finished"},
            )

        self._ensure_current_index()
        if player_id != self.players[self._current_index]:
            return TurnUpdate(
                observation=self.observation(player_id),
                reward=self._invalid_penalty,
                done=False,
                info={
                    "invalid": True,
                    "reason": "out_of_turn",
                    "legal_moves": list(self.legal_actions(self.players[self._current_index])),
                },
            )

        state = self._player_states[player_id]
        if state.done:
            return TurnUpdate(
                observation=self.observation(player_id),
                reward=0.0,
                done=self._terminal,
                info={"reason": "player_already_finished"},
            )

        starting_score = self._scores[player_id]
        normalized = command.strip().lower()
        info: Dict[str, object] = {}

        if normalized not in {"hit", "stand"}:
            state.done = True
            state.outcome = "invalid"
            self._scores[player_id] += self._invalid_penalty
            info.update({"invalid": True, "reason": "illegal_command"})
        elif normalized == "hit":
            card = self._deck.pop()
            state.hand.append(card)
            if hand_value(state.hand) > 21:
                state.done = True
                state.outcome = "bust"
                self._scores[player_id] += self._bust_penalty
                info.update({"outcome": "bust", "drawn_card": card_label(card)})
            else:
                info.update({"action": "hit", "drawn_card": card_label(card)})
        else:  # stand
            state.done = True
            state.stood = True
            info.update({"action": "stand"})

        self._maybe_resolve_match()
        reward = self._scores[player_id] - starting_score

        observation = self.observation(player_id)
        return TurnUpdate(
            observation=observation,
            reward=reward,
            done=self._terminal,
            info={**info, "outcome": state.outcome, "scores": dict(self._scores)},
            events=(),
        )

    def is_terminal(self) -> bool:
        return self._terminal

    def final_scores(self) -> Mapping[str, float]:
        return dict(self._scores)

    def status(self) -> Mapping[str, object]:
        return {
            "dealer_hand": [card_label(card) for card in self._dealer_hand],
            "dealer_total": hand_value(self._dealer_hand),
            "player_outcomes": {player: state.outcome for player, state in self._player_states.items()},
            "terminal": self._terminal,
        }

    def _ensure_current_index(self) -> None:
        if self._terminal:
            return
        for offset in range(len(self.players)):
            index = (self._current_index + offset) % len(self.players)
            player = self.players[index]
            if not self._player_states[player].done:
                self._current_index = index
                return
        # All players finished
        self._current_index = 0

    def _maybe_resolve_match(self) -> None:
        if self._terminal:
            return
        if any(not state.done for state in self._player_states.values()):
            self._advance_turn()
            return

        # All players finished their decisions; resolve dealer once.
        if not self._dealer_resolved:
            while hand_value(self._dealer_hand) < 17:
                self._dealer_hand.append(self._deck.pop())
            dealer_total = hand_value(self._dealer_hand)
            dealer_bust = dealer_total > 21
            for player, state in self._player_states.items():
                if state.outcome in {"bust", "invalid"}:
                    continue
                player_total = hand_value(state.hand)
                if dealer_bust or player_total > dealer_total:
                    state.outcome = "win"
                    self._scores[player] += self._win_reward
                elif player_total == dealer_total:
                    state.outcome = "push"
                    self._scores[player] += self._push_reward
                else:
                    state.outcome = "lose"
                    self._scores[player] += self._lose_penalty
            self._dealer_resolved = True

        self._terminal = True

    def _advance_turn(self) -> None:
        self._current_index = (self._current_index + 1) % len(self.players)
        self._ensure_current_index()

    def _render_text(self, player_id: str, *, reveal_dealer: bool) -> str:
        state = self._player_states[player_id]
        player_cards = ", ".join(card_label(card) for card in state.hand)
        player_total = hand_value(state.hand)
        if reveal_dealer:
            dealer = ", ".join(card_label(card) for card in self._dealer_hand)
            dealer_total = hand_value(self._dealer_hand)
        else:
            dealer = f"{card_label(self._dealer_hand[0])}, hidden"
            dealer_total = card_label(self._dealer_hand[0])

        parts = [
            "Blackjack Match",
            f"Your hand: {player_cards} (total {player_total})",
            f"Dealer: {dealer}",
        ]
        if state.outcome:
            parts.append(f"Outcome: {state.outcome}")
        else:
            parts.append(f"Legal moves: {', '.join(self.legal_actions(player_id)) or 'none'}")
        if reveal_dealer:
            parts.append(f"Dealer total: {dealer_total}")
        return "\n".join(parts)


__all__ = ["BlackjackGame"]
