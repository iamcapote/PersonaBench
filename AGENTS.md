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
- Agent runtime behavior is validated via `tests/test_simple_agent*` which exercise plan→act→react and the `PersonaAgent` contract.

What is NOT present and — importantly — not required by current tests:

- There is no `MemoryManager` runtime implementation under `agents/` or `bench/` and tests do not rely on memory. Documentation examples that referenced `self._update_memory(...)` were illustrative, not runnable.

Recommendation: keep `memory` in persona JSONs and the UI (it's useful for personas/UIs), but do NOT introduce a runtime MemoryManager unless a concrete evaluation or test needs it. Focus immediate efforts on components that are exercised by tests and the harness (logging, tool budgets, adapters, and metrics).

## Core Contract

Agents in PersonaBench must implement the following step loop contract:

```python
class PersonaAgent:
    """Base class for persona-aware agents."""
    
    def plan(self, observation: Observation) -> Plan:
        """Generate a structured plan from current observation.
        
        Args:
            observation: Current environment state
            
        Returns:
            Plan with rationale and concrete steps
        """
        
    def act(self, plan: Plan, observation: Observation) -> Action:
        """Convert plan into concrete environment action.
        
        Args:
            plan: Previously generated plan
            observation: Current environment state
            
        Returns:
            Action command with any required arguments
        """
        
    def react(self, observation: Observation, events: list[str]) -> Reaction:
        """Process feedback and adjust strategy if needed.
        
        Args:
            observation: Post-action environment state  
            events: List of event names from last step
            
        Returns:
            Reaction with strategy adjustments
        """
```

Key Invariants:
- Plans must respect persona's planning horizon
- Actions must use allowed tools within budget
- Reactions must maintain persona consistency
- All steps must complete within 15min timeout

## Implementation Patterns

### Plan Generation

Planning involves memory management and strategic decision-making:

```python
def plan(self, observation: Observation) -> Plan:
    # Memory management
    self._update_memory(observation)
    context = self._get_relevant_context()
    
    # Risk assessment
    risk_level = self._assess_risk(context)
    if risk_level > self.persona["risk_tolerance"]:
        return self._generate_conservative_plan(context)
    
    # Strategy generation
    horizon = self.persona["planning_horizon"]
    steps = self._generate_steps(
        context,
        max_steps=horizon,
        tools=self.persona["tools"]["allowed"]
    )
    
    # Validation
    self._validate_plan_safety(steps)
    return Plan(
        rationale=self._explain_strategy(steps, risk_level),
        steps=steps,
        metadata={
            "risk_assessment": risk_level,
            "memory_window": self.memory_window,
            "tool_projections": self._project_tool_usage(steps)
        }
    )
```

Key Components:
- Memory integration with planning
- Risk-aware strategy generation
- Tool usage projection
- Safety validation
- Strategy explanation

### Action Execution

### Action Execution

Actions require careful budget management and safety checks:

```python
def act(self, plan: Plan, observation: Observation) -> Action:
    # Budget validation
    remaining_budget = self._get_remaining_budget()
    estimated_cost = self._estimate_action_cost(plan)
    if not self._is_within_budget(estimated_cost, remaining_budget):
        return self._fallback_action()
    
    # Tool selection and validation
    allowed_tools = self.persona["tools"]["allowed"]
    tool_selection = self._select_optimal_tool(
        plan,
        allowed_tools,
        budget=remaining_budget,
        risk_tolerance=self.persona["risk_tolerance"]
    )
    
    # Safety checks
    if not self._validate_tool_safety(tool_selection):
        self.logger.warning("Tool safety check failed, using fallback")
        return self._fallback_action()
    
    # Action preparation
    args = self._prepare_args(
        plan,
        observation,
        tool_selection,
        safety_bounds=self.persona.get("safety_bounds", {})
    )
    
    # Budget tracking
    self._record_tool_usage(tool_selection, estimated_cost)
    
    return Action(
        command=tool_selection.name,
        arguments=args,
        tool_calls=self._prepare_tool_calls(tool_selection)
    )
```

Key Features:
- Proactive budget management
- Tool safety validation
- Fallback mechanisms
- Usage tracking
- Safety-bound enforcement

### Reaction Processing

Reactions provide strategic adjustment:

```python
def react(self, observation: Observation, events: list[str]) -> Reaction:
    # Process feedback
    unexpected = self._identify_anomalies(observation, events)
    
    # Adjust if needed
    if unexpected:
        return Reaction(
            adjustment="Updating risk tolerance",
            metadata={"confidence": "low"}
        )
    return Reaction(adjustment="noop")

## Composition over Inheritance

- Prefer small functions and pipelines. Example: research pipeline composes search → summarize → cite.
- Use higher-order functions to inject concerns (logging, caching, rate-limiting) without coupling.

```
const withRateLimit = (fn, limiter) => async (...args) => limiter.schedule(() => fn(...args));
```

## Testing (Vitest)

- Put tests near features (e.g., `tests/test_persona_examples.py`).
- Test behavior: happy path, one boundary, one failure mode.
- Keep tests fast and deterministic. Mock environment adapters.
- Use contract-based tests: plan→act→react cycle validation.
- Add a tiny smoke test for each new persona type.

Test checklist:
- Plan respects persona horizon and constraints
- Actions use only allowed tools within budget
- Reactions maintain behavioral consistency
- Logging captures complete step traces
- Time/memory budgets enforced

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

- OpenAI adapter for chat completion endpoints
- vLLM adapter for local deployment
- Ollama adapter for open models
- Rate limiting and budget tracking
- Streaming support where available

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

## Coding Standards (ESM + async)

- Use `async/await`; propagate errors with context (wrap with cause when needed).
- Define error classes for domain errors; avoid throwing strings.
- Avoid default exports; prefer named exports for clearer composition.
- No magic numbers/strings: centralize constants.
- Avoid shared mutable state; prefer passing explicit context objects.

## Change Management and PR Hygiene

- One intent per PR; keep diffs small and cohesive.
- Update docs and tests alongside code changes.
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