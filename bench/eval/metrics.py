"""Metric primitives shared across PersonaBench scorers."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Sequence


@dataclass(frozen=True)
class MetricResult:
    """Container for a computed metric and its supporting metadata."""

    name: str
    value: float
    sample_size: int
    breakdown: Mapping[str, float]


def success_rate(outcomes: Sequence[bool]) -> MetricResult:
    """Compute the fraction of successful episodes."""

    successes = sum(1 for outcome in outcomes if outcome)
    total = len(outcomes)
    value = successes / total if total else 0.0
    return MetricResult(
        name="success_rate",
        value=value,
        sample_size=total,
        breakdown={"successes": float(successes)},
    )


def steps_over_optimal(steps: Sequence[int], optimal_steps: Sequence[int]) -> MetricResult:
    """Average number of steps exceeding optimal baselines."""

    if len(steps) != len(optimal_steps):
        raise ValueError("Steps and optimal_steps must be aligned")
    deltas = [max(0, s - o) for s, o in zip(steps, optimal_steps)]
    value = sum(deltas) / len(deltas) if deltas else 0.0
    return MetricResult(
        name="steps_over_optimal",
        value=value,
        sample_size=len(deltas),
        breakdown={"mean_delta": value},
    )


def compliance_rate(violations: Sequence[bool]) -> MetricResult:
    """Rate at which persona constraints are respected."""

    safe = [not v for v in violations]
    base = success_rate(safe)
    return MetricResult(
        name="compliance_rate",
        value=base.value,
        sample_size=base.sample_size,
        breakdown=base.breakdown,
    )
