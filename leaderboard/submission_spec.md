# PersonaBench Submission Specification

To appear on the PersonaBench leaderboard, submissions must package an agent and persona bundle as a Docker image that exposes the `plan→act→react` API over gRPC.

## Required artifacts

- `persona.json`: conforms to [`personas/schema.json`](../personas/schema.json).
- `agent.py`: entrypoint implementing `PersonaAgent`.
- `scenarios/`: directory enumerating supported scenario IDs.

## Runtime contract

1. Container must start a gRPC server on port `7000` implementing:
   - `Reset(ScenarioConfig) -> Observation`
   - `Step(PlanRequest) -> StepResult`
   - `Close(Empty) -> Ack`
2. Responses must include persona signature vectors for every episode.
3. Wall-clock per episode must not exceed 15 minutes.

## Evaluation process

1. PersonaBench orchestrator launches container with read-only scenario pack.
2. Orchestrator drives evaluation using adapters in [`bench/adapters`](../bench/adapters).
3. Trace logs are captured and validated via schema defined in [`bench/core/logging.py`](../bench/core/logging.py).
4. Metrics are computed using [`bench/eval`](../bench/eval) utilities and aggregated via weighted geometric means.

Submissions failing schema validation or exceeding resource budgets are rejected automatically.
