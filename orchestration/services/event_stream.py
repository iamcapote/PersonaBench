"""In-memory pub/sub for evaluation status streams."""

from __future__ import annotations

import asyncio
from asyncio import AbstractEventLoop, Queue as AsyncQueue
from collections import deque
from threading import Lock
from typing import Any, Deque, Dict, List, Tuple

_MAX_HISTORY = 50


class EvaluationEventStream:
    """Thread-safe registry for broadcasting evaluation lifecycle events."""

    def __init__(self) -> None:
        self._subscribers: Dict[str, List[Tuple[AbstractEventLoop, AsyncQueue[Dict[str, Any]]]]] = {}
        self._history: Dict[str, Deque[Dict[str, Any]]] = {}
        self._lock = Lock()

    def publish(self, entry_id: str, event: Dict[str, Any]) -> None:
        """Record an event and fan it out to active subscribers."""

        with self._lock:
            history = self._history.setdefault(entry_id, deque(maxlen=_MAX_HISTORY))
            history.append(dict(event))
            subscribers = list(self._subscribers.get(entry_id, []))

        for loop, queue in subscribers:
            loop.call_soon_threadsafe(queue.put_nowait, dict(event))

    def subscribe(
        self,
        entry_id: str,
        loop: AbstractEventLoop,
    ) -> Tuple[AsyncQueue[Dict[str, Any]], List[Dict[str, Any]]]:
        """Register a subscriber and return its queue plus existing history."""

        queue: AsyncQueue[Dict[str, Any]] = asyncio.Queue()
        with self._lock:
            subscribers = self._subscribers.setdefault(entry_id, [])
            subscribers.append((loop, queue))
            history = list(self._history.get(entry_id, []))
        return queue, history

    def unsubscribe(self, entry_id: str, queue: AsyncQueue[Dict[str, Any]]) -> None:
        """Remove a subscriber from the registry."""

        with self._lock:
            subscribers = self._subscribers.get(entry_id)
            if not subscribers:
                return
            self._subscribers[entry_id] = [item for item in subscribers if item[1] is not queue]
            if not self._subscribers[entry_id]:
                del self._subscribers[entry_id]

    def reset(self) -> None:
        """Clear subscribers and history (used in tests)."""

        with self._lock:
            self._subscribers.clear()
            self._history.clear()

    def history(self, entry_id: str) -> List[Dict[str, Any]]:
        """Return a copy of recorded events for the given entry."""

        with self._lock:
            events = list(self._history.get(entry_id, []))
        return [dict(event) for event in events]


_EVENT_STREAM = EvaluationEventStream()


def get_event_stream() -> EvaluationEventStream:
    """Return the singleton evaluation event stream registry."""

    return _EVENT_STREAM


def reset_event_stream() -> None:
    """Reset the singleton event stream (used in tests)."""

    _EVENT_STREAM.reset()


__all__ = ["EvaluationEventStream", "get_event_stream", "reset_event_stream"]
