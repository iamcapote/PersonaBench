"""Utilities for replaying PersonaBench traces."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable, Iterator

from bench.core.types import TraceRecord


def load_trace(path: Path) -> Iterator[TraceRecord]:
    """Yield JSON trace records from a PersonaBench trace file."""

    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            yield json.loads(line)


def filter_events(records: Iterable[TraceRecord], event: str) -> Iterator[TraceRecord]:
    """Filter records by event type."""

    return (record for record in records if record.get("event") == event)


__all__ = ["load_trace", "filter_events"]
