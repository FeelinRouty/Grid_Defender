---

description: "Task list for Grid Defender v1 — First Playable"
---

# Tasks: Grid Defender v1 — First Playable

**Input**: Design documents from `/specs/001-grid-defender-v1/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (evaluator, content-schema, ui), quickstart.md

**Tests**: Required. Constitution *Verification & Quality Gates* and spec SC-001 call for hand-checked cases, and those cases come from `contracts/evaluator.md` C1–C14. Write expected results by hand and **never compute them with the evaluator**. Each test must fail before its implementation exists.

**Organization**: Tasks are grouped by user story. P1 stories come first (US1, US2, US5), then P2 (US3, US4).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: The user story the task belongs to (US1–US5)
- Paths are relative to the repository root (single static project, see plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: The project skeleton and test harness

- [X] T001 Create the directories `engine/`, `ui/`, `data/` and `tests/` at the repository root, following the plan.md source tree
- [X] T002 [P] Create `index.html` with the semantic page shell: `<main>`, a heading, a polite live region `#announcer`, empty view containers and `<script type="module" src="main.js">`. Use relative paths only.
- [X] T003 [P] Create `style.css` with color/spacing tokens, the zone color tokens `zone-a`/`zone-b`/`zone-c`, a visible `:focus-visible` style, and a `@media (prefers-reduced-motion: reduce)` block (research R8)
- [X] T004 [P] Create the assert/describe/summary helpers in `tests/harness.js`. Report pass/fail totals and failed case IDs, and treat zero discovered tests as a failure (research R10).
- [X] T005 [P] Create the browser runner `tests/index.html`. It imports every `tests/*.test.js` module and renders the totals and failed IDs.
- [X] T006 [P] Create the Node runner `tests/run-node.mjs`. It imports the same suites, loads `data/levels.json` through `fs`, and exits non-zero on any failure or on zero tests.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The pure engine that every story depends on: flow universe, matching, evaluation and content loading

**⚠️ CRITICAL**: No user-story UI work can begin until this phase is complete

- [X] T007 Write `tests/cases.js` with hand-derived expected results for C1–C14 from `contracts/evaluator.md`. Each case gives: round ID, rulesByConduit, expected `status`, ordered failure codes, the example flow, and the packet verdicts the contract lists.
- [X] T008 [P] Author the two boards in `data/levels.json`, following `contracts/content-schema.md` and spec *Round Content*:
  - `two-zone`: Control Center rows 1–3, Substation rows 5–8, conduit `A` at D4; M C2, H F2, R1 B6, R2 G6, X E7
  - `three-zone`: Engineering A1–C3, Control Center E1–H3, Substation rows 5–8, conduit `1` at D2, conduit `2` at F4; E B2, V B3, M F2, H G2, R1 B6, R2 G6

  Cite `data-model.md` Board.zones, Board.assets, Board.conduits, Zone.slt, Conduit.joins, Asset.role.
- [X] T009 [P] Write `tests/rules.test.js` with cases C1–C4 and C13 for round 1.1. Assert status, failure order, example flow and packet verdicts. The tests must fail at this point.
- [X] T010 Implement `engine/flows.js` with these functions:
  - `zoneOf(board, assetId)`
  - `conduitPath(board, srcZone, dstZone)` over the zone graph (exactly one path, per `data-model.md` Board)
  - `portClass(flow)`
  - `enumerateUniverse(board, availableAssets)` in canonical order (research R7)
  - `classify(flow, conduit, required, effectiveSlt)`, which returns required/dont-care/forbidden (FR-013, research R4)
  - `effectiveSlt(conduit, zones, sltOverrides)` (FR-015)

  Cite `data-model.md` Flow.variant, Flow.fc, Conduit.joins, Level.sltOverrides.
- [X] T011 Implement rule-card completeness and matching in `engine/rules.js`:
  - `cardErrors(card)`: `fcs` must be non-empty when service is `dnp3`
  - `matches(card, flow, board)` for asset, zone and any; `port-20000` matches both 20000 variants (FR-011)
  - `decide(rules, flow, board)`: first match wins, with implicit deny (FR-009)

  Cite `data-model.md` RuleCard.action, RuleCard.src, RuleCard.dst, RuleCard.service, RuleCard.fcs.
- [X] T012 Implement `evaluateRound(round, board, rulesByConduit)` in `engine/rules.js` per the `contracts/evaluator.md` algorithm:
  - steps 1–6: invalid-input, universe, decide, classify, the four failure codes in R7 order, and the example flow with its `count`
  - step 7: packet verdicts, covering new, in-session/no-session and out-of-reach

  It depends on T010 and T011.
- [X] T013 Add shadowed and never-matches detection to `engine/rules.js` (research R6, FR-016), returning `{conduitId, ruleIndex, byRuleIndex, kind}`
- [X] T014 Implement `expandTicket(round)` in `engine/content.js`, which expands `fcs[]` into one Flow per FC (cite `data-model.md` Round.required), plus a minimal `loadContent(json)` that returns the boards and levels by ID
- [X] T015 Author the Level 1 entry and its briefing (paragraphs, worked example, simplifications, sources) plus round 1.1 in `data/levels.json`: ticket, the four wave packets p1–p4, three hints, feedback text and source IDs, exactly as in `contracts/content-schema.md`. Cite `data-model.md` Briefing.workedExample, Briefing.simplifications. Cite `data-model.md` Round.availableAssets, Round.wave, Round.hints, WavePacket.kind, WavePacket.parent.
- [X] T016 Run `node tests/run-node.mjs` and `tests/index.html`. C1–C4 and C13 must pass. Record the totals in the task notes.

**Checkpoint**: The rule is proven for round 1.1 with no UI (plan Slice 1)

---

## Phase 3: User Story 1 - Write a conduit policy and see it tested (Priority: P1) 🎯 MVP

**Goal**: Round 1.1 is playable end to end: briefing, board, rule editor, Run Wave, result and log

**Independent Test**: From a fresh session, play round 1.1 with the C1 and C2 rule sets. The outcomes match the cases, and an incomplete card gives guidance without counting an attempt (quickstart V1–V4).

### Tests for User Story 1

- [X] T017 [P] [US1] Write `tests/state.test.js` cases:
  - a fresh session opens on `briefing(L1)`
  - Start opens round 1.1 with empty rules (FR-008a)
  - invalid input leaves attempts unchanged (C13)
  - a wrong run gives attempts +1
  - a correct run sets completed and enables Next

  Cite `data-model.md` Session state transitions.

### Implementation for User Story 1

- [X] T018 [US1] Implement the pure session reducer in `engine/state.js` with these actions: `loaded`, `start`, `editRules`, `runWave(result)`, `next`. They update `view`, `rulesByConduit`, `lastResult` and `rounds[id].attempts/completed` per the `data-model.md` Session state transitions.
- [X] T019 [P] [US1] Implement `explain(result, round, board)` in `engine/feedback.js`. It fills the `round.feedback[code]` templates with `{flow}`, `{conduit}` and `{rule}`, and adds no reason the evaluator did not report (Principle VI).
- [X] T020 [P] [US1] Implement the 8×8 visual grid (aria-hidden) in `ui/board.js`, showing coordinates, zone colors and SL-T badges, asset glyphs and conduit cells, plus the always-visible **Board details** table: zones (name, SL-T, cells), assets (glyph, name, role, cell, zone) and conduits (cell, joins, effective SL-T) (FR-001, FR-028). Render only the assets in the round's `data-model.md` Round.availableAssets.
- [X] T021 [P] [US1] Implement the rule-card editor in `ui/editor.js` per `contracts/ui.md`:
  - native selects for action, source, destination and service
  - a FC checkbox `<fieldset>` that is enabled only for DNP3
  - Add rule, capped at 8 with an explanation when the cap is reached
  - Move up, Move down and Delete, each with an accessible name that includes the rule number

  Source and destination options list only the assets in `data-model.md` Round.availableAssets, plus their zones and `any`. Cite `data-model.md` RuleCard.fcs, RuleCard.src, RuleCard.dst.
- [X] T022 [P] [US1] Implement the wave log in `ui/wave.js`, using the `contracts/ui.md` line format for every packet (FR-019). Leave the animation hook as a no-op for now.
- [X] T023 [US1] Implement the briefing view and the round view in `ui/render.js`:
  - the round view holds the ticket, board, editor, Run Wave, result panel, log and Next (disabled until completed)
  - announce results in `#announcer`
  - on invalid input, focus the first empty field and show guidance next to it (FR-018, FR-020)
- [X] T024 [US1] Wire up `main.js`: fetch `data/levels.json` (relative URL), load the content, dispatch reducer actions, and re-render. Run Wave calls `evaluateRound` and then `runWave(result)`.
- [X] T025 [US1] Run quickstart V1–V4 in a browser and record pass/fail with the date and browser in the task notes

**Checkpoint**: The MVP is playable. Round 1.1 is graded correctly and gives explained feedback.

---

## Phase 4: User Story 2 - Progress through the six-round ladder (Priority: P1)

**Goal**: All 3 levels and 6 rounds, content validation, Next and level flow, summary and restart

**Independent Test**: Complete all six rounds with the reference rule sets, then check Next, the summary and Restart/Cancel (quickstart V5, V8, V9, V13).

### Tests for User Story 2

- [X] T026 [P] [US2] Add C5–C12 and C14 to `tests/rules.test.js` (using the expectations in `tests/cases.js`)
- [X] T027 [P] [US2] Write `tests/content.test.js`. It checks that the shipped file validates, and that mutated copies produce each error code in `contracts/evaluator.md`, including C12 `unknown-asset`, `zone-overlap`, `conduit-joins`, `slt-ticket`, `limit-stoppable`, `bad-parent` and `hint-count`. Cite `data-model.md` Content.schemaVersion, Level.rounds, Round.hints, WavePacket.limit, WavePacket.actualSrc.
- [X] T028 [P] [US2] Add these state tests to `tests/state.test.js`:
  - repeat Run Wave after success changes nothing (US2-2)
  - Next goes from round to round, then to the next briefing, then to the summary
  - rounds open strictly in order (FR-024)
  - Restart → Cancel leaves the session unchanged
  - Restart → Confirm returns a fresh session (FR-025)

### Implementation for User Story 2

- [X] T029 [US2] Author rounds 1.2, 2.1 and 2.2 in `data/levels.json`, with the tickets, waves and limit packets from spec *Round Content*:
  - 1.2: R1→R2 `intra-zone`
  - 2.1: in-session 0x82 with `parent`
  - 2.2: X available; H spoofing M → R2, with `actualSrc: "H"`

  Include the Level 2 briefing and the hints (the Level 1 briefing is written in T015). Cite `data-model.md` WavePacket.limit, WavePacket.actualSrc, WavePacket.parent, Briefing.workedExample.
- [X] T030 [US2] Author Level 3 in `data/levels.json`, with `sltOverrides` setting the Substation to 3 and rounds 3.1 and 3.2. 3.1 includes the shadowing lesson, the compromised master and the non-DNP3 tunnel. 3.2 includes E→R2 across conduits 1 and 2 and the per-asset DIRECT_OPERATE. Include the briefing and hints. Cite `data-model.md` Level.sltOverrides, Round.required.
- [X] T031 [US2] Implement the full `validateContent(doc)` in `engine/content.js`, covering every error code in `contracts/evaluator.md`, including the zone-graph connected/acyclic check and the limit-packet rules. Cite `data-model.md` Content.schemaVersion, Source.id, Board.id, Board.zones, Board.conduits, Zone.cells, Asset.id, Asset.cell, Conduit.cell, Level.id, Level.rounds, Round.id, Round.sourceIds, Round.feedback, Round.hints, Round.required, WavePacket.id, WavePacket.limit, WavePacket.parent, WavePacket.actualSrc.
- [X] T032 [US2] Extend `engine/state.js` with these actions: `next` across rounds and levels to the summary, `requestRestart`, `confirmRestart`, `cancelRestart`, and `rerun` after completion with no counter change (FR-022 to FR-025)
- [X] T033 [US2] Add the conduit selector for Level 3 (one independent rule list per conduit, FR-008) in `ui/editor.js`
- [X] T034 [US2] Add to `ui/render.js`:
  - the summary view: a per-round table of completed, attempts and help used
  - the Restart confirmation dialog
  - the content-error view, which shows the level/round ID and the errors and offers Retry
- [X] T035 [US2] Make `main.js` run `validateContent` before play and route to the content-error view on failure, listing every invalid level/round ID and error. In v1 this blocks the whole game (spec Edge Cases, FR-005).
- [X] T036 [US2] Run all test suites; C1–C14 must pass. Add a timing check to `tests/rules.test.js`: `evaluateRound` on round 3.2 with the C9 rules finishes in under 100 ms (an engine budget well inside SC-005). Run quickstart V5, V8, V9, V13 and V14, and record the results.

**Checkpoint**: The full ladder is playable and graded. US1 still passes.

---

## Phase 5: User Story 5 - Play by keyboard and with reduced motion (Priority: P1)

**Goal**: Keyboard-complete play, text equivalents, packet animation that respects reduced motion, and the 768 px layout

**Independent Test**: Complete round 1.1 keyboard-only with reduced motion on, and play at 768 px wide (quickstart V10–V12).

### Implementation for User Story 5

- [X] T037 [US5] Implement the packet animation in `ui/wave.js`:
  - dots move along the path cells
  - limit packets are drawn neutral and dashed
  - the whole wave lasts about 3 s at most
  - the result panel and log render before the animation starts
  - the animation is skipped entirely under `prefers-reduced-motion` (FR-029, `contracts/ui.md` Motion)
- [X] T038 [US5] Manage focus on each view change in `ui/render.js` (focus targets per `contracts/ui.md` Views). Keep the tab order to ticket → board details → conduit selector → rules → Run Wave → Help → result → Next.
- [X] T039 [P] [US5] Add the responsive layout to `style.css`:
  - two columns at 1024 px and up; stacked below that, down to 768 px
  - no horizontal page scroll
  - rule list and log scroll inside labelled regions
  - Run Wave stays outside the scrolling regions (FR-030, research R9)
- [X] T040 [US5] Make every result state show text and an icon as well as color: allowed/denied/out-of-reach styles, plus a color-independent badge (FR-027), in `style.css` and `ui/wave.js`
- [X] T041 [US5] Run quickstart V10–V12 and record what was actually checked: keyboard, reduced motion and the 768 px window. Do not claim accessibility certification.

**Checkpoint**: All P1 stories are complete

---

## Phase 6: User Story 3 - Learn from targeted feedback and help (Priority: P2)

**Goal**: Three help tiers with assistance recorded honestly, specific feedback, and shadowed-rule notes

**Independent Test**: In round 2.1, submit the both-directions rule set (C5), read the feedback, then step through the three help tiers (quickstart V6).

### Tests for User Story 3

- [X] T042 [P] [US3] Add help tests to `tests/state.test.js`: `help(tier)` raises `helpTier` to the highest tier reached and never completes the round or changes attempts. Viewing tier 3 makes the summary show "solution viewed". Cite `data-model.md` Session state `rounds[id].helpTier`.

### Implementation for User Story 3

- [X] T043 [US3] Add the `help(tier)` action to `engine/state.js`
- [X] T044 [US3] Add a Help control to `ui/render.js` that reveals the method, then the worked step, then the read-only reference rules, and announces "Hint n of 3 shown". It must never write to the rule list (FR-021, clarify Q3).
- [X] T045 [US3] Show shadowed and never-matches notes next to the affected rule cards in `ui/editor.js`, and list them in the result panel as information (FR-016)
- [X] T046 [US3] Review every `feedback` entry in `data/levels.json` to check that it names the mistake, the values involved and a next step, and that the correct-answer text explains why the policy is exactly least privilege (FR-020). Fix the wording to match.
- [X] T047 [US3] Run quickstart V6 and record the result

---

## Phase 7: User Story 4 - See the honest limits of a conduit (Priority: P2)

**Goal**: Limit packets are explained clearly, styled neutrally and never graded

**Independent Test**: Solve rounds 1.2 and 2.2 and check the limit packets' verdict, styling and explanation text (quickstart V7).

### Tests for User Story 4

- [X] T048 [P] [US4] Add assertions to `tests/rules.test.js` that a limit packet never appears in `failures` and that its verdict is `out-of-reach` in both C14 (intra-zone, path `[]`) and C6 (spoofed, still walked)

### Implementation for User Story 4

- [X] T049 [US4] Add limit-packet explanations to `engine/feedback.js` and `data/levels.json`:
  - intra-zone: split the zone, or add controls inside it
  - spoofed source: one sentence on DNP3 Secure Authentication and one on switch anti-spoofing, with the IEEE 1815 source link (clarify Q5)
- [X] T050 [US4] Render the "out of reach" verdicts in the log and the result panel in a neutral style, never as a failure (`ui/wave.js`, `ui/render.js`)
- [X] T051 [US4] Run quickstart V7 and record the result

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T052 [P] Rewrite `README.md` from the workshop template. Cover:
  - the pitch and how to play
  - the exact run and test commands from quickstart.md
  - the technical model and its simplifications (SL-T mapping, honest limits, exclusions)
  - the sources, each with its `verified` status
  - the verification table (pass / fail / not run, with date and environment)
- [X] T053 [P] Check every source record in `data/levels.json` (cite `data-model.md` Source.verified). Set `verified: true` only after the section has been checked against the standard; otherwise leave it `false` and list it in the README as not run (research R11).
- [X] T054 Review every briefing, hint and feedback string against its cited source and the constitution's Scope & Technical Model. Check for no Purdue references, and that "SL-T mapping is a game simplification" appears in each level briefing.
- [X] T055 Run a fresh-checkout run of quickstart V1–V19 and the test runners. Record pass / fail / not run for **every acceptance criterion** (US1-1 to US5-4) in the README verification table, using the AC → scenario/test map in quickstart.md, with date and environment (Principle VII). Confirm there is no lives, health, timer, score or speed-bonus element anywhere (FR-026).
- [X] T056 Confirm that every path is relative and correctly cased by serving from a subdirectory (`python3 -m http.server` from the parent, then open `/Grid_Defender/`)
- [X] T057 Prove that content alone can add a round (Principle VI, SC-007): add a trial round `1.3` to a fixture copy in `tests/fixtures/trial-round.json`, and add a `tests/content.test.js` case that validates and grades it with hand-written expectations. Confirm that nothing under `engine/` changed by comparing `shasum engine/*.js` before and after, and record the result in the README.
- [X] T058 ~~Run one playtest with a target learner (a network engineer new to OT) and record it in the README: total play time for six rounds (SC-002, target ≤ 25 min), and in how many of the six rounds they could state their mistake from the feedback alone (SC-003, target ≥ 5).~~ **Descoped 2026-11-21 by the project owner: not run** (see log)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup and blocks every story. T010 → T011 → T012 → T013, and T014 and T015 come before T016.
- **US1 (Phase 3)**: depends on Foundational
- **US2 (Phase 4)**: depends on US1's reducer, render and main wiring (T018, T023, T024)
- **US5 (Phase 5)**: depends on US1's UI. It can run alongside US2, except that T038 and T034 both edit `ui/render.js`, so do those in sequence.
- **US3 (Phase 6)**: depends on US1. Its content review (T046) is best done after T029 and T030.
- **US4 (Phase 7)**: depends on T029 (the rounds containing limit packets) and T022 (the log)
- **Polish (Phase 8)**: depends on every story you include

### Within Each Story

Tests first (they must fail) → engine/state → UI → manual validation recorded

### Parallel Opportunities

- Setup: T002–T006 in parallel after T001
- Foundational: T008 and T009 in parallel with each other, and alongside T010
- US1: T019, T020, T021 and T022 in parallel (different files) after T018
- US2: T026, T027 and T028 in parallel. T029 and T030 edit the same file, so do them in sequence.
- US5: T039 in parallel with T037 (T040 edits `style.css` and `ui/wave.js`, so it runs after T037 and T039)
- Polish: T052 and T053 in parallel; T052's sources table is finalised after T053. T057 and T058 can run in parallel with T054.

---

## Parallel Example: User Story 1

```text
Task: "Implement explain() in engine/feedback.js"            (T019)
Task: "Implement 8×8 grid + Board details in ui/board.js"   (T020)
Task: "Implement rule-card editor in ui/editor.js"          (T021)
Task: "Implement wave log in ui/wave.js"                    (T022)
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 Setup, then Phase 2 Foundational. **Stop**: C1–C4 and C13 pass with no UI.
2. Phase 3 US1. **Stop**: V1–V4 pass. Round 1.1 is a demoable game.

### Incremental Delivery

US1 → US2 (full ladder) → US5 (access and motion) → US3 (help) → US4 (limits) → Polish. All the P1
stories (US1, US2, US5) together are the shippable workshop build.

### Scope Cuts (plan.md, Principle VII)

If time runs short, cut in this order:
1. T037 animation. The log stays, and so does the FR-029 behavior.
2. Round 3.2 in T030, and C9/C11 with it. Update spec AC2-1, FR-023, and the summary's round count.
3. The worked-step hint text. The method hints stay.

Never cut evaluator correctness, feedback, keyboard access, text equivalents or recorded verification.

---

## Notes

- Expected results in `tests/cases.js` are written by hand from the spec and contracts, never generated by running the engine.
- Each task that cites `data-model.md` uses the field definitions there and adds no new constraints.
- Commit after each phase checkpoint, and record verification results as you go.

---

## Implementation log

### 2026-11-21 · MVP (T001–T025)

- **T016** `node tests/run-node.mjs` → PASS 14/14 (Evaluator cases 5/5: C1, C2, C3, C4, C13; purity 1/1; State · US1 8/8). Browser runner `http://127.0.0.1:8000/tests/` → PASS 14/14.
- **T025** Manual run in the Claude desktop browser pane (Chromium), 1024×768, served by `python3 -m http.server 8000 --bind 127.0.0.1`:
  - V1 fresh start → **pass** (Level 1 briefing first; focus on heading; no console errors)
  - V4 incomplete card → **pass** (guidance "needs a destination" beside the card and announced; focus on Destination; attempts 0)
  - V2 zone-wide permit → **pass** (attack-allowed H→R1 READ via rule 1; over-permissive, 28 flows; attempts 1; Next disabled)
  - V3 least-privilege rule → **pass** (correct; H→R1 and telnet denied by the implicit deny; attempts 2; Next enabled)
  - Repeat Run Wave after success → counters unchanged (spot check of V5, recorded formally in T036)
- Fixes made during T025: rule-card dropdown labels are now siblings rather than wrappers (accessible names were mixing in the selected value); the live region uses `setTimeout` instead of `requestAnimationFrame` so it also fires in background tabs.
- Not yet done (later phases): content validation (T031), Levels 2–3 content, help tiers, packet animation, Restart, README. `data/levels.json` source sections are marked "to be confirmed" (`verified: false`) until T053.

### 2026-11-21 · Phase 4, User Story 2 (T026–T036)

- **Tests** `node tests/run-node.mjs` → PASS 49/49, and the browser runner gives the same result. Breakdown:
  - Evaluator cases C1–C11, C13, C14: 13/13
  - Limit packets: 2/2
  - Performance: 1/1. Round 3.2 evaluates well under the 100 ms budget.
  - Purity: 1/1
  - Content: shipped file 2/2, and 16/16 validation errors, including C12 `unknown-asset`
  - State: US1 8/8, US2 6/6
- **Content** `data/levels.json` now holds all 6 rounds, the Level 2 and Level 3 briefings, and the three-zone board with `sltOverrides` setting the Substation to 3.
- **Manual run** in the Claude desktop browser pane (Chromium), 1024×768, with a scripted DOM playthrough:
  - Full ladder 1.1 → 3.2 → summary → **pass**. Each round's mistake gave its targeted feedback: C2 zone-wide, C5 both directions, C6 inbound unsolicited, C10 shadowed deny (with a shadowed note), C9 one conduit only (`wrong-conduit` at conduit 1). Each round then passed with its reference rules.
  - V5 Run Wave again after solving → **pass** (counters unchanged)
  - V8 two conduits → **pass** (`wrong-conduit`, then correct once a port-only rule was added on conduit 1)
  - V9 Restart → **pass** (Cancel and Escape keep the summary and return focus to Restart; Confirm opens a fresh Level 1 briefing with attempts at 0)
  - V13 content error → **pass** (round 1.1 changed to `R3` → "Round 1.1 unavailable: unknown-asset", the game doesn't start, and Restart is disabled; the file was restored afterwards)
  - V14 feedback speed → **pass** (Run Wave click to a filled result panel and log took about 1 ms)
- **Changes made during the run**
  - The log line for a packet that crosses two conduits now shows each hop: `passed conduit 1 · rule 1; stopped at conduit 2 · …`. Packet results gained a `hops` field, now documented in `contracts/evaluator.md`.
  - Fixed the grammar of the shadowed-rule note.
- **Doc change** In `data-model.md`, the level and round counts are now "≥ 1", with the v1 counts (3 levels × 2 rounds) checked by a content test. If the validator enforced exactly 2 rounds per level, the T057 trial round 1.3 would be rejected.
- **V15** (attempts and summary) is partly covered: the summary table shows completed, attempts and help for all 6 rounds. Its help column reads "None" until US3 adds the help tiers.

### 2026-11-21 · Phase 5, User Story 5 (T037–T041)

- **Built**
  - Packet animation (`ui/wave.js`): dots fly from the real sender through each conduit they reach, and stop at the conduit that denies them. Limit packets are drawn neutral and dashed. The wave lasts about 3 s at most, and starting a new wave cancels the old one. The result panel, log and announcement are produced *before* the animation, which nothing waits on. The animation is skipped under `prefers-reduced-motion`.
  - Tab order is now ticket → board → conduit picker → rules → Run Wave → result → **Next** → log. Next moved below the feedback and gained a hint explaining when it unlocks.
  - Each log line now starts with a verdict badge: ✓ ALLOW, ✕ DENY, ↩ IN-SESSION, ⊘ NO SESSION, ◌ OUT OF REACH.
  - The board column scrolls on its own if it ever overflows. There is no page-level overflow masking.
- **Tests** `node tests/run-node.mjs` → PASS 49/49 (unchanged).
- **T041, what was actually checked** (Claude desktop browser pane, Chromium):
  - **V10 keyboard: partial pass.**
    - Checked with real key presses: Tab from the briefing heading → source link → Start, then Enter opens round 1.1 with focus on its heading. Tab → Add rule, and Enter adds a card and focuses Action.
    - From Service, Tab skips the disabled FC boxes and Move buttons: Delete → Add rule → Run Wave. Enter on Run Wave gives "✓ Correct", announced as "Round 1.1: correct.".
    - Tab → Next shows a visible 3 px focus ring. Enter on Next opens round 1.2 with focus on its heading.
    - **Not verified:** choosing an option inside a native `<select>` with the keyboard. The automation's synthetic keys (type-ahead, arrows plus Enter) don't drive the pane's native popup, so the four values were set with form input. A human keyboard check is still needed.
  - **V11 reduced motion: pass (simulated).** With `matchMedia('(prefers-reduced-motion: reduce)')` stubbed to true, no packet dots were created, and the result and log rendered at once. The OS setting itself was not toggled.
  - **V12 at 768 px: pass.** The 768×1024 viewport was emulated on round 3.2, which has the largest editor.
    - The layout stacks (board above rules), and page `scrollWidth` is 768 = viewport, so there is no horizontal scroll.
    - Run Wave sits outside the scrolling regions.
    - Long dropdown labels are truncated visually but stay usable.
  - **V18 (partial)** Every packet has a log line, and the result is announced through the live region. Not checked with a real screen reader.
  - **V19** The Board details table for round 3.1 lists 3 zones with SL-T and cells, 6 assets, and conduits 1 and 2 with effective SL-T 2 and 3.
  - Animation spot check: dots were sampled mid-flight and were visible. The first build had every keyframe at opacity 0 (fixed).
- **No accessibility certification is claimed.**

### 2026-11-21 · Phase 6, User Story 3 (T042–T047)

- **Tests** `node tests/run-node.mjs` → PASS 53/53. The new suite is State · US3 help, 4/4: help keeps the highest tier reached, never completes a round or adds an attempt, is ignored outside a round or for a bad tier, and still shows after the round is solved.
- **Built**
  - The Help button reveals one tier per press (method → worked step → read-only reference rules), announces "Hint n of 3 shown", and moves focus to the new hint. It never writes to the rule list.
  - Shadowed and never-matches notes now appear beside the affected rule card, as well as in the result panel. A note clears as soon as that card is edited.
- **T046 content review** I scripted a check that every round's four failure templates name the `{flow}` and give a next step. Two gaps were fixed in `data/levels.json`:
  - The shared wrong-conduit text now says "add a matching permit on conduit {conduit}".
  - 2.2's attack-allowed text now says "Remove the Substation-to-Control-Center permit".

  Every round's correct-answer text explains why the policy is exactly least privilege. (`gen_levels.py` in the scratchpad is now out of date; `data/levels.json` is the source of truth.)
- **Manual run** (Claude desktop browser pane, Chromium, scripted DOM playthrough):
  - **V6: pass.** Three Help presses on 1.1 show method → worked step → reference rules, then the button disables ("All help shown"). The rule list stays empty, attempts stay 0, Next stays locked, and the summary later shows "Solution viewed" for 1.1 and "Method hint" for 1.2.
  - **V15: pass.** The summary shows completed, valid attempts and help used for all 6 rounds.
  - **V16: pass.** The both-directions mistake on 2.1 gives an attack-allowed message naming R1 → M via rule 2, with the master-initiates and in-session-0x82 explanation.
  - **V17: pass.** The C10 rules on 3.1 show "Rule 2 … can never match: rule 1 above it already matches all of its traffic" both beside rule 2 and in the result panel.
- **Fix made during the run** Each hint showed its label twice ("Method: Method: …"). The hint text carries its own label, so the UI prefix was removed.

### 2026-11-21 · Phase 7, User Story 4 (T048–T051)

- **Tests** `node tests/run-node.mjs` → PASS 61/61. New suites:
  - **Limit packets never graded, 5/5.** Covers rounds 1.2 and 2.2 under correct, zone-wide, inbound and deny-all rule sets. Limit packets are always out of reach and never appear in failures, and 2.2 is graded correct even though the spoofed packet passes the conduit.
  - **Limit explanations, 3/3.** The intra-zone note names the zone remedy. The spoofed note names Secure Authentication and anti-spoofing and cites `ieee1815-sa`. The announcement stays "Round 1.2: correct.".
- **Built**
  - `explain()` emits a `limit` item for each out-of-reach packet.
  - `data/levels.json` gives the 1.2 and 2.2 limit packets an `explanation` and `sourceIds` (the new optional `WavePacket.explanation` and `WavePacket.sourceIds` fields, documented in data-model.md and checked by the validator).
  - In the result panel, limit notes render as a neutral, dashed "◌ Out of reach (packet #n)" box with the source citation. They are never shown as failures.
  - The 1.2 and 2.2 correct-answer texts now point to that note instead of repeating it.
  - The spoofed log line names the real sender: "forged source (really sent by H(F2))".
- **V7: pass** (Claude desktop browser pane, Chromium). 1.2 and 2.2 were solved with the reference rules. Both show "✓ Correct", attempts 1, and the out-of-reach notes for packets #4 and #5 with their remedies. The 2.2 source cites IEEE 1815 Secure Authentication, marked "(section not yet verified)" until T053.

### 2026-11-21 · Phase 8, polish (T052–T058)

- **T057 ✓** `tests/fixtures/trial-round.json` adds round 1.3 (HMI → R2 READ) through content alone. The new suite "Content · trial round added by data only", 3/3, checks three things: the content still validates, `permit H → R2 DNP3 {READ}` is correct, and `permit H → Substation tcp/20000` gives attack-allowed + over-permissive (example H → R1 READ). All of those expectations were derived by hand. The `shasum engine/*.js` output was identical before and after. Both runners now also load fixtures (`FIXTURES` in `tests/suites.js`).
- **T053 partial, left open** IANA confirms `dnp 20000/tcp` (registry page last updated 2026-11-19, checked 2026-11-21), so `iana-dnp` is now `verified: true`. The five IEEE 1815 and IEC 62443 records stay `verified: false` because the standards are paywalled. A person with licensed copies needs to fill in the sections and flip the flags.
- **T054 partial, left open** Every content string was checked against the constitution's Scope & Technical Model: no Purdue references, every level briefing states that the SL-T mapping is a game simplification, and every round has its ticket, hints, feedback and sources. The comparison against the cited standards' text is blocked on T053.
- **T052 ✓** `README.md` was rewritten from the template. It covers how to play, run and test commands, the technical model and its simplifications, outside-the-model items, sources with their checked status, and a pass / partial / not-run verification table per acceptance criterion.
- **T055 ✓** The game files (no `.git`, no specs) were copied to a fresh folder.
  - `node tests/run-node.mjs` → PASS 64/64.
  - The browser runner → PASS 64/64.
  - A full playthrough of 1.1 → 3.2 → summary passed, including the 1.1 zone-wide mistake and the 3.2 one-conduit mistake, with no console errors.
  - The per-acceptance-criterion results are recorded in the README. Earlier manual V-scenario results are in the phase logs above.
- **T056 ✓** The copy was served from its parent folder on port 8001 and opened at `/Grid_Defender/` and `/Grid_Defender/tests/`. Every request (HTML, CSS, 12 modules, `levels.json`, the fixture) went to `/Grid_Defender/...` and returned 200. (I served a scratch copy rather than the user's Desktop folder.)
- **T058 not run, left open** This needs a target learner (a network engineer new to OT). The README lists it as Not run, with the SC-002 and SC-003 targets.

### 2026-11-21 · T053/T054 closed by owner decision: broaden claims to the evidence

- **Decision (project owner)** The ISA/IEC 62443 and IEEE 1815 texts aren't available. Claims are therefore narrowed to what readable public sources support, and anything else is labelled as a game assumption. This is recorded in constitution v1.1.0 (MINOR change to Principle I), `spec.md` Assumptions and `research.md` R11.
- **Sources read** (now the only records in `data/levels.json`, each `verified: true, checked: 2026-11-21`):
  - IANA registry: `dnp` 20000/tcp
  - Wireshark `packet-dnp.c`: function-code values and names, `TCP_PORT_DNP 20000`, and the status "No 'SELECT' Received"
  - Cisco 62443-3-3 white paper: zone and conduit definitions, SL 0–4, FR 5 with SR 5.1 and 5.2
  - Cremers et al. 2017 SAv5 analysis: IEEE 1815-2012 Chapter 7; outstations challenge critical requests; spoofing, modification and replay. I read it from the PDF via isolated text extraction.
  - Extreme Networks SLX-OS guide: IP Source Guard
- **Could not fetch** (403/404): Rockwell, Schneider and ABB DNP3 help pages, and the ISA Quick Start Guide.
- **Content changes**
  - L1 briefing: zone and conduit wording follows the Cisco definitions; the SL 2 and SL 3 definitions were added; per-zone SL-T and the master-opens-TCP model are labelled as game assumptions.
  - L2 briefing and 2.1 feedback: "never needed for normal DNP3" became "in this game's model"; the dual-endpoint mention was removed.
  - L3 briefing: SELECT and OPERATE are described as a pair a device can refuse without a prior SELECT; DIRECT_OPERATE without the select step is labelled as the game's meaning; "a utility's own decision" became "in this game, the ticket decides".
  - The 1.2 limit note no longer attributes zone splitting to the standard.
  - The 2.2 limit note now cites Chapter 7 of IEEE 1815-2012 (via the paper) and IP Source Guard.
- **Tests** PASS 65/65. The new content test requires every source to be verified and dated, and the spoof-note test now expects `['oxford-sav5', 'extreme-ipsg']`.
- **T054** Every briefing, hint, feedback and limit string was re-read against these sources and the constitution's model. Each factual claim matches a source, or is explicitly a game assumption. There are no Purdue references.

### 2026-11-21 · Facilitator materials for the remaining human checks

- `docs/playtest-script.md` is for T058 (SC-002 and SC-003). It covers who to recruit, a word-for-word intro, the one question to ask after each failed wave, a scoring sheet with rules, debrief questions, and an answer key for the facilitator only.
- `docs/accessibility-checklist.md` closes the US5-1 and US5-2 partials. It covers macOS keyboard-navigation setup, keyboard-only steps A1–A16 (including picking dropdown options, which the automation couldn't do), VoiceOver steps B1–B12 (labels, live announcements, Board details table, wave log, Restart dialog), and a results sheet.
- Both are linked from the README verification table. T058 stays open until the completed sheets come back.

### 2026-11-21 · Closing v1: scope reduced by the project owner

- **T058** (learner playtest, SC-002 and SC-003) is **descoped and not run**. It is marked closed with strikethrough, not as passed.
- The manual keyboard-dropdown and VoiceOver checks behind the US5-1 and US5-2 **partials** are also descoped. Those rows stay "Partial" in the README.
- Per constitution Principle VII ("Failed and untested checks MUST stay visible"), the README status, the verification table and the "Next improvement" line all say what was not run. `docs/playtest-script.md` and `docs/accessibility-checklist.md` are kept so the checks can be run later.
- **Final state** 58/58 tasks closed: 57 done, 1 descoped. Tests PASS 65/65.
