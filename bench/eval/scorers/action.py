"""Action-oriented scoring utilities."""

from __future__ import annotations

from typing import Sequence

from ..metrics import MetricResult, steps_over_optimal, success_rate


def compute_action_metrics(successes: Sequence[bool], steps: Sequence[int], optimal: Sequence[int]) -> Sequence[MetricResult]:
    """Return canonical action metrics for a batch of episodes."""

    return [
        success_rate(successes),
        steps_over_optimal(steps, optimal),
    ]


__all__ = ["compute_action_metrics"]
