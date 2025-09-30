"""Core type definitions for PersonaBench plan → act → react pipelines."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Dict, Iterable, Mapping, Optional, Sequence
def _utcnow() -> datetime:
    return datetime.now(UTC)


@dataclass(frozen=True)
class Observation:
    """Environment observation presented to the persona agent."""

    payload: Mapping[str, Any]
    timestamp: datetime = field(default_factory=_utcnow)


@dataclass(frozen=True)
class Plan:
    """Structured plan a persona agent produces before acting."""

    rationale: str
    steps: Sequence[str]
    metadata: Mapping[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class Action:
    """Concrete action issued to the environment."""

    command: str
    arguments: Mapping[str, Any] = field(default_factory=dict)
    tool_calls: Sequence[Mapping[str, Any]] = field(default_factory=tuple)


@dataclass(frozen=True)
class Reaction:
    """Adjustment produced after observing environment feedback."""

    adjustment: str
    follow_up_plan: Optional[Plan] = None
    metadata: Mapping[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class Event:
    """Auxiliary telemetry captured during rollouts."""

    name: str
    payload: Mapping[str, Any]
    timestamp: datetime = field(default_factory=_utcnow)


@dataclass
class StepResult:
    """Return value from environment adapters after applying an action."""

    observation: Observation
    reward: float
    done: bool
    info: Mapping[str, Any] = field(default_factory=dict)
    events: Iterable[Event] = field(default_factory=tuple)


@dataclass(frozen=True)
class PersonaSignature:
    """Embedding-style signature used to track persona consistency."""

    vector: Sequence[float]
    provenance: Mapping[str, Any]


TraceRecord = Dict[str, Any]
