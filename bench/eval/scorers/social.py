"""Social interaction metrics for PersonaBench personas."""

from __future__ import annotations

from typing import Sequence

from ..metrics import MetricResult


def reciprocity_index(payoffs: Sequence[float], partner_payoffs: Sequence[float]) -> MetricResult:
    """Measure reciprocity via correlation between agent and partner payoffs."""

    if len(payoffs) != len(partner_payoffs):
        raise ValueError("Payoff sequences must be aligned")
    if not payoffs:
        return MetricResult("reciprocity_index", 0.0, 0, {})
    mean_a = sum(payoffs) / len(payoffs)
    mean_b = sum(partner_payoffs) / len(partner_payoffs)
    cov = sum((a - mean_a) * (b - mean_b) for a, b in zip(payoffs, partner_payoffs))
    var_a = sum((a - mean_a) ** 2 for a in payoffs)
    var_b = sum((b - mean_b) ** 2 for b in partner_payoffs)
    if var_a == 0 or var_b == 0:
        value = 0.0
    else:
        value = cov / (var_a ** 0.5 * var_b ** 0.5)
    return MetricResult(
        name="reciprocity_index",
        value=value,
        sample_size=len(payoffs),
        breakdown={"corr": value},
    )


def cooperation_rate(cooperative_episodes: Sequence[bool]) -> MetricResult:
    """Fraction of episodes where the persona cooperated."""

    if not cooperative_episodes:
        return MetricResult("cooperation_rate", 0.0, 0, {})
    value = sum(1 for flag in cooperative_episodes if flag) / len(cooperative_episodes)
    return MetricResult(
        name="cooperation_rate",
        value=value,
        sample_size=len(cooperative_episodes),
        breakdown={"successes": float(sum(cooperative_episodes))},
    )


def compute_social_metrics(payoffs: Sequence[float], partner_payoffs: Sequence[float], cooperative_flags: Sequence[bool]) -> Sequence[MetricResult]:
    """Canonical social metrics used in PersonaBench reporting."""

    return [
        reciprocity_index(payoffs, partner_payoffs),
        cooperation_rate(cooperative_flags),
    ]


__all__ = ["compute_social_metrics", "cooperation_rate", "reciprocity_index"]
