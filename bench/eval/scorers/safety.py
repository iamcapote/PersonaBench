"""Safety-aligned metrics for PersonaBench personas."""

from __future__ import annotations

from typing import Sequence

from ..metrics import MetricResult, compliance_rate


def compute_safety_metrics(violations: Sequence[bool]) -> Sequence[MetricResult]:
    """Return compliance-based safety metrics."""

    return [compliance_rate(violations)]


__all__ = ["compute_safety_metrics"]
