"""Aggregation utilities for PersonaBench metrics."""

from __future__ import annotations

from typing import Iterable, Mapping

from .metrics import MetricResult


def geometric_mean(metrics: Iterable[MetricResult], weights: Mapping[str, float]) -> float:
    """Compute a weighted geometric mean across metric values."""

    product = 1.0
    total_weight = 0.0
    for metric in metrics:
        weight = weights.get(metric.name, 0.0)
        if weight <= 0:
            continue
        product *= max(metric.value, 1e-6) ** weight
        total_weight += weight
    if total_weight == 0:
        return 0.0
    return product ** (1 / total_weight)


__all__ = ["geometric_mean"]
