"""Reaction robustness metrics."""

from __future__ import annotations

from typing import Sequence

from ..metrics import MetricResult


def recovery_time(recovery_steps: Sequence[int]) -> MetricResult:
    """Average steps required to recover after a perturbation."""

    value = sum(recovery_steps) / len(recovery_steps) if recovery_steps else 0.0
    return MetricResult(
        name="recovery_time",
        value=value,
        sample_size=len(recovery_steps),
        breakdown={"mean_recovery_steps": value},
    )


def compute_reaction_metrics(recovered: Sequence[bool], recovery_steps: Sequence[int]) -> Sequence[MetricResult]:
    """Canonical reaction metrics capturing robustness and compliance."""

    value = sum(1 for flag in recovered if flag) / len(recovered) if recovered else 0.0
    success_metric = MetricResult(
        name="reaction_success_rate",
        value=value,
        sample_size=len(recovered),
        breakdown={"successes": float(sum(1 for flag in recovered if flag))},
    )
    return [success_metric, recovery_time(recovery_steps)]


__all__ = ["compute_reaction_metrics", "recovery_time"]
