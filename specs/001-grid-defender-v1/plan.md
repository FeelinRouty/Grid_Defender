# Implementation Plan: Grid Defender v1 — First Playable

**Branch**: `001-grid-defender-v1` | **Date**: 2026-11-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-grid-defender-v1/spec.md`

## Summary

This is a static browser game. The player writes ordered firewall rule cards on the conduits of an
8×8 board, presses Run Wave, and watches authored DNP3 packets get allowed, denied or marked "out of
reach". Grading is a pure evaluator that enumerates every cross-zone flow in the round (fewer than
250). It classifies each flow at each conduit as required, don't-care or forbidden, and passes the
round only if the player's rules permit exactly what is required (research R2–R4). The evaluator,
content validation and session state are pure modules with no DOM. Rendering and animation sit on
top of them. Content lives in one JSON file, and tests are hand-written cases run in the browser,
with an optional Node runner.

**Hardest behavior to get right**: per-conduit classification with SL-T 2 don't-care and
multi-conduit paths, which separates `wrong-conduit` from `required-blocked` (cases C4, C9, C11).

**First evidence we'll check**: C1–C3 on round 1.1 pass in `tests/` before any UI exists.

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript (ES2022 modules), running natively in the browser

**Primary Dependencies**: None (no framework, bundler or runtime library)

**Storage**: N/A. Content comes from `data/levels.json`, and session state is in memory for the page's lifetime

**Testing**: A dependency-free browser runner at `tests/index.html`, plus an optional `node tests/run-node.mjs` (Node 18+)

**Target Platform**: Current Chromium, Firefox and Safari, served over HTTP (`python3 -m http.server`) or from a static host, including a repository subpath

**Project Type**: Static single-page web game

**Performance Goals**: Feedback and the wave log appear within 1 s of Run Wave (SC-005). Evaluation is about 3.5k rule-match checks or fewer

**Constraints**: No network calls other than loading the app's own files. Works from 768 px wide. Keyboard-complete. Reduced motion is respected. Relative asset paths only

**Scale/Scope**: 3 levels, 6 rounds, 2 boards, at most 7 assets per board, at most 8 rules per conduit

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Pre-design | Post-design |
| --- | --- | --- | --- |
| I. Technical truth | Grading is reproducible from documented rules; simplifications are shown; every claim has a source | ✅ The spec defines FR-009 to FR-017 exactly | ✅ evaluator.md algorithm; the `sources` records carry a `verified` flag (R11) |
| II. Teaches through a decision | The core action is the skill; feedback names the mistake; help has tiers | ✅ US1, US3 | ✅ The failure codes and example flows in RoundResult; `explain` cannot invent reasons |
| III. Honest progress | Attempts count only valid unsolved runs; no lives, timer or score | ✅ FR-022 to FR-026 | ✅ The data-model state transitions |
| IV. Access | Keyboard, text equivalents, live region, reduced motion, 768 px | ✅ FR-027 to FR-030 | ✅ ui.md: native controls, Board details table, log, motion rule |
| V. Self-contained | No backend, model or randomness | ✅ | ✅ Static files only; waves are authored in order |
| VI. Content and logic separate | Data-driven content; pure evaluator; answer key is a flow set; validation before play | ✅ FR-005, FR-013 | ✅ `validateContent` codes, including `limit-stoppable` and `slt-ticket` |
| VII. Done is demonstrated | Recorded verification; explicit scope cuts | ✅ SC-001 to SC-007 | ✅ quickstart V1–V13; the scope-cut order is below |
| Quality gates | Hand-checked cases, runner fails on zero tests | ✅ | ✅ R10; C1–C14 |

**Result**: all gates pass. There are no violations, so Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-grid-defender-v1/
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R11
├── data-model.md        # Phase 1: entities, validation, session state
├── quickstart.md        # Phase 1: run + validation scenarios V1–V13
├── contracts/
│   ├── evaluator.md     # Pure engine API, algorithm, cases C1–C14
│   ├── content-schema.md# levels.json shape
│   └── ui.md            # Views, controls, announcements, log format
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
index.html               Page shell, live region, module entry
style.css                Tokens, 2-column/stacked layout, focus, zone colors, reduced motion
main.js                  load → validate → start; content-error view
engine/
  flows.js               Universe enumeration, paths, port classes, classification (pure)
  rules.js               Rule-card validity, matching, decide(), evaluateRound(), shadowing (pure)
  content.js             validateContent() and expansion of ticket fcs[] (pure)
  state.js               Session transitions, attempts, help tier, restart (pure)
  feedback.js            explain(): RoundResult + round text → FeedbackItem[] (pure)
ui/
  render.js              Briefing, round, summary, error views; focus management
  board.js               8×8 visual grid + Board details table
  editor.js              Rule cards, conduit selector, move/delete, input guidance
  wave.js                Wave log + packet animation (skipped under reduced motion)
data/
  levels.json            Sources, 2 boards, 3 levels × 2 rounds
tests/
  index.html             Browser runner: totals + failed case IDs; 0 tests = fail
  harness.js             Tiny assert/describe used by both runners
  cases.js               Hand-written expected results C1–C14 (not computed by engine)
  rules.test.js          Evaluator cases
  content.test.js        Validation errors incl. C12, limit-stoppable, slt-ticket
  state.test.js          Attempts, repeat-after-success, help, Next, restart/cancel
  run-node.mjs           Optional terminal runner (reads JSON via fs)
README.md                Actual run/test commands, model, limits, verification table
```

**Structure Decision**: a single static project at the repository root, following the workshop
`PLAN.md` layout. `engine/` holds only pure modules. `flows.js` is split out of `rules.js` because
classification is the hardest logic and is reviewed on its own. The starter templates `SPEC.md`,
`PLAN.md`, `CONSTITUTION.md` and `FOUNDATION.md` stay as background inputs. `README.md` is
rewritten during implementation.

## Implementation Order

| Slice | Deliverable | Evidence before the next slice |
| --- | --- | --- |
| 1 · Prove the rule | `flows.js`, `rules.js`, the round 1.1 data, and C1–C4, C13 | Tests pass in the browser runner (and in Node) |
| 2 · One playable round | Briefing, board, Board details, editor, Run Wave, result panel, log, Next | V1–V5 pass by hand |
| 3 · Full ladder | All 6 rounds, `content.js` validation, help tiers, summary, restart, C5–C12, C14 | All cases pass; V6–V9, V13 |
| 4 · Usable | Keyboard order, focus, live region, animation and reduced motion, 768 px layout | V10–V12 recorded |
| 5 · Package | README with model, limits, sources (`verified` status) and verification table | A fresh-checkout run works |

**Scope-cut order if time is short (Principle VII)**: (1) packet animation, keeping the log; (2) round
3.2 and the three-zone second conduit; (3) the help tiers' worked step text, keeping the method hints.
Correctness, feedback, keyboard access and the text equivalents are never cut.

## Complexity Tracking

No constitution violations to justify.
