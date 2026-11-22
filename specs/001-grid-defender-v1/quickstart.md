# Quickstart & Validation: Grid Defender v1

This file describes how to run and check the finished feature. Nothing in it exists until
`/speckit-implement` creates `index.html`.

## Prerequisites

- Python 3 (any recent version), used only to serve static files
- A current Chromium, Firefox or Safari browser
- Optional: Node 18+ for the terminal test runner

## Run

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open **http://127.0.0.1:8000** to play, and **http://127.0.0.1:8000/tests/** to run the tests. On
Windows, use `py` in place of `python3`. Opening the files with `file://` isn't supported, because
ES modules and the JSON fetch both need HTTP.

Optional terminal run:

```sh
node tests/run-node.mjs
```

## Expected test result

The runner lists every suite (rules, content, state), its pass/fail totals, and the IDs of any
failed cases. **Zero discovered tests is a failure.** Cases C1–C14 in
[contracts/evaluator.md](contracts/evaluator.md) must all pass.

## Manual validation scenarios

| # | Scenario | Steps | Expected |
| --- | --- | --- | --- |
| V1 | Fresh start (US1-1) | Load the page | Level 1 briefing; no board editing yet |
| V2 | Zone-wide mistake (US1-3, C2) | Start → add `permit Control Center → Substation any` → Run Wave | attack-allowed + over-permissive; attempts = 1; Next disabled |
| V3 | Correct round (US1-2, C1) | Change the card to `permit M → R1 tcp/20000` → Run Wave | "correct"; H→R1 and telnet denied in the log; attempts = 2; Next enabled |
| V4 | Invalid input (US1-5, C13) | Add a card with no destination → Run Wave | guidance; focus on the destination field; attempts unchanged |
| V5 | Repeat after success (US2-2) | Solve, then press Run Wave again | wave replays; attempts and completion unchanged |
| V6 | Help tiers (US3-2) | Help ×3 | method, then worked step, then read-only reference rules; rule list untouched; summary later shows "solution viewed" |
| V7 | Limit packets (US4) | Solve 1.2 and 2.2 | R1→R2 and the spoofed H-as-M packet show "out of reach"; round still correct |
| V8 | Two conduits (C9, C11) | Round 3.2: rules on conduit 2 only, then add a port-only rule on conduit 1 | wrong-conduit first, then correct |
| V9 | Restart (US2-4) | Restart → Cancel, then Restart → Confirm | Cancel leaves the session unchanged; Confirm returns to the L1 briefing with zeroed progress |
| V10 | Keyboard only (US5, SC-004) | Play 1.1 with no mouse | every action reachable; focus visible |
| V11 | Reduced motion (US5-3) | Turn on OS reduced motion, then Run Wave | instant results; no moving dots |
| V12 | Narrow window (SC-004a) | 768 px wide window, play 1.1 | stacked layout; no horizontal scroll; Run Wave visible |
| V13 | Content error (C12) | Temporarily change a 1.1 ticket asset to `R3`, then reload | Content-error screen naming round 1.1 and `unknown-asset`; the game does not start; nothing graded |
| V14 | Feedback speed (SC-005) | Round 3.2, any rule set, Run Wave (animation on and off) | Result panel and log are filled within 1 s, before any animation finishes |
| V15 | Attempts and summary (US2-3, US2-5) | Fail 1.1 twice, solve it; use help tier 1 on 1.2; finish all rounds | Attempts go 1 → 2 → 3 on 1.1; summary shows completed, attempts and help tier per round |
| V16 | Both-directions feedback (US3-1, C5) | Round 2.1: `permit M → R1 tcp/20000`, `permit R1 → M tcp/20000` → Run Wave | attack-allowed for R1 → M via rule 2; text says the master initiates and 0x82 returns in-session |
| V17 | Shadowed note (US3-3, C10) | Round 3.1: C10 rules → Run Wave | Rule 2 marked "shadowed by rule 1" next to its card and in the result panel; it is not itself a failure |
| V18 | Log and announcement (US5-2) | Any round with a screen reader on, Run Wave | Every packet has a log line with all fields; the overall result is announced |
| V19 | Board text equivalent (US5-4) | Round 3.1 | Board details lists 3 zones with SL-T and cells, every available asset, and conduits 1 and 2 with zones joined and effective SL-T |

## Acceptance criterion → evidence map

Every acceptance criterion is recorded on its own line in the README (constitution, Verification & Quality Gates).

| AC | Evidence |
| --- | --- |
| US1-1 | V1 · state test "fresh session opens on briefing" |
| US1-2 | V3 · C1 |
| US1-3 | V2 · C2 |
| US1-4 | C3 |
| US1-5 | V4 · C13 |
| US2-1 | V15 (finishing all six rounds) · state test "Next" |
| US2-2 | V5 · state test "repeat after success" |
| US2-3 | V15 · state test "wrong run gives attempts +1" |
| US2-4 | V9 · state tests Restart/Cancel |
| US2-5 | V15 |
| US3-1 | V16 · C5 |
| US3-2 | V6 · state test "help" |
| US3-3 | V17 · C10 |
| US4-1 | V7 · C14 |
| US4-2 | V7 · C6 |
| US4-3 | T048 assertions |
| US5-1 | V10 |
| US5-2 | V18 |
| US5-3 | V11 |
| US5-4 | V19 |

Record each scenario as **pass / fail / not run**, with the date, browser and OS, in the README
verification table (Principle VII).
