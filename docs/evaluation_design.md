# Evaluation & Feedback Design

_Last updated: 2025-10-02_

## Objectives

1. Provide apples-to-apples comparisons across personas and underlying model adapters.
2. Capture human preference data via double-blind studies and merge it with automated metrics.
3. Support lightweight, text-based scenarios that can run anywhere the Python harness runs.
4. Integrate tightly with the LangChain orchestration service so evaluation runs and human feedback can be triggered via the same API surface.

## Metric Families

| Family | Metric | Definition | Notes |
| --- | --- | --- | --- |
| Strategic efficacy | Success rate | $\text{success\_rate} = \frac{\sum_i \mathbf{1}[o_i = \text{win}]}{N}$ | Already implemented; ensure scenario outcomes expose win/loss labels. |
| Strategic efficiency | Steps over optimal | $\text{soo} = \frac{1}{N}\sum_i \max(0, s_i - o_i)$ | Implemented; requires baseline optimal step counts. |
| Expected value | Expected return | $\mathbb{E}[R] = \frac{1}{N}\sum_i r_i$ | New metric for poker/economic games. |
| Risk discipline | Volatility penalty | $\text{penalty} = \sqrt{\frac{1}{N}\sum_i (r_i - \bar{r})^2}$ | Lower is better; encourages stable personas. |
| Social alignment | Cooperation rate | $\frac{\text{cooperative\_actions}}{\text{total\_opportunities}}$ | Requires tagging cooperative decision points. |
| Safety | Red flag rate | $\frac{\text{violations}}{N}$ | Extend `compliance_rate` with severity weighting. |
| Human preference | Bradley–Terry score | Optimize $\Pr[i \succ j] = \frac{e^{\beta_i}}{e^{\beta_i} + e^{\beta_j}}$ | Fit parameters from double-blind votes. |

## Human Preference Pipeline

1. **Response capture**
   - During evaluation, persist the full persona response payloads (prompt, plan, action, reaction) to an immutable store. Suggested schema lives at `docs/architecture.md`.
   - Assign anonymized IDs `run_a`, `run_b` for pairing.

2. **Double-blind review UI**
   - Reviewers see two responses with identical metadata scrubbed of persona/model identifiers.
   - Collect: winner (`A`, `B`, or `tie`), confidence (1–5), optional justification.

3. **Storage**
   - Append votes to a `feedback_votes` table or JSONL with fields `(pair_id, reviewer_id, choice, confidence, timestamp)`.
   - Enforce one vote per reviewer per pair.

4. **Aggregation**
   - Fit Bradley–Terry model parameters $\beta$ via logistic regression or iterative scaling.
   - Derive preference score per persona and expose to analytics dashboard alongside automated metrics.

5. **Governance**
   - Maintain audit logs linking votes to run manifests for traceability.
   - Provide opt-in reviewer identifiers for IRB/ethics compliance.

## Text-Based Scenario Design

### Solitaire Harness

- Deterministic pseudo-random seed per episode for reproducibility.
- Public board state described via textual tableau; persona issues textual commands (`move 7->foundation`).
- Episode ends when deck exhausted or solved.
- Metrics: completion rate, mean moves, illegal move count, hint usage.

### Poker-Style Versus Matches

- Pure Python engine with:
  - Fixed-limit betting to cap action space.
  - Deterministic shuffling (`random.Random(seed)`).
  - Support for persona vs persona and persona vs scripted baseline.
- Metrics: expected value per hand, bluff frequency (bet without strong hand), showdown win rate, exploitation score vs baseline.

### Team Negotiation Game

- Text-based sealed-bid auction or resource allocation puzzle.
- Personas must produce allocation proposals; automated referee computes fairness / envy metrics.
- Enables social alignment + cooperation metrics.

All new scenarios should ship with:
- Schema manifest (`scenarios/<family>/<scenario>.yaml`) defining evaluation criteria.
- Adapter module under `bench/adapters/` implementing reset/execute.
- Unit tests covering deterministic outcomes and metric plumbing.

## Scenario Authoring Workflow

1. Author scenario manifest with description, instructions, constraints, evaluation criteria (algorithmic vs human weights).
2. Implement adapter module with deterministic random seeds and text I/O.
3. Add automated metric calculators to `bench/eval/metrics.py` where applicable.
4. Write tests under `tests/` ensuring schema validation, adapter step loop, and metric calculations.
5. Document scenario-specific playbooks in `docs/scenarios/<scenario>.md` (to be created alongside each new game).

## Admin & Operator Requirements

- Personas and scenarios should be versioned and approved before exposure to evaluators.
- Admin UI must surface:
  - Persona status (draft, approved, retired).
  - Scenario readiness (experimental, production).
   - Evaluation queue with run history, health indicators, and live status streaming via ETags / SSE.
- Provide bulk import/export (JSONL) to sync with research infra.
- Surface live queue updates via the SSE endpoints (`/api/evaluations/queue/{id}/events`) so operators can monitor progress without polling.

## API Contracts (Draft)

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/personas` | GET/POST/PUT | List, create, update personas; enforce schema validation. |
| `/api/scenarios` | GET/POST/PUT | Manage scenarios; provide template catalog. |
| `/api/evaluations` | POST | Submit run manifest (persona IDs, scenario IDs, adapter config). Returns `202` with queue + run identifiers. |
| `/api/evaluations/queue/{id}` | GET | Poll run status; supports `If-None-Match` for efficient long polling. |
| `/api/evaluations/queue/{id}/events` | GET | Stream lifecycle updates via Server-Sent Events. |
| `/api/evaluations/queue/{id}/events/history` | GET | Fetch recorded lifecycle events for clients that prefer polling. |
| `/api/evaluations/{id}` | GET | Fetch run status, metrics, trace URIs. |
| `/api/feedback/pairs` | POST | Create double-blind pairings from cached responses. |
| `/api/feedback/votes` | POST | Record reviewer vote; backend updates aggregation pipeline. |

These contracts should be captured as OpenAPI once implementation begins.
