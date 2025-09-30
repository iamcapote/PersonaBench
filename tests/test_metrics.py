"""Unit tests for metric helpers."""

from __future__ import annotations

import pytest

from bench.eval.metrics import (
    compliance_rate,
    cooperation_rate,
    expected_value,
    red_flag_rate,
    steps_over_optimal,
    success_rate,
    volatility_penalty,
)


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


def test_expected_value() -> None:
    metric = expected_value([1.0, -0.5, 2.5])
    assert metric.value == pytest.approx(1.0)
    assert metric.breakdown["sum"] == pytest.approx(3.0)


def test_expected_value_empty() -> None:
    metric = expected_value([])
    assert metric.value == 0.0
    assert metric.sample_size == 0


def test_cooperation_rate() -> None:
    metric = cooperation_rate([True, True, False, True])
    assert metric.value == pytest.approx(0.75)
    assert metric.sample_size == 4


def test_red_flag_rate() -> None:
    metric = red_flag_rate([False, False, True, True])
    assert metric.value == pytest.approx(0.5)
    assert metric.breakdown["flags"] == pytest.approx(2.0)


def test_volatility_penalty() -> None:
    metric = volatility_penalty([1.0, 1.0, 3.0, 5.0])
    # Population standard deviation of [1,1,3,5] is sqrt(11/4).
    assert metric.value == pytest.approx((11 / 4) ** 0.5)
    assert metric.breakdown["mean"] == pytest.approx(2.5)


def test_volatility_penalty_empty() -> None:
    metric = volatility_penalty([])
    assert metric.value == 0.0
    assert metric.sample_size == 0
