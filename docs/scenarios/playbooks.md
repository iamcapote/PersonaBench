# Scenario Playbooks

_Last updated: 2025-09-30_

PersonaBench ships with a growing catalog of deterministic, text-first scenarios designed to exercise plan→act→react behaviour without external dependencies. This playbook summarizes the available experiences, episode structure, scoring hooks, and persona considerations so operators can schedule runs or extend adapters with confidence.

## Blackjack Practice Table

- **Adapter**: `bench.adapters.blackjack.adapter.BlackjackAdapter`
- **Scenario manifest**: `games/blackjack/practice.yaml`
- **Episode flow**:
  1. Dealer shuffles to a deterministic seed and deals two cards to the player and dealer.
  2. Persona chooses between `hit`, `stand`, or `double` (penalised fallback) via `Action.command`.
  3. Adapter updates totals, applies blackjack resolution rules, and emits reward (+1 win, 0 push, <0 loss/bust).
- **Observations**: Text summary including hand composition, legal moves, and (optionally) dealer reveal.
- **Rewards & metrics**:
  - Reward signal mirrors expected value; tests assert legal move availability and outcome correctness.
  - Use `expected_value`, `success_rate`, and `red_flag_rate` (illegal tool usage) for reporting.
- **Persona tips**:
  - Strategies with planning horizon ≥2 can project bust risk vs. dealer probabilities.
  - Tool usage typically limited to internal probability calculators; ensure risk tolerance gating on aggressive doubling.

## Simple Solitaire Drill

- **Adapter**: `bench.adapters.solitaire.adapter.SolitaireAdapter`
- **Scenario manifest**: `games/solitaire/practice.yaml`
- **Episode flow**:
  1. Deck shuffles with fixed seed; tableau and waste are initialized.
  2. Persona issues `draw` or `play` commands; invalid inputs trigger penalties and explanatory feedback.
  3. Adapter surfaces legal moves, waste pile state, and foundation progress. Episodes terminate when no moves remain or target score reached.
- **Observations**: Rich text describing tableau, foundations, and legal actions.
- **Rewards & metrics**:
  - Positive rewards for progressing foundation builds; negative for illegal moves.
  - Track `steps_over_optimal` using known shortest-play heuristics and `volatility_penalty` to capture inconsistency across seeds.
- **Persona tips**:
  - Memory window ≥5 aids waste history tracking.
  - Encourage personas to log tableau deltas to keep narrative short and verifiable in traces.

## OSWorld Spreadsheet Task

- **Adapter**: `bench.adapters.osworld.spreadsheets` (via `bench/bench/adapters/osworld`)
- **Scenario manifest**: `scenarios/osworld/spreadsheets.yaml`
- **Episode flow**:
  1. Environment presents spreadsheet manipulation goals (sorting, filtering, formula entry).
  2. Persona issues high-level tool calls to simulated spreadsheet APIs exposed by adapter.
  3. Feedback includes success flags, partial credit, and hints for retries.
- **Observations**: Structured JSON summarizing sheet state plus textual instructions.
- **Rewards & metrics**:
  - Incremental rewards for correct transformations; penalties for invalid schema mutations.
  - Apply `compliance_rate` to ensure bounds respected and `cooperation_rate` for team tasks (multi-agent variants).
- **Persona tips**:
  - Enforce traceability: log formulas and cell ranges in metadata.
  - Risk-averse personas should verify formula previews via safe evaluation tool before committing.

## Heads-Up Poker Drill

- **Adapter**: `bench.adapters.poker.adapter.HeadsUpPokerAdapter`
- **Scenario manifest**: `games/poker/practice.yaml`
- **Episode flow**:
  1. Deck is shuffled deterministically; blinds are posted and hole cards are dealt.
  2. Persona chooses between `check`, `bet`, or `fold` on each street (pre-flop through river).
  3. Opponent follows a simple deterministic policy—calling with sufficiently strong final hands and folding otherwise.
  4. River actions trigger an immediate showdown with automatic hand evaluation.
- **Observations**: Text summary including stage, player hand, revealed community cards, pot size, and legal moves. Feedback line reflects the most recent action outcome.
- **Rewards & metrics**:
  - Win/loss encoded as +1/-1 with splits yielding 0, enabling direct use of `expected_value`.
  - Track `steps_over_optimal` for conservative strategies (minimum four actions to showdown) and `volatility_penalty` to capture inconsistency across seeds.
  - Use `cooperation_rate` when personas are evaluated in partner-play variants (planned future work).
- **Persona tips**:
  - Memory window ≥4 helps retain betting history and opponent reactions.
  - Encourage personas to log inferred opponent ranges in trace metadata for post-hoc analysis.
  - Risk tolerance should modulate river aggression; bluff-heavy personas should monitor red-flag rates.

## Tales: ScienceWorld Narrative

- **Adapter**: `bench.adapters.tales` (story-driven environment)
- **Scenario manifest**: `scenarios/tales/scienceworld.yaml`
- **Episode flow**:
  1. Persona receives chapter prompt with science-themed puzzle.
  2. Plan should enumerate evidence gathering, hypothesis, and final answer steps.
  3. Actions are textual responses; environment scores clarity, factual accuracy, and adherence to constraints.
- **Observations**: Narrative descriptions with embedded objectives and available knowledge sources.
- **Rewards & metrics**:
  - Reward includes base score and alignment bonuses for safe behaviour.
  - Utilize `reaction_success_rate` (from `bench.eval.scorers.reaction`) to monitor adaptation after new hints arrive.
- **Persona tips**:
  - Maintain persona signature consistency; use `log_signature` to snapshot style between chapters.
  - Memory window of 10+ steps recommended for multi-chapter arcs.

## WebArena Shopping Mission

- **Adapter**: `bench.adapters.webarena` (headless browser simulator)
- **Scenario manifest**: `scenarios/webarena/shopping.yaml`
- **Episode flow**:
  1. Persona receives e-commerce task (e.g., compare laptops, locate best deal).
  2. Actions map to structured tool calls (`search`, `open`, `extract`, `checkout`).
  3. Environment enforces budgets and returns telemetry for each navigation step.
- **Observations**: DOM snippets, price tables, and tool availability per state.
- **Rewards & metrics**:
  - Monetary savings converted to positive rewards; time penalties for unnecessary navigation.
  - Track `tool_summary` output from `TraceLogger` to analyze crawler efficiency across runs.
- **Persona tips**:
  - Rate-limit parallel tool usage; adapt risk tolerance when encountering untrusted sellers.
  - Reactions should downgrade aggression if encountering red flags in site metadata.

## Authoring New Playbooks

1. **Define manifest**: place YAML in `scenarios/<family>/` with deterministic seeds, descriptive metadata, and evaluation config.
2. **Implement adapter**: expose `reset()` and `execute()` returning `Observation` and `StepResult` populated with timestamped telemetry.
3. **Add tests**: follow patterns in `tests/test_blackjack_adapter.py` and `tests/test_solitaire_adapter.py` to lock in deterministic behaviour.
4. **Document**: extend this playbook with episode flow, reward signals, and persona guidance for the new scenario family.

Maintaining detailed playbooks ensures operators and reviewers share a common mental model of each scenario, reducing onboarding time and improving evaluation reproducibility.
