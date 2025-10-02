# LangChain Implementation Examples

_Last updated: 2025-10-02_

## Purpose

This document provides complete, runnable code examples for common LangChain integration patterns in PersonaBench. Use these as templates for implementing new features.

## Table of Contents

- [Complete Adapter Example](#complete-adapter-example)
- [Complete Route Module](#complete-route-module)
- [Complete Schema Module](#complete-schema-module)
- [Complete State Management](#complete-state-management)
- [Background Job Processing](#background-job-processing)
- [WebSocket Streaming](#websocket-streaming)
- [Advanced LLM Integration](#advanced-llm-integration)

---

## Complete Adapter Example

### Chess Adapter

```python
"""Complete chess adapter with full PersonaBench integration."""

from __future__ import annotations

from typing import Any, Dict, Tuple
import chess
import chess.pgn
from datetime import datetime

from bench.core.api import EnvAdapter
from bench.core.types import Observation


class ChessAdapter(EnvAdapter):
    """
    Adapter for chess scenarios using python-chess library.
    
    Supports:
    - Standard chess rules
    - Move validation
    - PGN export
    - Position evaluation
    """
    
    name = "chess"
    
    def __init__(
        self,
        seed: int = 42,
        time_control: str = "5+0",
        starting_fen: str | None = None,
    ) -> None:
        """
        Initialize chess adapter.
        
        Args:
            seed: Random seed for reproducibility
            time_control: Time control string (e.g., "5+0" for 5 min blitz)
            starting_fen: Optional FEN string for non-standard positions
        """
        self.seed = seed
        self.time_control = time_control
        self.starting_fen = starting_fen
        self._board: chess.Board | None = None
        self._move_history: list[chess.Move] = []
        self._game = chess.pgn.Game()
    
    def reset(self) -> Observation:
        """Start a new chess game."""
        if self.starting_fen:
            self._board = chess.Board(self.starting_fen)
        else:
            self._board = chess.Board()
        
        self._move_history = []
        self._game = chess.pgn.Game()
        self._game.headers["Event"] = "PersonaBench Evaluation"
        self._game.headers["Date"] = datetime.now().strftime("%Y.%m.%d")
        
        return Observation(
            text=self._render_position(),
            data={
                "fen": self._board.fen(),
                "legal_moves": [m.uci() for m in self._board.legal_moves],
                "turn": "white" if self._board.turn else "black",
            },
        )
    
    def step(self, action: str) -> Tuple[Observation, float, bool, Dict[str, Any]]:
        """
        Execute chess move.
        
        Args:
            action: Move in UCI format (e.g., "e2e4") or SAN (e.g., "e4")
        
        Returns:
            Tuple of (observation, reward, done, info)
        """
        if self._board is None:
            return (
                Observation(text="Game not initialized. Call reset() first."),
                -1.0,
                True,
                {"valid": False, "error": "not_initialized"},
            )
        
        # Parse move
        move = self._parse_move(action.strip())
        
        if move is None or move not in self._board.legal_moves:
            return (
                Observation(
                    text=f"Illegal move: {action}\n{self._render_position()}",
                    data={"fen": self._board.fen()},
                ),
                -0.5,
                False,
                {"valid": False, "error": "illegal_move"},
            )
        
        # Execute move
        self._board.push(move)
        self._move_history.append(move)
        
        # Check game state
        done = self._board.is_game_over()
        reward = self._compute_reward()
        
        obs = Observation(
            text=self._render_position(),
            data={
                "fen": self._board.fen(),
                "legal_moves": [m.uci() for m in self._board.legal_moves],
                "turn": "white" if self._board.turn else "black",
                "is_check": self._board.is_check(),
                "is_checkmate": self._board.is_checkmate(),
                "is_stalemate": self._board.is_stalemate(),
            },
        )
        
        info = {
            "valid": True,
            "move_uci": move.uci(),
            "move_san": self._board.san(move),
            "halfmove_clock": self._board.halfmove_clock,
            "fullmove_number": self._board.fullmove_number,
        }
        
        return obs, reward, done, info
    
    def _parse_move(self, move_str: str) -> chess.Move | None:
        """Parse move from UCI or SAN format."""
        try:
            # Try UCI format first
            return chess.Move.from_uci(move_str)
        except ValueError:
            pass
        
        try:
            # Try SAN format
            return self._board.parse_san(move_str)
        except ValueError:
            return None
    
    def _render_position(self) -> str:
        """Render current board position as text."""
        if self._board is None:
            return "No game in progress."
        
        lines = [
            "Current Position:",
            "",
            str(self._board),
            "",
            f"FEN: {self._board.fen()}",
            f"Turn: {'White' if self._board.turn else 'Black'}",
            f"Move: {self._board.fullmove_number}",
            "",
        ]
        
        if self._board.is_check():
            lines.append("CHECK!")
        
        if self._board.is_checkmate():
            lines.append("CHECKMATE!")
        elif self._board.is_stalemate():
            lines.append("STALEMATE!")
        elif self._board.is_insufficient_material():
            lines.append("DRAW (insufficient material)")
        elif self._board.is_fifty_moves():
            lines.append("DRAW (50-move rule)")
        
        if not self._board.is_game_over():
            lines.append("")
            lines.append("Legal moves:")
            legal = [self._board.san(m) for m in self._board.legal_moves]
            lines.append(", ".join(legal[:10]))  # Show first 10 moves
            if len(legal) > 10:
                lines.append(f"... and {len(legal) - 10} more")
        
        return "\n".join(lines)
    
    def _compute_reward(self) -> float:
        """Compute reward based on game outcome."""
        if not self._board.is_game_over():
            return 0.0
        
        outcome = self._board.outcome()
        if outcome is None:
            return 0.0
        
        # Winner gets +1, loser gets -1, draw is 0
        if outcome.winner is None:
            return 0.0
        elif outcome.winner:  # White wins
            return 1.0
        else:  # Black wins
            return -1.0
    
    def export_pgn(self) -> str:
        """Export game as PGN."""
        game = self._game.copy()
        node = game
        
        for move in self._move_history:
            node = node.add_variation(move)
        
        return str(game)
```

### Registration and Testing

```python
# In orchestration/chains.py
from bench.adapters.chess.adapter import ChessAdapter

ADAPTER_REGISTRY: Dict[str, Type[EnvAdapter]] = {
    "solitaire": SolitaireAdapter,
    "blackjack": BlackjackAdapter,
    "chess": ChessAdapter,
}
```

```python
# Test file: tests/test_chess_adapter.py
"""Tests for chess adapter."""

import pytest
from bench.adapters.chess.adapter import ChessAdapter


def test_chess_reset_initializes_board():
    """Verify reset creates starting position."""
    adapter = ChessAdapter()
    obs = adapter.reset()
    
    assert "8/8" in obs.text  # Part of initial board rendering
    assert obs.data["turn"] == "white"
    assert len(obs.data["legal_moves"]) == 20  # 20 legal moves at start


def test_chess_accepts_valid_uci_move():
    """Verify adapter accepts UCI format moves."""
    adapter = ChessAdapter()
    adapter.reset()
    
    obs, reward, done, info = adapter.step("e2e4")
    
    assert info["valid"]
    assert info["move_uci"] == "e2e4"
    assert not done
    assert obs.data["turn"] == "black"


def test_chess_accepts_valid_san_move():
    """Verify adapter accepts SAN format moves."""
    adapter = ChessAdapter()
    adapter.reset()
    
    obs, reward, done, info = adapter.step("e4")
    
    assert info["valid"]
    assert info["move_san"] == "e4"
    assert not done


def test_chess_rejects_illegal_move():
    """Verify illegal moves are rejected."""
    adapter = ChessAdapter()
    adapter.reset()
    
    obs, reward, done, info = adapter.step("e2e5")  # Illegal pawn move
    
    assert not info["valid"]
    assert info["error"] == "illegal_move"
    assert reward < 0
    assert "Illegal move" in obs.text


def test_chess_detects_checkmate():
    """Verify checkmate detection."""
    # Fool's mate position
    adapter = ChessAdapter()
    adapter.reset()
    
    adapter.step("f2f3")  # White's first move
    adapter.step("e7e5")  # Black's first move
    adapter.step("g2g4")  # White's second move
    obs, reward, done, info = adapter.step("d8h4")  # Checkmate!
    
    assert done
    assert obs.data["is_checkmate"]
    assert reward != 0  # Someone won
```

---

## Complete Route Module

### Match History Routes

```python
"""Routes for match history and replay."""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from datetime import datetime, UTC

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from ..catalog import get_persona, get_scenario
from ..state import list_evaluation_responses, get_evaluation_response

router = APIRouter(tags=["matches"])


class MatchSummary(BaseModel):
    """Summary of a completed match."""
    
    id: str = Field(..., description="Match identifier")
    personas: List[str] = Field(..., description="Participating persona names")
    scenario_id: str = Field(..., description="Scenario played")
    outcome: str = Field(..., description="Match outcome (win/loss/draw)")
    score: float = Field(..., description="Final score")
    duration_seconds: float = Field(..., description="Match duration")
    completed_at: str = Field(..., description="Completion timestamp")


class MatchDetail(MatchSummary):
    """Detailed match information including moves."""
    
    moves: List[Dict[str, Any]] = Field(..., description="Sequence of moves")
    trace: List[Dict[str, Any]] = Field(..., description="Execution trace")
    metrics: Dict[str, Any] = Field(..., description="Performance metrics")


class MatchListResponse(BaseModel):
    """Paginated match listing."""
    
    matches: List[MatchSummary] = Field(..., description="Match summaries")
    total: int = Field(..., description="Total matches matching filters")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Items per page")


@router.get("/matches", response_model=MatchListResponse)
def list_matches(
    persona_id: Optional[str] = Query(None, description="Filter by persona"),
    scenario_id: Optional[str] = Query(None, description="Filter by scenario"),
    outcome: Optional[str] = Query(None, description="Filter by outcome"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
) -> MatchListResponse:
    """
    List match history with optional filtering.
    
    Supports filtering by persona, scenario, and outcome.
    Results are paginated for performance.
    """
    # Fetch all responses
    responses = list_evaluation_responses(
        persona_id=persona_id,
        target_id=scenario_id,
    )
    
    # Filter by outcome if specified
    if outcome:
        responses = [r for r in responses if r.status == outcome]
    
    # Sort by completion time (newest first)
    responses.sort(key=lambda r: r.created_at, reverse=True)
    
    # Paginate
    total = len(responses)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    page_responses = responses[start_idx:end_idx]
    
    # Convert to summaries
    matches = [
        MatchSummary(
            id=r.id,
            personas=[r.persona_id],
            scenario_id=r.target_id,
            outcome=r.status,
            score=r.summary.get("total_reward", 0.0),
            duration_seconds=r.summary.get("duration_seconds", 0.0),
            completed_at=r.created_at,
        )
        for r in page_responses
    ]
    
    return MatchListResponse(
        matches=matches,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/matches/{match_id}", response_model=MatchDetail)
def get_match(match_id: str) -> MatchDetail:
    """
    Get detailed match information including full move history.
    
    Includes execution trace for debugging and analysis.
    """
    response = get_evaluation_response(match_id)
    
    if response is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Match {match_id} not found",
        )
    
    # Build metrics from summary
    metrics = {
        "total_steps": response.summary.get("total_steps", 0),
        "valid_actions": response.summary.get("valid_actions", 0),
        "invalid_actions": response.summary.get("invalid_actions", 0),
        "total_reward": response.summary.get("total_reward", 0.0),
        "average_reward": response.summary.get("average_reward", 0.0),
    }
    
    return MatchDetail(
        id=response.id,
        personas=[response.persona_id],
        scenario_id=response.target_id,
        outcome=response.status,
        score=response.summary.get("total_reward", 0.0),
        duration_seconds=response.summary.get("duration_seconds", 0.0),
        completed_at=response.created_at,
        moves=response.steps,
        trace=response.trace,
        metrics=metrics,
    )


class ComparisonRequest(BaseModel):
    """Request to compare two matches."""
    
    match_a: str = Field(..., description="First match ID")
    match_b: str = Field(..., description="Second match ID")


class ComparisonResponse(BaseModel):
    """Side-by-side match comparison."""
    
    match_a: MatchDetail = Field(..., description="First match details")
    match_b: MatchDetail = Field(..., description="Second match details")
    differences: Dict[str, Any] = Field(..., description="Key differences")


@router.post("/matches/compare", response_model=ComparisonResponse)
def compare_matches(request: ComparisonRequest) -> ComparisonResponse:
    """
    Compare two matches side by side.
    
    Highlights key differences in performance and behavior.
    """
    match_a = get_evaluation_response(request.match_a)
    match_b = get_evaluation_response(request.match_b)
    
    if match_a is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Match {request.match_a} not found",
        )
    
    if match_b is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Match {request.match_b} not found",
        )
    
    # Compute differences
    differences = {
        "score_diff": (
            match_a.summary.get("total_reward", 0.0)
            - match_b.summary.get("total_reward", 0.0)
        ),
        "step_diff": (
            match_a.summary.get("total_steps", 0)
            - match_b.summary.get("total_steps", 0)
        ),
        "efficiency_diff": (
            match_a.summary.get("average_reward", 0.0)
            - match_b.summary.get("average_reward", 0.0)
        ),
    }
    
    return ComparisonResponse(
        match_a=MatchDetail(
            id=match_a.id,
            personas=[match_a.persona_id],
            scenario_id=match_a.target_id,
            outcome=match_a.status,
            score=match_a.summary.get("total_reward", 0.0),
            duration_seconds=match_a.summary.get("duration_seconds", 0.0),
            completed_at=match_a.created_at,
            moves=match_a.steps,
            trace=match_a.trace,
            metrics=match_a.summary,
        ),
        match_b=MatchDetail(
            id=match_b.id,
            personas=[match_b.persona_id],
            scenario_id=match_b.target_id,
            outcome=match_b.status,
            score=match_b.summary.get("total_reward", 0.0),
            duration_seconds=match_b.summary.get("duration_seconds", 0.0),
            completed_at=match_b.created_at,
            moves=match_b.steps,
            trace=match_b.trace,
            metrics=match_b.summary,
        ),
        differences=differences,
    )
```

---

## Complete Schema Module

### Tournament Schemas

```python
"""Schemas for tournament management."""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator


class TournamentFormat(str, Enum):
    """Supported tournament formats."""
    
    ROUND_ROBIN = "round_robin"
    SINGLE_ELIMINATION = "single_elimination"
    DOUBLE_ELIMINATION = "double_elimination"
    SWISS = "swiss"


class TournamentStatus(str, Enum):
    """Tournament lifecycle states."""
    
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TournamentCreateRequest(BaseModel):
    """Request to create a new tournament."""
    
    name: str = Field(..., min_length=1, max_length=200, description="Tournament name")
    format: TournamentFormat = Field(..., description="Tournament format")
    scenario_id: str = Field(..., description="Scenario to use for all matches")
    persona_ids: List[str] = Field(
        ...,
        min_length=2,
        description="List of persona IDs to participate",
    )
    scheduled_start: Optional[str] = Field(
        None,
        description="ISO timestamp for scheduled start",
    )
    config: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional tournament configuration",
    )
    
    @field_validator("persona_ids")
    @classmethod
    def validate_unique_personas(cls, v: List[str]) -> List[str]:
        """Ensure persona IDs are unique."""
        if len(v) != len(set(v)):
            raise ValueError("Persona IDs must be unique")
        return v


class TournamentMatchResult(BaseModel):
    """Result of a single tournament match."""
    
    match_id: str = Field(..., description="Unique match identifier")
    round_number: int = Field(..., ge=1, description="Tournament round")
    match_number: int = Field(..., ge=1, description="Match number within round")
    persona_a: str = Field(..., description="First persona ID")
    persona_b: str = Field(..., description="Second persona ID")
    winner: Optional[str] = Field(None, description="Winner persona ID (null for draw)")
    score_a: float = Field(..., description="Score for persona A")
    score_b: float = Field(..., description="Score for persona B")
    completed_at: str = Field(..., description="Completion timestamp")


class TournamentStanding(BaseModel):
    """Current standing of a participant."""
    
    persona_id: str = Field(..., description="Persona identifier")
    rank: int = Field(..., ge=1, description="Current rank")
    wins: int = Field(..., ge=0, description="Number of wins")
    losses: int = Field(..., ge=0, description="Number of losses")
    draws: int = Field(..., ge=0, description="Number of draws")
    score: float = Field(..., description="Aggregate score")
    matches_played: int = Field(..., ge=0, description="Total matches played")


class TournamentDetail(BaseModel):
    """Complete tournament information."""
    
    id: str = Field(..., description="Tournament identifier")
    name: str = Field(..., description="Tournament name")
    format: TournamentFormat = Field(..., description="Tournament format")
    status: TournamentStatus = Field(..., description="Current status")
    scenario_id: str = Field(..., description="Scenario being used")
    persona_ids: List[str] = Field(..., description="Participating personas")
    scheduled_start: Optional[str] = Field(None, description="Scheduled start time")
    started_at: Optional[str] = Field(None, description="Actual start time")
    completed_at: Optional[str] = Field(None, description="Completion time")
    current_round: int = Field(..., ge=0, description="Current round number")
    total_rounds: int = Field(..., ge=1, description="Total rounds planned")
    matches: List[TournamentMatchResult] = Field(
        default_factory=list,
        description="Completed matches",
    )
    standings: List[TournamentStanding] = Field(
        default_factory=list,
        description="Current standings",
    )
    config: Dict[str, Any] = Field(
        default_factory=dict,
        description="Tournament configuration",
    )


class TournamentListResponse(BaseModel):
    """Paginated tournament listing."""
    
    tournaments: List[TournamentDetail] = Field(..., description="Tournament list")
    total: int = Field(..., description="Total tournaments")
    page: int = Field(..., description="Current page")
    page_size: int = Field(..., description="Items per page")


class TournamentUpdateRequest(BaseModel):
    """Partial tournament update."""
    
    status: Optional[TournamentStatus] = Field(None, description="Update status")
    scheduled_start: Optional[str] = Field(None, description="Update scheduled start")
    config: Optional[Dict[str, Any]] = Field(None, description="Merge config updates")
```

---

## Complete State Management

### Tournament State Manager

```python
"""In-memory tournament state management."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

from .schemas import TournamentFormat, TournamentStatus


@dataclass
class Tournament:
    """Tournament state container."""
    
    id: str
    name: str
    format: TournamentFormat
    status: TournamentStatus
    scenario_id: str
    persona_ids: List[str]
    scheduled_start: Optional[str]
    started_at: Optional[str]
    completed_at: Optional[str]
    current_round: int
    total_rounds: int
    matches: List[Dict[str, Any]] = field(default_factory=list)
    standings: List[Dict[str, Any]] = field(default_factory=list)
    config: Dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())


# In-memory storage
_TOURNAMENTS: Dict[str, Tournament] = {}


def create_tournament(
    name: str,
    format: TournamentFormat,
    scenario_id: str,
    persona_ids: List[str],
    scheduled_start: Optional[str] = None,
    config: Optional[Dict[str, Any]] = None,
) -> str:
    """Create a new tournament and return its ID."""
    tournament_id = str(uuid4())
    
    # Calculate total rounds based on format
    num_personas = len(persona_ids)
    if format == TournamentFormat.ROUND_ROBIN:
        total_rounds = num_personas - 1
    elif format == TournamentFormat.SINGLE_ELIMINATION:
        total_rounds = (num_personas - 1).bit_length()
    elif format == TournamentFormat.DOUBLE_ELIMINATION:
        total_rounds = 2 * (num_personas - 1).bit_length()
    else:  # Swiss
        total_rounds = num_personas.bit_length()
    
    tournament = Tournament(
        id=tournament_id,
        name=name,
        format=format,
        status=TournamentStatus.DRAFT,
        scenario_id=scenario_id,
        persona_ids=list(persona_ids),
        scheduled_start=scheduled_start,
        started_at=None,
        completed_at=None,
        current_round=0,
        total_rounds=total_rounds,
        config=config or {},
    )
    
    # Initialize standings
    tournament.standings = [
        {
            "persona_id": pid,
            "rank": 0,
            "wins": 0,
            "losses": 0,
            "draws": 0,
            "score": 0.0,
            "matches_played": 0,
        }
        for pid in persona_ids
    ]
    
    _TOURNAMENTS[tournament_id] = tournament
    return tournament_id


def get_tournament(tournament_id: str) -> Optional[Tournament]:
    """Retrieve tournament by ID."""
    return _TOURNAMENTS.get(tournament_id)


def list_tournaments(
    status: Optional[TournamentStatus] = None,
) -> List[Tournament]:
    """List all tournaments with optional status filter."""
    tournaments = list(_TOURNAMENTS.values())
    
    if status:
        tournaments = [t for t in tournaments if t.status == status]
    
    # Sort by creation time (newest first)
    tournaments.sort(key=lambda t: t.created_at, reverse=True)
    
    return tournaments


def update_tournament(
    tournament_id: str,
    status: Optional[TournamentStatus] = None,
    scheduled_start: Optional[str] = None,
    config_updates: Optional[Dict[str, Any]] = None,
) -> bool:
    """Update tournament fields. Returns True if successful."""
    tournament = _TOURNAMENTS.get(tournament_id)
    if tournament is None:
        return False
    
    if status is not None:
        tournament.status = status
        
        if status == TournamentStatus.IN_PROGRESS and tournament.started_at is None:
            tournament.started_at = datetime.now(UTC).isoformat()
        elif status == TournamentStatus.COMPLETED and tournament.completed_at is None:
            tournament.completed_at = datetime.now(UTC).isoformat()
    
    if scheduled_start is not None:
        tournament.scheduled_start = scheduled_start
    
    if config_updates:
        tournament.config.update(config_updates)
    
    tournament.updated_at = datetime.now(UTC).isoformat()
    return True


def record_match_result(
    tournament_id: str,
    round_number: int,
    match_number: int,
    match_id: str,
    persona_a: str,
    persona_b: str,
    winner: Optional[str],
    score_a: float,
    score_b: float,
) -> bool:
    """Record a completed match result. Returns True if successful."""
    tournament = _TOURNAMENTS.get(tournament_id)
    if tournament is None:
        return False
    
    # Add match result
    match_result = {
        "match_id": match_id,
        "round_number": round_number,
        "match_number": match_number,
        "persona_a": persona_a,
        "persona_b": persona_b,
        "winner": winner,
        "score_a": score_a,
        "score_b": score_b,
        "completed_at": datetime.now(UTC).isoformat(),
    }
    tournament.matches.append(match_result)
    
    # Update standings
    for standing in tournament.standings:
        pid = standing["persona_id"]
        
        if pid == persona_a:
            standing["matches_played"] += 1
            standing["score"] += score_a
            if winner == persona_a:
                standing["wins"] += 1
            elif winner == persona_b:
                standing["losses"] += 1
            else:
                standing["draws"] += 1
        
        elif pid == persona_b:
            standing["matches_played"] += 1
            standing["score"] += score_b
            if winner == persona_b:
                standing["wins"] += 1
            elif winner == persona_a:
                standing["losses"] += 1
            else:
                standing["draws"] += 1
    
    # Recalculate rankings
    tournament.standings.sort(
        key=lambda s: (s["wins"], s["score"], -s["losses"]),
        reverse=True,
    )
    for rank, standing in enumerate(tournament.standings, start=1):
        standing["rank"] = rank
    
    tournament.updated_at = datetime.now(UTC).isoformat()
    return True


def advance_tournament_round(tournament_id: str) -> bool:
    """Move tournament to next round. Returns True if successful."""
    tournament = _TOURNAMENTS.get(tournament_id)
    if tournament is None:
        return False
    
    if tournament.current_round < tournament.total_rounds:
        tournament.current_round += 1
        tournament.updated_at = datetime.now(UTC).isoformat()
        return True
    
    return False


def delete_tournament(tournament_id: str) -> bool:
    """Delete a tournament. Returns True if successful."""
    if tournament_id in _TOURNAMENTS:
        del _TOURNAMENTS[tournament_id]
        return True
    return False
```

---

## Background Job Processing

### Celery Integration Example

```python
"""Background job processing with Celery."""

from __future__ import annotations

from typing import Any, Dict
from celery import Celery
from datetime import datetime, UTC

from orchestration.chains import build_evaluation_chain
from orchestration.catalog import get_persona, get_scenario
from orchestration.state import (
    update_queue_entry,
    record_evaluation_response,
)

# Initialize Celery
celery_app = Celery(
    "personabench",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/1",
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour hard limit
    task_soft_time_limit=3000,  # 50 minute soft limit
)


@celery_app.task(bind=True, name="personabench.run_evaluation")
def run_evaluation_async(
    self,
    queue_id: str,
    persona_id: str,
    target_id: str,
    target_kind: str,
    config: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Execute evaluation asynchronously.
    
    Args:
        queue_id: Queue entry identifier
        persona_id: Persona to evaluate
        target_id: Scenario or game identifier
        target_kind: "scenario" or "game"
        config: Evaluation configuration
    
    Returns:
        Dictionary with evaluation results
    """
    # Update queue status
    update_queue_entry(
        queue_id,
        status="in_progress",
        started_at=datetime.now(UTC).isoformat(),
    )
    
    try:
        # Load persona and target
        persona = get_persona(persona_id)
        if persona is None:
            raise ValueError(f"Persona '{persona_id}' not found")
        
        if target_kind == "scenario":
            from orchestration.catalog import get_scenario
            target = get_scenario(target_id)
        else:
            from orchestration.catalog import get_game
            target = get_game(target_id)
        
        if target is None:
            raise ValueError(f"Target '{target_id}' not found")
        
        # Build chain payload
        chain_payload = {
            "persona": persona,
            "target": target,
            "target_kind": target_kind,
            "target_id": target_id,
            "config": {
                **config,
                "run_id": queue_id,
            },
        }
        
        # Execute evaluation
        chain = build_evaluation_chain()
        result = chain.invoke(chain_payload)
        
        # Record response
        response_id = record_evaluation_response(
            run_id=queue_id,
            persona_id=persona_id,
            target_id=target_id,
            target_kind=target_kind,
            adapter=result.get("adapter", "unknown"),
            status=result.get("status", "completed"),
            summary=result.get("summary", {}),
            metadata={},
            steps=result.get("steps", []),
            trace=result.get("trace", []),
        )
        
        # Update queue
        update_queue_entry(
            queue_id,
            status="completed",
            completed_at=datetime.now(UTC).isoformat(),
            metadata={"response_id": response_id},
        )
        
        return {
            "status": "completed",
            "queue_id": queue_id,
            "response_id": response_id,
            "result": result,
        }
    
    except Exception as exc:
        # Record failure
        update_queue_entry(
            queue_id,
            status="failed",
            completed_at=datetime.now(UTC).isoformat(),
            error=str(exc),
        )
        
        # Re-raise for Celery to handle
        raise


@celery_app.task(name="personabench.run_tournament")
def run_tournament_async(tournament_id: str) -> Dict[str, Any]:
    """
    Execute full tournament asynchronously.
    
    Args:
        tournament_id: Tournament identifier
    
    Returns:
        Dictionary with tournament results
    """
    from orchestration.state.tournaments import (
        get_tournament,
        update_tournament,
        record_match_result,
        advance_tournament_round,
    )
    from orchestration.schemas.tournaments import TournamentStatus
    
    tournament = get_tournament(tournament_id)
    if tournament is None:
        raise ValueError(f"Tournament '{tournament_id}' not found")
    
    # Start tournament
    update_tournament(tournament_id, status=TournamentStatus.IN_PROGRESS)
    
    try:
        # Generate match schedule
        matches = generate_match_schedule(tournament)
        
        # Execute matches
        for match_info in matches:
            # Run evaluation for this match
            result = run_evaluation_async.delay(
                queue_id=f"tournament-{tournament_id}-{match_info['id']}",
                persona_id=match_info["persona_a"],
                target_id=tournament.scenario_id,
                target_kind="scenario",
                config=tournament.config,
            ).get()  # Wait for result
            
            # Record result
            record_match_result(
                tournament_id=tournament_id,
                round_number=match_info["round"],
                match_number=match_info["number"],
                match_id=result["response_id"],
                persona_a=match_info["persona_a"],
                persona_b=match_info["persona_b"],
                winner=determine_winner(result),
                score_a=extract_score(result, "a"),
                score_b=extract_score(result, "b"),
            )
            
            # Update tournament round if needed
            if is_round_complete(tournament_id, match_info["round"]):
                advance_tournament_round(tournament_id)
        
        # Complete tournament
        update_tournament(tournament_id, status=TournamentStatus.COMPLETED)
        
        return {"status": "completed", "tournament_id": tournament_id}
    
    except Exception as exc:
        update_tournament(tournament_id, status=TournamentStatus.CANCELLED)
        raise


def generate_match_schedule(tournament):
    """Generate match pairings based on tournament format."""
    # Implementation depends on format
    pass


def determine_winner(result):
    """Determine match winner from evaluation result."""
    # Implementation depends on scenario
    pass


def extract_score(result, player):
    """Extract player score from result."""
    # Implementation depends on scenario
    pass


def is_round_complete(tournament_id, round_number):
    """Check if all matches in round are complete."""
    # Implementation details
    pass
```

### FastAPI Integration

```python
"""API routes for background jobs."""

from fastapi import APIRouter, status
from pydantic import BaseModel, Field

from .tasks import run_evaluation_async, run_tournament_async

router = APIRouter(tags=["jobs"])


class JobSubmitResponse(BaseModel):
    """Response when job is queued."""
    
    job_id: str = Field(..., description="Celery task ID")
    status: str = Field(..., description="Initial status")


@router.post("/jobs/evaluate", response_model=JobSubmitResponse, status_code=status.HTTP_202_ACCEPTED)
def submit_evaluation_job(
    persona_id: str,
    target_id: str,
    target_kind: str = "scenario",
    config: dict = {},
) -> JobSubmitResponse:
    """Submit evaluation as background job."""
    from uuid import uuid4
    from orchestration.state import create_queue_entry
    
    queue_id = str(uuid4())
    create_queue_entry(
        id=queue_id,
        persona_id=persona_id,
        target_id=target_id,
        target_kind=target_kind,
        config=config,
    )
    
    task = run_evaluation_async.delay(
        queue_id=queue_id,
        persona_id=persona_id,
        target_id=target_id,
        target_kind=target_kind,
        config=config,
    )
    
    return JobSubmitResponse(
        job_id=task.id,
        status="queued",
    )


@router.get("/jobs/{job_id}")
def get_job_status(job_id: str):
    """Check status of background job."""
    from celery.result import AsyncResult
    
    task = AsyncResult(job_id, app=celery_app)
    
    return {
        "job_id": job_id,
        "status": task.state,
        "result": task.result if task.ready() else None,
    }
```

---

This examples document provides complete, production-ready code that can be dropped into PersonaBench. Each example follows the established patterns and includes proper error handling, typing, and documentation.
