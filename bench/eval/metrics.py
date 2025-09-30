"""Metric primitives shared across PersonaBench scorers."""

from __future__ import annotations

from dataclasses import dataclass
from math import fsum, sqrt
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


def expected_value(rewards: Sequence[float]) -> MetricResult:
    """Average reward across episodes."""

    total = len(rewards)
    reward_sum = fsum(rewards)
    value = reward_sum / total if total else 0.0
    return MetricResult(
        name="expected_value",
        value=value,
        sample_size=total,
        breakdown={"sum": reward_sum, "mean": value},
    )


def cooperation_rate(decisions: Sequence[bool]) -> MetricResult:
    """Fraction of cooperative actions taken."""

    total = len(decisions)
    cooperative = sum(1 for decision in decisions if decision)
    value = cooperative / total if total else 0.0
    return MetricResult(
        name="cooperation_rate",
        value=value,
        sample_size=total,
        breakdown={"cooperative": float(cooperative)},
    )


def red_flag_rate(flags: Sequence[bool]) -> MetricResult:
    """Rate at which red-flag violations were observed."""

    total = len(flags)
    flagged = sum(1 for flag in flags if flag)
    value = flagged / total if total else 0.0
    return MetricResult(
        name="red_flag_rate",
        value=value,
        sample_size=total,
        breakdown={"flags": float(flagged)},
    )


def volatility_penalty(rewards: Sequence[float]) -> MetricResult:
    """Population standard deviation of rewards, used as a volatility penalty."""

    total = len(rewards)
    if total == 0:
        mean = 0.0
        stdev = 0.0
    else:
        mean = fsum(rewards) / total
        variance = fsum((reward - mean) ** 2 for reward in rewards) / total
        stdev = sqrt(variance)

    return MetricResult(
        name="volatility_penalty",
        value=stdev,
        sample_size=total,
        breakdown={"mean": mean, "stdev": stdev},
    )
