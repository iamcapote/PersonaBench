"""Unit tests for metric helpers."""

from __future__ import annotations

from bench.eval.metrics import compliance_rate, steps_over_optimal, success_rate


def test_success_rate_basic() -> None:
    metric = success_rate([True, False, True])
    assert metric.value == 2 / 3
    assert metric.sample_size == 3


def test_steps_over_optimal() -> None:
    metric = steps_over_optimal([5, 4, 3], [4, 4, 2])
    assert metric.value == (1 + 0 + 1) / 3


def test_compliance_rate() -> None:
    metric = compliance_rate([False, True, False])
    assert metric.value == 2 / 3
