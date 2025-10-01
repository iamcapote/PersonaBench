# PersonaBench Agents

Guide for implementing, extending, and evaluating persona-based agents in PersonaBench. This document outlines core patterns and best practices for building agents that can be evaluated across diverse environments through our plan→act→react protocol. For a product-level view of backend/frontend integration status and upcoming infrastructure work, see [`docs/architecture.md`](docs/architecture.md).

## Agent Architecture

### Core Components

1. **Memory Management**
   - Configurable window size for observation history
   - Persistence levels: none, short-term, long-term
   - State tracking across episodes
   - Efficient memory compression

2. **Tool Management**
   - Budget tracking per tool type
   - Usage constraints enforcement
   - Rate limiting and cooldowns
   - Performance monitoring
   - Standardized invocation: agents should favor Model Context Protocol (MCP) tool calls or service-provided HTTP helpers so invocations remain machine-readable.
    - Tool discipline: prefer local repository context before invoking external research, escalate to multiple distinct searches only when deep investigation of rapidly evolving topics is unavoidable, and log why each escalation was necessary

3. **Safety Bounds**
   - Risk tolerance enforcement
   - Tool access validation
   - Resource usage limits
   - Recovery mechanisms

4. **Behavioral Consistency**
   - Persona signature verification
   - Cross-environment consistency
   - Strategic alignment checks
   - Adaptation boundaries

### Turn-Based Match Flow (New)

- Multi-persona coordination now runs through the shared `GameMaster` (`bench/core/game_master.py`).
- Games implement the `TurnBasedGame` contract to expose per-player observations, legal moves, and outcome summaries.
- The harness `MatchRunner` (`harness/match.py`) wires persona agents into the game master so plan→act→react loops execute per turn.
- Structured `Event` payloads emitted by games (for example tic-tac-toe move events) automatically propagate into trace logs and analytics.
- Tool routers translate planner output (for example MCP JSON commands) into environment actions so personas can focus on reasoning while the harness handles deterministic execution.

### Key Principles

- Immutability at boundaries: clone inputs/outputs
- Explicit state management: no hidden globals
- Structured logging: full cycle tracing
- Safety first: validate before action
- Performance aware: respect budgets

## Reality check: what exists (and does NOT) in the codebase today

Important clarification: the repository *defines* `memory` fields in persona schemas and the frontend persona samples, but there is NO runtime memory behavior being tested or enforced in the Python packages. Tests and runtime code cover other concerns (plan→act→react behaviour, trace logging, and evaluation metrics), not any MemoryManager functionality.

Concrete observations:

- Persona schema: `personas/schema.json` includes a `memory` object with `window` and `persistence` fields.
- Persona examples: `personas/examples/*.json` include `memory` fields (e.g. `cooperative_planner.json`, `ruthless_optimizer.json`).
- Frontend samples: `src/samplePersonas.ts` exposes `memoryWindow` values used by the UI.

What the repo actually tests and runs today:

- `tests/test_persona_examples.py` validates required persona JSON fields (name, version, planning_horizon, risk_tolerance, tools).
- `tests/test_metrics.py` exercises metric helpers under `bench/eval`.
- Runtime behaviour is verified via `tests/test_simple_agent*` and `tests/test_evaluation_chain.py`, ensuring plan→act→react and the evaluation harness stay stable.

What is NOT present and — importantly — not required by current tests:

- There is no `MemoryManager` runtime implementation under `agents/` or `bench/`; tests do not exercise memory features. Documentation examples that referenced runtime memory were illustrative, not runnable.

Recommendation: keep `memory` in persona JSONs and the UI (it's useful for personas/UIs), but do NOT introduce a runtime MemoryManager unless a concrete evaluation or test needs it. Focus immediate efforts on components that are exercised by tests and the harness (logging, tool budgets, adapters, metrics, and LLM integration).

Multi-persona gameplay now has an end-to-end reference path: see the tic-tac-toe engine in `bench/games/tic_tac_toe/engine.py`, accompanying game/scenario manifests, and tests under `tests/test_tic_tac_toe_match.py`. Future game work should follow the same pattern—encode rules in a `TurnBasedGame`, register manifests under `games/` and `scenarios/`, and add deterministic tests that cover full matches plus edge cases.

## Core Contract

Agents participate in a three-stage loop:

1. **Plan** – interpret the latest observation, evaluate persona constraints, and produce an ordered list of intended steps.
2. **Act** – transform the chosen plan into a concrete command (tool invocation, environment action, etc.). When a persona uses MCP or HTTP tools, the command should already be normalized to JSON (`{"tool": "http.get", "args": {...}}`) so the orchestrator can execute it without extra parsing.
3. **React** – ingest feedback from the environment, adjust internal state, and prepare for the next iteration.

Key invariants:
- Plans must respect the persona’s planning horizon.
- Actions must stay within the declared tool budget and whitelist.
- Reactions must maintain persona continuity across steps.
- Every loop must finish inside the 15-minute execution guardrail.

### Plan Generation

Planning should evaluate persona memory (if present), risk tolerance, and tool constraints before emitting a rationale and ordered steps. Treat each blueprint as auditable: explain why every action is proposed and surface projected resource usage where possible.

### Action Execution

Actions must revisit remaining budget, validate tool safety, and capture any fallbacks. Record the selected command, arguments, projected cost, and outcome so operators can audit behaviour. If a step violates persona guardrails, use a conservative fallback action and document the reason.

### Reaction Processing

Reactions contextualise feedback from the environment. Capture anomalies, adjust persona state (for example risk posture or memory markers), and log the decision. Even when nothing changes, record the “noop” to maintain trace completeness.

### Composition over Inheritance

- Prefer pipelines of small functions to keep agents composable.
- Inject cross-cutting concerns (logging, caching, throttling) via higher-order helpers or dependency injection rather than deep hierarchies.

## Testing Focus

- Co-locate behavioural tests with the feature under test (see `tests/test_evaluation_chain.py` for orchestration coverage).
- Exercise happy paths, boundaries, and failure recovery while keeping tests deterministic.
- Mock environment adapters when possible to isolate agent reasoning.
- Maintain a smoke scenario per persona archetype so regressions surface early.
- Verify traces capture plan, act, react outputs along with timing and budgets.

## Observability and Logging

- Structured JSONL traces via `TraceLogger`
- Complete plan→act→react cycle logging
- Persona signature vectors for consistency tracking
- Episode-level metrics and breakdowns
- Never log sensitive persona data or API keys

## Configuration and Personas

- Define personas in JSON following `personas/schema.json`
- Load adapters based on environment requirements
- Configure per-episode budget limits
- Feature flags for experimental tools/capabilities
- Environment-specific secrets via variables

## Model Integration (LLM Adapters)

- OpenAI-style chat, Ollama, and vLLM adapters live under `agents/adapters/` and are exercised by the test suite.
- The orchestration runtime instantiates LLM planners via `config.agent` on a per-run basis; see `docs/llm_agent_configuration.md` for the full contract.
- Rate limiting, credential management, and streaming are active workstreams—treat the current integration as the foundation.
- When calling hosted providers, capture model identifiers, knowledge cutoffs, and citation requirements in persona metadata. Replay the full message history for stateless APIs, encode non-text assets inline, and respect provider guardrails that may emit refusals.

## Data and Immutability at Boundaries

- Freeze or clone outputs returned from a module to prevent accidental mutation.
- Validate and normalize inputs immediately upon entry.
- Represent time and IDs explicitly; avoid hidden global state.

## Comments and Documentation

- Each file starts with a short “Why/What/How” block explaining purpose and role.
- Public functions have JSDoc with param/return/error docs and invariants.
- Reference related guides in `guides/` when helpful.
- Keep examples updated and runnable.
- Summarize architecture and behavior only; keep comments concise, precise, timeless, and never use them for TODOs or meta-notes.
- Communication cues: open responses with a concise acknowledgement tied to the task, keep prose skimmable, mirror user emoji usage rather than initiating it, and ask only one focused clarification question at a time.


## Coding Standards (ESM + async)

- Use `async/await`; propagate errors with context (wrap with cause when needed).
- Define error classes for domain errors; avoid throwing strings.
- Avoid default exports; prefer named exports for clearer composition.
- No magic numbers/strings: centralize constants.
- Avoid shared mutable state; prefer passing explicit context objects.

## Change Management and PR Hygiene

- One intent per PR; keep diffs small and cohesive.
- Update docs and tests alongside code changes.
- After material changes, run the pertinent tests or builds yourself, report pass/fail succinctly, and map each explicit requirement to Done or Deferred before handoff.
- Commit message format:
  - `feat(scope): short summary`
  - `fix(scope): short summary`
  - `refactor(scope): short summary`
  - Body: motivation, approach, risks, follow-ups.
- PR checklist:
  - Contract documented (inputs/outputs/errors/perf)
  - Tests added/updated; pass locally
  - Logs/metrics added where useful; secrets redacted
  - File size within guideline; no cycles introduced
  - Reviewers can run it in <5 minutes

## Best Practices for Persona Development

When developing new personas or extending existing ones:

### Design Principles

- Focus on behavioral consistency across environments
- Make strategic choices explicit in planning
- Maintain tool use within defined constraints
- Keep feedback loops tight for strategic adjustment

### Implementation Guidelines

- Start with persona definition and constraints
- Build up from base agent implementations
- Test across multiple environment types
- Monitor behavioral consistency metrics
- Treat external agents or remote collaborators as expert partners with limited visibility: provide complete, current context with every request, avoid assuming access to workspace files or execution results, and flag any facts that may have changed since collection for independent verification

### Safety Considerations

- Respect environment-provided safety bounds
- Track and limit resource usage
- Implement graceful degradation
- Maintain audit logs for evaluation

### Integration Testing

- Test across full scenario suite
- Verify metrics reflect intended behavior
- Compare against baseline personas
- Document edge cases and limitations




## Persona Review Guidelines

When reviewing persona implementations, check:

- Does the persona definition match intended behavior?
- Are planning decisions consistent with risk tolerance?
- Do tool selections respect allowed sets and budgets?
- Are reactions appropriate to environment feedback?
- Is trace logging complete and well-structured?
- Are metrics capturing key behavioral aspects?
- Does documentation explain strategic choices?
- Would the persona behave safely in edge cases?

---

This guide is living and evolves with PersonaBench. If patterns help us evaluate personas more effectively, adopt them. If they limit agent capabilities or evaluation scope, refine them. The goal is building agents that exhibit consistent, measurable, and safe behavior across diverse environments.