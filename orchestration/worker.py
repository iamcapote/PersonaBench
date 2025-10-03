"""Background worker for asynchronous evaluation execution."""

from __future__ import annotations

import threading
import time
from queue import Empty, Queue
from typing import Optional

from .services.evaluations import EvaluationJobPayload, execute_evaluation_job


class EvaluationWorker:
    """Simple single-threaded worker that processes evaluation jobs sequentially."""

    def __init__(self) -> None:
        self._queue: "Queue[EvaluationJobPayload]" = Queue()
        self._shutdown = threading.Event()
        self._lock = threading.Lock()
        self._thread: Optional[threading.Thread] = None

    def start(self) -> None:
        with self._lock:
            if self._thread and self._thread.is_alive():
                return
            self._shutdown.clear()
            self._thread = threading.Thread(target=self._run, name="evaluation-worker", daemon=True)
            self._thread.start()

    def submit(self, job: EvaluationJobPayload) -> None:
        self.start()
        self._queue.put(job)

    def shutdown(self, *, wait: bool = False, timeout: Optional[float] = None) -> None:
        if wait:
            self.wait_for_idle(timeout)
        self._shutdown.set()
        thread = self._thread
        if thread and wait:
            thread.join(timeout=1.0)

    def wait_for_idle(self, timeout: Optional[float] = None) -> bool:
        deadline = time.monotonic() + timeout if timeout is not None else None
        while True:
            if self._queue.unfinished_tasks == 0:
                return True
            if deadline is not None and time.monotonic() >= deadline:
                return False
            time.sleep(0.05)

    def _run(self) -> None:
        while not self._shutdown.is_set():
            try:
                job = self._queue.get(timeout=0.1)
            except Empty:
                continue
            try:
                execute_evaluation_job(job)
            finally:
                self._queue.task_done()


def get_evaluation_worker() -> EvaluationWorker:
    """Return the shared evaluation worker instance."""

    global _EVALUATION_WORKER
    if _EVALUATION_WORKER is None:
        _EVALUATION_WORKER = EvaluationWorker()
    return _EVALUATION_WORKER


def reset_evaluation_worker(wait: bool = True) -> None:
    """Reset the singleton worker (used in tests)."""

    global _EVALUATION_WORKER
    if _EVALUATION_WORKER is not None:
        _EVALUATION_WORKER.shutdown(wait=wait)
    _EVALUATION_WORKER = None


_EVALUATION_WORKER: Optional[EvaluationWorker] = None


__all__ = [
    "EvaluationWorker",
    "get_evaluation_worker",
    "reset_evaluation_worker",
]
