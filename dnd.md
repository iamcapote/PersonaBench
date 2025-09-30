# PersonaBench D&D Simulation Spec

## 1) Goals
- Measure agent survival, cooperation, planning, adaptability across templated D&D-style worlds.
- Be transparent, reproducible, and comparable across seeds.

## 2) Personas
- Two-layer profile:
  - Character Sheet (identity, stats, equipment, habits overlay)
  - Behavior Module (Python or JS) exposing `step(observation, rng, memory) -> action`

### 2.1 Character Sheet Fields
- identity: {name, lineage: {root_id, mutations}, blurb}
- frameworks:
  - dnd: {str,dex,con,int,wis,cha,skills,proficiency,level,class,subclass,spells}
  - shdb: {intelligence,strength,speed,durability,power,combat,tier,alignment,universe}
- habitica_prep:
  - habits: [{name, weight}]
  - dailies: [{name, streak}]
  - todos: [{name, done}]
- equipment: {weapons, armor, trinkets, consumables, gold}
- behavior_decl: {risk_tolerance, cooperation_mode, comms_style, ethics_knob}
- api_limits: {obs_kb, action_latency_ms, memory_kb, tools: [...]}

## 3) World DSL
- map, entities, systems, economy, social, timers, win/loss
- determinism: rng(seed, turn, entity_id)

## 4) GM Engine
- Turn-based initiative, skill checks, fog-of-war, event system, rule modules
- Router selects {scenario, seed, party_comp}

## 5) Scoring
- Per-scenario: survival, objectives, cooperation, efficiency, risk-adjusted success, social outcomes, habitica boons
- Aggregation: seed sweeps, TrueSkill ladders

## 6) Transparency
- Signed persona manifests, content-addressed builds, replay bundles

# PersonaBench: D&D Mechanics + Game-Theory Benchmark
Most comprehensive, transparent benchmark for evaluating autonomous personas (parent/child fractal agent swarms) across the full spectrum of D&D-style mechanics and game-theory challenges: survival, cooperation, defection, goal attainment, combat and non-combat mastery.

References and inspirations:
- Habitica mechanics and party dynamics: [HabitRPG/habitica](https://github.com/HabitRPG/habitica)
- SuperheroDB stat axes and tiering: [superherodb.com](https://www.superherodb.com/)
- GM control/initiative inspiration: [dmdashboard.nl](https://dmdashboard.nl/)
- Target repo to host this benchmark: [bitwikiorg/PersonaBench](https://github.com/bitwikiorg/PersonaBench)

---

## 1) Vision and Design Principles
- Breadth-first fidelity: cover the majority of practical D&D SRD mechanics and adjacent frameworks before deep homebrew rules.
- Game-theory native: every scenario embeds cooperation/defection levers, public goods, signaling, contracts, and reputation.
- Fractal swarm personas: a root “parent” persona spawns children (nested agents) with role specializations; children coordinate within constraints.
- Transparent determinism: seeds, RNG draws, DCs, dice, and logs are public and replayable.
- No normative judgments: we measure outcomes; ethics is an exposed persona parameter, not a score dimension.
- Comparable at multiple time scales: the same scenario can run in small-step (micro-turn) or big-step (macro-turn) modes with fair scoring.

---

## 2) Scope and Success Criteria
- Include all three pillars: Combat, Exploration, Social/Intrigue.
- Support standardized sheets and dice: D&D SRD (5.1 CC), plus adapters for other frameworks; multi-genre overlay via SHDb stats.
- Evaluate both one-shots and multi-encounter arcs.
- Produce robust cross-seed ratings (e.g., per-scenario TrueSkill) with narrow CIs after N≥100 seeds.
- Replays, logs, and leaderboards are downloadable and reproducible end to end.

---

## 3) Persona Model and Fractal Swarm Hierarchy
- Root/Nested Architecture:
  - Root persona defines a policy library, cooperation doctrine, and mutation space.
  - Children are “fractal images”: specialized roles (e.g., Tank/Scout/Face/Controller), parameter tweaks, memory budgets, and communication styles.
  - Swarm constraints: limited shared memory; explicit, logged team channels; optional parent “strategic hints” at fixed cadence.
- Character Sheet Layers (agents self-complete at registration):
  - Identity: name, lineage (root → child), backstory blurb.
  - D&D SRD fields: STR/DEX/CON/INT/WIS/CHA, proficiency, class/subclass, skills/tools, saving throws, level, HP/HD, armor/equipment, spell list, features, feats, languages, senses, background traits/bonds/flaws/ideals.
  - SHDb parallel stats: Intelligence/Strength/Speed/Durability/Power/Combat, Tier, Alignment, Universe; used via conversion tables for cross-genre tests.
  - Habitica overlay: Dailies/Habits/To-Dos that grant pre-sim buffs or consumables; party Challenges yield team-wide boons. Source: [HabitRPG/habitica](https://github.com/HabitRPG/habitica).
  - Behavior declaration: risk tolerance, cooperation mode, deception tolerance, negotiation strategy, objective prioritization.
  - API limits: observation bandwidth, thinking time per step, memory size, tool permissions.
- Communications:
  - Team channel (rate-limited), proximity chat (optional), emotes/signals, and silent coordination via conventions.
  - Deception allowed and logged; not directly scored except via outcomes.

---

## 4) Mechanics Coverage Map (D&D-centric with adapters)
A. Core Dice and RNG
- d20 ability checks and saving throws with proficiency, expertise, and advantage/disadvantage.
- Attack rolls, critical hits/fumbles; damage dice (d4–d12, d100), resistances, vulnerabilities, immunities.
- Contested checks; passive Perception/Insight; bounded accuracy assumptions.
- Public RNG transcript: “who rolled what, when, vs which DC, with what modifiers.”

B. Combat System
- Initiative systems: RAW cyclical + optional speed-ranked; legendary & lair actions; reactions and opportunity attacks.
- Action economy: action, move, bonus, reaction, free; multiattack; concentration.
- Conditions: blinded, charmed, deafened, frightened, grappled, incapacitated, invisible, paralyzed, petrified, poisoned, prone, restrained, stunned, unconscious, exhaustion.
- Movement: grid and theater-of-the-mind variants; difficult terrain; climbing/swimming/flying; verticality and cover; reach and range bands.
- Damage types: slashing/piercing/bludgeoning, fire/cold/lightning/acid/poison/necrotic/radiant/psychic/thunder/force.
- Healing and death: death saves, stabilization, hit dice recovery, revivify effects (if allowed by scenario rules).

C. Magic and Abilities
- Spell prep/slots or points; components; counterspell/dispels; ritual casting; concentration checks; AoE templates.
- Illusions, charms, compulsion, divination limits; antimagic zones; scrolls/wands/staves.
- Class features, feats, maneuvers, wild shape, smites, ki, rage, inspiration/bardic inspiration.

D. Exploration
- Fog of war, line-of-sight (darkvision, blindsight, tremorsense, truesight), lighting; weather and environmental hazards.
- Traps/puzzles; lockpicking, tracking, foraging, mapping; encumbrance/packing; resource usage (rations, torches).
- Overland travel, navigation, random encounters, exhaustion, camping, rests (short/long/gritty).

E. Social & Intrigue
- Attitudes (hostile/neutral/friendly), reputation and faction standing, favors/debts.
- Persuasion/deception/intimidation/insight opposed checks; secrets and rumor webs.
- Contracts, oaths, bargaining, auctions, public goods dilemmas; credibility, sanctions, and enforcement.

F. Economy, Crafting, and Downtime
- Currency, vendors, rarity and attunement; crafting and enchanting with time/cost gates.
- Downtime activities: research, training, contacts, business ventures; clocks and progress tracks.

G. Monsters, NPCs, and Lairs
- Stat blocks (SRD), morale, tactics profiles; minions vs elites; boss phases; lair effects; environmental synergies.

H. Adapters and Cross-Frameworks
- SRD 5.1 baseline (CC BY 4.0). Pathfinder/OSR adapters as optional rule packs.
- SHDb overlay: conversion tables map Intelligence→INT, Durability→CON/HP buffer, Power→spell potency, Combat→proficiency-like bonus, Speed→initiative/movement tiers, Tier→challenge budget.

---

## 5) Game Theory Layer (embedded in scenarios)
- Prisoner’s Dilemma, Public Goods, Stag Hunt, Volunteer’s Dilemma, Ultimatum/Dictator variants, Trust games with reputational carry-over within a run.
- Mechanism design: sealed-bid auctions for loot, VCG-like task assignment, posted-price vendors, escrowed contracts, collateralized promises, oath magic as enforcement.
- Signaling: costly signals (resource burn), cheap talk (chat), semi-binding oaths; signal reliability tracked for future NPC responses.
- Defection detection: track betrayal events, contract breaches, stealth theft, and misinformation; outcomes flow into social/economic consequences and scores.

---

## 6) Temporal Granularity: Small Steps vs Big Steps
- Decision Epochs (DE): the benchmark runs the same world at different DE sizes to test temporal abstraction and sample efficiency.
  - Small-step (micro): 1 DE = ~6s “combat turn” slice; fine control over movement, reactions, positioning.
  - Medium-step: 1 DE = 1 full combat round or 1 scene beat.
  - Big-step (macro): 1 DE = multi-turn macro-action or scene plan with commitment and reaction windows.
- Fairness knobs:
  - Action budget parity: normalize evaluations by total “effective decisions” not wall-clock steps.
  - Partial observability parity: ensure equivalent information per DE via summary observations at macro scales.
  - Reaction windows: even in big-step mode, reserve interrupt slots for reactions/legendary actions.
- Turn Counts (recommendations; scenario-specific and seedable):
  - Short one-shots: 10–15 rounds (micro) or 3–5 DE (macro).
  - Standard quests: 20–40 rounds (micro) or 6–12 DE (macro).
  - Survival gauntlets/endless: hard cap at 60–120 rounds with tiebreakers (HP %, objectives completed, civilians saved).
- Reporting: every run declares DE type, total DEs executed, and per-DE information budget.

---

## 7) Scenario Catalog (initial templates; all embed cooperation levers)
- Goblin Siege (defense + evac under time pressure)
- Wilderness Survival (navigation, weather, foraging)
- Heist in a Magical City (stealth, social, puzzles, crafting)
- Cursed Dungeon Crawl (resource attrition, torch economy, rotating debuffs)
- Social Deduction Hamlet (cult detection; misinformation control)
- Caravan Escort (route planning, ambush defense, supply management)
- Ruined Library Retrieval (INT/WIS heavy; low combat)
- Market Manipulation (trade network, crafting, auctions; externalities)
- Boss Rush (phase mechanics, cooldown sync, positioning)
- Settlement Builder (Habitica-like upkeep mapped to town health)
- Planar Breach Containment (environmental rules, planar traits)
- Skyship Disaster (3D movement, fire control, triage)
Each template ships with: map schema, factions, encounter clocks, economy, social graph, DC table, victory/loss conditions, and weighting for scores.

---

## 8) Scoring and Ranking
- Per-run metrics (normalized 0–1):
  - Survival (HP %, KOs avoided, death saves, revivals)
  - Objective completion and time-to-completion
  - Cooperation Index (assists, heals/guards, resource transfers, comms effectiveness, contract fulfillment)
  - Efficiency (consumable value vs outcome, loot utilization, attrition)
  - Social outcomes (diplomacy success, collateral minimized, reputation delta)
  - Risk-adjusted Value (expected value vs danger taken; penalties for safe-but-stagnant play)
  - Consistency (variance across seeds)
  - Habitica boons utilized (strictly mechanical effects; no lifestyle judgments)
- Cross-run aggregation:
  - TrueSkill/Elo per scenario and global ladders; confidence intervals; seasonal decay.
  - Ladder modes: random-draw fairness ladder; opt-in specialty ladders; fixed squad vs router-assembled party ladders.
- Anti-gaming and constraint audits:
  - Action-cost accounting; exploit detectors; contract/enforcement integrity; team-channel limits; no external comms.

---

## 9) Preparation and Meta-Systems
- Habitica “Prep Board”:
  - Dailies/Habits/To-Dos → pre-sim buffs, consumables, and shop unlocks (inspired by [HabitRPG/habitica](https://github.com/HabitRPG/habitica)).
  - Party Challenges → team-wide wards, supply caches.
- Drafting and Party Assembly:
  - Router drafts parties by role and declared specializations; supports mirror matches and mixed-ethic parties for game-theory richness.
- Vendor/Loadout Phase:
  - Pre-encounter budget to test shopping strategy, auctions, and signaling (who takes scarce items?).

---

## 10) Transparency, Reproducibility, and Governance
- Provenance: content-addressed persona packages; signed manifests; immutable seeds.
- Public artifacts: observation/action logs, RNG transcripts, DC tables used, scoreboard snapshots, and replay files.
- Deterministic RNG: per-entity, per-turn streams; dice are sampled from declared streams; transcripts mirror tabletop rolls.
- Licensing: rely on SRD 5.1 (CC BY 4.0) text/mechanics for D&D elements; avoid non-SRD proprietary content.
- Safety: sandboxed personas; tool whitelists; rate limits; no external networking during runs.

---

## 11) UX and Tools
- GM Control Panel (inspired by [dmdashboard.nl](https://dmdashboard.nl/)):
  - Encounter builder, initiative tracker, conditions/status chips, fog-of-war toggles.
  - Real-time RNG log, DC explainers, and timers.
- Persona Browser:
  - Sheet display with chip-style proficiencies and items (like Image 1), SHDb toggle (like Image 2), Habitica prep view (Images 3–4).
- Replay Viewer:
  - Turn-by-turn map, dice rolls, comms transcript, contract events, and scoring overlays.
- Leaderboards:
  - Per-scenario and global tables; filters by class/tier/ethics/cooperation mode; downloadable run bundles.
- Drag-and-drop creator:
  - Low-friction builder for personas, scenarios, and rule modules with live previews of generated JSON/YAML/DSL artifacts.
  - Inline docstrings and code snippets for every adapter, rule, and scoring module so users can inspect mechanics before publishing.
  - One-click “export to repo” flow that saves generated content alongside human-readable explanations and links back to the governing rules.

---

## 12) Gaps and Missing Ideas (to close before v1)
- Coverage
  - Concentration/stacking rules edge cases; simultaneous triggers/interrupt ordering.
  - Illusion/adjudication boundaries and truth-finding magic.
  - Grappling/shoving/grids with difficult vertical terrain; falling and flight stamina.
  - Underwater/airborne combat, vehicles/mounts, chase rules.
  - Diseases, curses, madness/sanity tracks (opt-in), lingering injuries.
  - Planar/environmental traits (gravity, time dilation, magic traits).
  - Languages/translation, secret writing, codebooks, and miscommunication noise.
  - Spell components (verbal/somatic/material), counters in silence/restraints.
  - Crafting with rare reagents, identification/appraisal uncertainty.
  - Downtime mini-economies; NPC schedules and closed-world supply limits.
  - Pet/companion AI and control limits; summoning duration edge cases.
- Game Theory & Social
  - Collusion vs team cooperation distinctions in mixed parties.
  - Contract variety (escrow, collateral, reputation bonds, oath magic) and breach remedies.
  - Public goods with rivalrous vs non-rivalrous features; tragedy-of-the-commons cases.
- Evaluation & Fairness
  - Macro vs micro DE comparability; define the “effective-decision budget” standard.
  - Ties and stalemates tiebreakers beyond HP% (e.g., objective proximity, risk-adjusted value).
  - Robustness to deceptive comms and misinformation; scoring that rewards truth discovery.
  - Cross-framework fairness when SHDb overlay is active (conversion table validation set).
- Operations
  - Seed-bank stratification for difficulty tiers.
  - Exploit bounty program and adjudication policy.
  - Versioning and migration of evaluator/engine affecting historical scores.

---

## 13) Milestones
- M0: Design sign-off (this plan), finalize DE standards and scoring taxonomy.
- M1: Engine core (combat/exploration/social), SRD rules, RNG transcript, replay format.
- M2: Three launch scenarios (Goblin Siege, Heist, Wilderness), baseline personas for 4 archetypes.
- M3: Habitica Prep Board integration; vendor/economy; party Challenges buffs.
- M4: Game-theory primitives (contracts, auctions, public goods); cooperation metrics v1.
- M5: SHDb overlay + conversion; cross-genre test mode.
- M6: Leaderboards, replays UI, downloadable bundles; seed sweep harness and CI.
- M7: Season 0 tournament; exploit audit; scoring calibration and published CIs.

---

## 14) Open Questions
- Should reputation persist within a scenario arc only, or across the entire season for the same persona lineage?
- How strict should macro-step commitments be, and how many reaction windows guarantee fairness?
- What is the minimum-information summary permissible for big-step observations?
- Do we support resurrection magic in early ladders, or gate it for later seasons to keep survival pressure high?
- Where should we cap the size of fractal swarms (children per parent) to prevent swarm dominance?

---

## 15) Defaults and Recommendations (initial)
- DE defaults: micro for combat-heavy templates; macro for social/heist templates; both supported for cross-checks.
- Run length targets: short 12 rounds; standard 30 rounds; survival 90-round cap with tiebreakers.
- Party size: 3–5; router assembles balanced parties unless testing “solo resilience.”
- Logging: full RNG and DC explainers on by default; privacy not required for benchmark personas.

This plan aims to ensure that different characters naturally gravitate to different worlds and behave procedurally, while the benchmark measures not only “can they fight” but “can they plan, cooperate, negotiate, keep promises, and survive” under the broadest slice of D&D and adjacent mechanics we can faithfully represent.