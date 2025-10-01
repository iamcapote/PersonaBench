# Games Roadmap

This plan tracks solitaire-style drills and multiplayer card games that exercise mathematical reasoning, probability, and short-horizon planning. Each entry notes whether it is primarily **Single** (solo puzzle) or **Group** (supports multi-agent benching) and highlights differentiators the benchmark should preserve.

## 1. Classics (Solo Logic Builders)

| Game | Mode | Focus | Notes |
|------|------|-------|-------|
| Klondike | Single | Sequential planning, hidden-information inference | Standard patience baseline with 7 tableau piles building A→K by suit. |
| Spider | Single | Long-horizon sequencing | Supports 1/2/4 suits, K→A runs, tests move budgeting. |
| FreeCell | Single | Deterministic search | Open-information solver; ideal for planning depth analyses. |
| Pyramid | Single | Pair-sum reasoning | Remove exposed pairs totalling 13; measures scanning speed. |
| Golf | Single | Local heuristics | Rank-up/down runs from seven rows; no suits. |
| TriPeaks | Single | Pattern recognition | Golf variant with three peaks; fast tempo. |
| Forty Thieves (Napoleon) | Single | Constraint management | Two decks, strict single-card moves; notoriously difficult. |
| Yukon | Single | Bulk moves & foresight | Klondike-style with broader move allowances, emphasizing recursion. |
| Russian Solitaire | Single | High-difficulty Yukon variant | Same layout as Yukon but build by suit descending; punishes greedy play. |
| Scorpion | Single | Limited redeals | Build K→A in tableau; tests recovery from unsorted stacks. |
| Baker’s Dozen | Single | Pure ordering | 13 columns, no suit building; rewards precise sequencing. |

## 2. Math & Matching Drills

| Game | Mode | Focus | Notes |
|------|------|-------|-------|
| Clock Patience | Single | Probability tracking | Place cards by rank around a clock; largely luck but good for RNG sanity checks. |
| Monte Carlo | Single | Spatial matching | Remove adjacent equal ranks; sliding-window reasoning. |
| Elevens / Fifteens | Single | Target sums | Remove cards summing to 11 or 15; encourages mental arithmetic under pressure. |
| Calculation | Single | Modular arithmetic planning | Four foundations advance in fixed skip counts (e.g., +1, +2, +3, +4). |

## 3. Puzzle-Heavy Patience

| Game | Mode | Focus | Notes |
|------|------|-------|-------|
| Accordion | Single | Compression strategy | Collapse layout via rank/suit matches; dramatic branching factor. |
| Beleaguered Castle / Streets & Alleys | Single | Deterministic maneuvering | FreeCell-like without open cells; tight move economy. |
| Canfield | Single | Reserve management | Adds reserve pile and shifting foundations; tracks odds. |
| La Belle Lucie (Fan) | Single | Suit-restricted fans | 17 fans, no tableau building except by suit; frequent unwinnable states. |
| Emperor | Single | Advanced patience | Two-deck patience emphasizing stack planning and limited redeals. |

## 4. Poker-Style Solitaires

| Game | Mode | Focus | Notes |
|------|------|-------|-------|
| Poker Squares | Single | Combinatorial optimization | Place 25 cards in 5×5 grid to maximize poker hand scores across rows and columns. |
| Poker Shuffle (Poker Patience) | Single | Adaptive scoring | Arrange sequential deals to reach target hand values. |
| Blackjack Practice | Single | Expected value drill | Face-up shoe dealing for counting and basic-strategy evaluation. |
| Cribbage Solitaire | Single | Target scoring | Build optimal hands sequentially; useful for incremental scoring logic. |

## 5. Group / Competitive Card Games

| Game | Mode | Focus | Notes |
|------|------|-------|-------|
| Blackjack (table) | Group | Risk vs reward, card counting | Multi-agent adaptation with dealer vs players modelling cooperation/competition. |
| Poker (Texas Hold’em, variants) | Group | Game theory, signaling | Supports tournaments, cash games, and coop vs adversarial personas. |
| Poker Squares (competitive) | Group | Shared deck / drafting | Optional head-to-head mode via shared market of dealt cards. |

## 6. Optional Special Decks

| Game | Mode | Focus | Notes |
|------|------|-------|-------|
| Set | Single/Group | Pattern matching | Tests visual combinatorics; supports cooperative or competitive timing. |

## 7. Phased Delivery

1. **Foundation (MVP)** – Ship Klondike, FreeCell, Blackjack practice (solo), and Blackjack table mode to validate single vs group plumbing.
2. **Classic Expansion** – Add Spider (two suits), Pyramid, Golf, TriPeaks, and Poker Squares (solo).
3. **Advanced Patience** – Introduce Forty Thieves, Yukon/Russian, Scorpion, Baker’s Dozen, and Calculation.
4. **Puzzle & Math Tier** – Launch Accordion, Beleaguered Castle, Canfield, La Belle Lucie, Elevens/Fifteens, Monte Carlo.
5. **Multiplayer Focus** – Integrate Poker tournament flows and shared-draft Poker Squares; expose contract hooks for cooperation/defection studies.
6. **Special Deck Experiments** – Optional Set or other custom-deck puzzles for pattern-recognition benchmarks.

## 8. Instrumentation Goals

- Track solve rate, move efficiency, decision latency, and EV deltas per persona.
- Surface deterministic vs stochastic game splits for reproducible comparisons.
- Provide single vs group leaderboards; group modes record coordination metrics (signaling success, resource sharing).
- Ensure every card action emits structured events compatible with the evaluation harness.

## 9. Board & Abstract Strategy Pilots

| Game | Mode | Focus | Notes |
|------|------|-------|-------|
| Tic-Tac-Toe | Group | Turn-order discipline, invalid-move handling | Implemented as the reference multi-persona engine layered on the new game master; emits structured move events and penalties. |
