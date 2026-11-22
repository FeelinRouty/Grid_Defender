# Research: Grid Defender v1

Phase 0 output for [plan.md](plan.md). Technical Context had no open NEEDS CLARIFICATION items. The
workshop starter `PLAN.md` fixes the stack, and the spec's clarify session settled the product questions.
This file records the design decisions the evaluator and UI depend on.

## R1 · Stack and runtime

- **Decision**: Semantic HTML, CSS and native JavaScript ES modules. No framework, bundler,
  dependency or backend. Content is loaded from `data/levels.json` over HTTP. Served locally with
  `python3 -m http.server`.
- **Rationale**: Principle V (self-contained), the workshop `PLAN.md` default, and a 60-minute build.
  The only tool a static host or attendee needs is Python.
- **Alternatives considered**: React/Vite was rejected because it adds a build step and dependencies.
  Canvas was rejected because it is hard to make accessible. Three.js was rejected because the
  constitution would need a justification and an accessible alternative for it.

## R2 · Grading by flow-universe enumeration

- **Decision**: For each round, enumerate every cross-zone flow, which is fewer than 250. Classify each
  one at each conduit it crosses as required, forbidden or don't-care (FR-013), and run the player's
  rules over every flow. The authored wave never affects the grade.
- **Rationale**: Principle VI makes the answer key a set of required flows, not a rule list. Brute
  force is exact, deterministic and small. Level 3 has 6 assets, 24 ordered cross-zone pairs and
  9 traffic variants, so 216 flows. With at most 8 rules on each of 2 conduits, that is about 3.5k
  match checks, which runs in well under 1 s (SC-005).
- **Alternatives considered**: comparing against an authored "correct rule list" was rejected because
  it breaks Principle VI and rejects equivalent answers. Symbolic set algebra on rule predicates was
  rejected because it is harder to review and to explain in feedback.

## R3 · Flow variants and port classes

- **Decision**: Each ordered asset pair has 9 variants: DNP3 with each of 7 function codes (READ 0x01,
  WRITE 0x02, SELECT 0x03, OPERATE 0x04, DIRECT_OPERATE 0x05, COLD_RESTART 0x0D, STOP_APPL 0x12),
  `non-dnp3-20000`, and `other-tcp`. There are two port classes: `20000` (the DNP3 and non-DNP3
  variants) and `other`.
- **Rationale**: This covers every rule-card service option (FR-007/FR-011). CONFIRM and the
  response FCs are in-session traffic and are never filterable (spec Assumptions, FR-010).
- **Alternatives considered**: modelling real port numbers was rejected because the extra values
  teach nothing. The game only needs to tell 20000 apart from everything else.

## R4 · Don't-care at SL-T 2

- **Decision**: On a conduit whose effective SL-T is 2, a flow that is not required is don't-care
  when it has the same source, destination and port class as a required flow. Every other flow that
  is not required is forbidden.
- **Rationale**: A port-only rule on an SL-T 2 conduit must pass (C1, C11). A finer rule, such as a
  protocol-checked READ-only rule, must also pass (C4). Don't-care is the only classification that
  accepts both and still fails a zone-wide permit (C2).
- **Alternatives considered**: comparing only at SL-T 2 granularity was rejected because then the
  ticket's FC detail would have no meaning. Treating everything not required as forbidden was rejected
  because it would penalise port-only rules, which the SL-T 2 game rule allows.

## R5 · Waves, in-session packets and limit packets

- **Decision**: Wave packets come in three kinds:
  - `new`: a new connection, evaluated through the conduits on its path.
  - `in-session`: a reply or 0x82 that references a parent `new` packet. It passes if the parent
    was allowed, and otherwise shows "no session".
  - `limit`: either `spoofed-source` or `intra-zone`. These are shown with an "out of reach"
    verdict and never graded.
- **Rationale**: FR-010, FR-017 and US4. Validation enforces the limit rules: a `spoofed-source`
  packet's apparent flow must equal a required flow, and an `intra-zone` packet's endpoints must
  share a zone (Principle VI).
- **Alternatives considered**: simulating TCP state was rejected as out of scope. The parent
  reference is enough to teach stateful return.

## R6 · Shadowed-rule detection

- **Decision**: Rule *j* on conduit *c* is shadowed when, for every universe flow crossing *c* that
  *j* matches, an earlier rule matches first. A rule that matches no crossing flow at all is reported
  as `never-matches`.
- **Rationale**: FR-016 reports shadowing as information. Enumeration gives an exact answer and
  names the earlier rule that does the shadowing.

## R7 · Deterministic examples and ordering

- **Decision**: The universe is enumerated in canonical order: source in authored asset order, then
  destination in asset order, then variant in the R3 order. The "example flow" for a failure is the
  first offending flow. Failures are reported in the order required-blocked/wrong-conduit,
  attack-allowed, over-permissive.
- **Rationale**: Constitution Principle I requires reproducible feedback, and the tests can assert
  exact text.

## R8 · Board rendering and accessibility

- **Decision**: The visual board is an 8×8 CSS grid with `aria-hidden="true"`, labelled with
  coordinates. Beside it is an always-visible "Board details" table that is the text equivalent
  (FR-028). Rule cards use native `<select>` elements, a `<fieldset>` of FC checkboxes, and
  Move up/Move down/Delete buttons. There is a polite live region for results. Packet animation uses
  CSS transforms on dots placed along path cells. With `prefers-reduced-motion`, results render
  immediately with no movement.
- **Rationale**: Native controls give keyboard support and accessible names without custom ARIA
  widgets (Principle IV, FR-027). Drag-and-drop was rejected for reordering because the buttons
  are keyboard-equivalent.
- **Alternatives considered**: an ARIA `grid` with arrow-key navigation over all 64 cells was
  rejected because it is costly to build and the text table carries the same information.

## R9 · Layout

- **Decision**: Two columns, board and rule editor, at widths of 1024 px and up. Below 1024 px they
  stack: board, then rule editor, then log. The minimum supported width is 768 px (clarify Q4). The
  rule list and log scroll inside their own labelled regions, and Run Wave sits outside the
  scrolling areas.
- **Rationale**: FR-030 and SC-004a.

## R10 · Testing

- **Decision**: A dependency-free browser runner at `tests/index.html` imports the pure modules,
  runs the cases and shows totals and failed case IDs. Zero tests counts as a failure. An optional
  `node tests/run-node.mjs` runs the same suites in a terminal: the engine modules have no DOM, and
  the Node runner reads JSON with `fs`.
- **Rationale**: Constitution Verification & Quality Gates. The Node path lets the build agent check
  its work without a browser. Expected results are written by hand from the spec's cases table and
  are never computed by the evaluator.

## R11 · Source verification

- **Decision (revised 2026-11-21)**: The ISA/IEC 62443 and IEEE 1815 standards are not available to the
  project. Every claim instead cites a public source the team read, with a `checked` date in
  `data/levels.json`:
  - the IANA port registry
  - the Wireshark `packet-dnp.c` function-code definitions
  - Cisco's ISA/IEC 62443-3-3 white paper
  - Cremers, Dehnel-Wild and Milner's SAv5 analysis (which quotes IEEE 1815-2012)
  - Extreme Networks' IP Source Guard guide
- **What was narrowed**:
  - "Each zone has an SL-T" is now a game assumption. The sources give SL 0–4 definitions, but not
    per-zone assignment.
  - "The master opens the TCP connection" and "unsolicited responses ride inside it" are now
    game-model assumptions. No readable source covered connection direction.
  - "DIRECT_OPERATE skips select-before-operate" is now framed as the game's meaning. The source
    only shows that a control can be refused when no SELECT was received.
  - "Deny by default / allow by exception" and "the integrator chooses the controls" were removed.
  - The named "dual-endpoint mode" was removed.
- **Rationale**: Constitution v1.1.0, Principle I.
- **Alternatives considered**:
  - Keeping unverified section references marked "not verified" was rejected by the project owner
    in favour of broadening the claims.
  - Vendor help pages (Rockwell, Schneider, ABB) and the ISA quick-start guide could not be fetched.
