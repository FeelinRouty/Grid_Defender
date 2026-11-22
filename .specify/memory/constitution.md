# Grid Defender Constitution

Grid Defender helps network engineers who are new to OT practice IEC 62443 zone-and-conduit
segmentation for DNP3 SCADA traffic by writing ordered firewall rules on an 8×8 board and running
waves of DNP3 packets through the conduits. Domain detail lives in `FOUNDATION.md`.

## Core Principles

### I. Technical Truth Is a Release Requirement

- The game MUST NOT reward a technically incorrect answer. Grading MUST be reproducible from a
  documented rule and the round's inputs.
- Unsupported or ambiguous content is an authoring error: the game MUST say the round is
  unavailable and MUST NOT grade it.
- Every DNP3 and IEC 62443 claim in briefings, hints and feedback MUST cite a source and section
  that the team has actually read. When the standard itself is unavailable, a public secondary
  source (vendor documentation, peer-reviewed paper, protocol implementation, registry) is
  acceptable. A claim that no available source supports MUST be narrowed until it is supported,
  or stated to the player as a game assumption.
- Simplifications (see Scope & Technical Model) MUST be stated in the briefing and README wherever
  they affect what the player can conclude.
- Fictional assets, waves and animations MAY illustrate a rule; they MUST NOT change it.

Rationale: a teaching game that grades wrong answers as right teaches the wrong thing to the
engineers who will configure real utility networks.

### II. Every Round Teaches Through a Decision

- The player's main action — choosing and ordering rule cards on a conduit — MUST exercise the
  target skill.
- Each concept (conduit, who initiates, function code, multi-conduit path) MUST be introduced in a
  briefing before a round tests it.
- All decision-relevant values MUST be visible: assets and cells, zones, SL-T, the ticket's
  required flows, and available function codes.
- A failed wave MUST name the specific failure (`required-blocked`, `attack-allowed`,
  `over-permissive`, `wrong-conduit`) with the packet, conduit and matching rule, and give a next
  step. A correct wave MUST explain why the rule set is exactly least privilege.
- Learning sequence: L1 zones & conduits (two zones) → L2 who may initiate → L3 function-code
  inspection, rule order and two conduits (three zones).
- No function code is "always bad": the round's ticket defines what is required.
- Hints MUST reveal a method before a worked step. Viewing a worked solution MUST be recorded as
  assistance, never as independent mastery.

### III. Progress Is Honest and Retry Is Safe

- A round completes only when the player's rule set is graded `correct` across the round's whole
  flow universe. A failed wave MUST leave the round playable.
- Running a wave with no rules or with an incomplete rule card MUST give input guidance and MUST
  NOT count as an attempt. Repeating Run Wave MUST NOT award progress twice.
- The tower-defense framing is presentation only: no lives, health bar, countdown, score or speed
  bonus. Waves start only on Run Wave. Hints and retries carry no penalty.
- Completed rounds, attempts and assistance MUST be shown separately.
- The specification MUST state exactly what advances a round, finishes a level and resets a
  session.

### IV. Access Is Part of the Core Game

- Every core action — inspecting the board, adding/editing/reordering/deleting rule cards, Run
  Wave, hints, Next, Restart — MUST work by keyboard with visible focus and accessible names.
- Success and failure MUST be conveyed in text as well as color.
- The board MUST have a text equivalent (each asset's cell, zone, SL-T and role, plus conduits),
  and each wave MUST produce a text log of every packet's verdict and matching rule.
- Reduced-motion preferences MUST be respected; animation MUST NOT delay feedback or controls.
- The layout MUST work on a typical laptop and a narrow window; scrolling containers MUST NOT hide
  Run Wave.
- Verification records what was actually checked and MUST NOT claim accessibility certification.

### V. Deterministic and Self-Contained

- v1 ships authored content and deterministic logic. It MUST NOT require an account, backend, live
  device or network connection, packet capture, model or API key.
- Wave contents and order are authored, not random.
- Runtime AI tutoring, generated scenarios, procedural boards and free-text rule parsing are
  stretch work and REQUIRE an amendment to this constitution, the specification and the
  verification approach before implementation.
- AI-assisted development output receives the same review as any other contribution.

### VI. Content and Logic Reviewed Separately

- Boards, zones, SL-T, assets, conduits, tickets, waves, hints, sources and difficulty MUST live in
  editable data. The firewall evaluator MUST be pure and separate from rendering, animation and
  progress tracking.
- Content MUST be validated before a round is presented. Content errors include: overlapping
  zones; a conduit not joining exactly two zones; zones with no conduit path between them; assets
  off the board; required flows referencing unknown assets; a ticket that violates its zone's SL-T
  rule; and a limit packet that a conduit rule could actually stop.
- The answer key is the required flow set, not a rule list. The evaluator compares the player's
  permitted set with the required set over the enumerated flow universe; a hand-authored answer
  MUST NOT override it, and feedback MUST agree with the evaluator's reasoning.
- Adding a round that uses the existing mechanic MUST require only data and its checks.

### VII. Done Is Demonstrated

- Ship only the agreed scope. Spec, plan, tasks and README MUST describe the same game.
- A feature is complete only when its acceptance criteria pass and the result is recorded; a
  screenshot, checked box or agent claim is insufficient alone.
- When time is short, reduce scope explicitly: cut round 3.2 (second conduit) before cutting
  correctness. Fix incorrect teaching and broken core interactions before animation or effects.
- Failed and untested checks MUST stay visible.

## Scope & Technical Model

**First release:** one mechanic (rule cards on a conduit, then Run Wave), three levels × two rounds,
static browser game, sized for a 60-minute workshop build. The "Storm Night" capstone is stretch.

- **Firewall:** stateful, first-match, implicit deny. Rules match new connections; replies and
  in-session traffic on an allowed connection return automatically.
- **DNP3:** over TCP; outstation listens on 20000; the master initiates. Unsolicited responses
  (0x82) travel inside the master's connection. Players filter on application-layer function codes
  listed in `FOUNDATION.md`. Rule-card services: `tcp/20000 (port only)`, `DNP3 (protocol-checked)`,
  `other TCP`, `any`.
- **IEC 62443 (game simplification):** zones, conduits and zone SL-T. SL-T 1: all cross-zone
  traffic via a conduit; SL-T 2: deny by default, named source/destination/service; SL-T 3: also
  DNP3 protocol check and function-code restriction. A conduit enforces the higher SL-T of its two
  zones; a multi-conduit flow MUST be permitted by every conduit on its path.
- **Honest limits:** spoofed-source and intra-zone packets cannot be stopped by any conduit rule.
  They are shown, explained with the real control that would address them, and never graded.
- **Excluded:** DNP3 over UDP/serial, link-layer addresses, Secure Authentication behavior, TLS,
  dual-endpoint TCP, 62443 risk assessment, SL-C/SL-A, the Purdue model.
- **Stack constraint:** static files served over HTTP; no persistence beyond the page session.

## Verification & Quality Gates

- Each round MUST have hand-checked correct, plausible-wrong and boundary cases whose expected
  results are recorded independently of the evaluator.
- A dependency-free browser test runner MUST report totals and failed case IDs; zero discovered
  tests is a failure.
- Before release: every briefing and explanation is checked against its cited source; a
  keyboard-only playthrough, narrow-window check and reduced-motion check are recorded.
- Each acceptance criterion is recorded as pass / fail / not run, with date and environment.
- `/speckit-plan` MUST pass a Constitution Check against Principles I–VII before design and again
  after design.

## Governance

- This constitution supersedes other project practices. Conflicts are resolved openly; the build
  agent MUST NOT weaken a principle to make an implementation pass.
- Amendments record the reason, update the affected spec and plan, and rerun `/speckit-analyze`.
- Versioning: MAJOR for removing or redefining a principle; MINOR for adding a principle or
  materially expanding guidance; PATCH for clarifications and wording.
- Reviews of specs, plans and pull requests MUST check compliance with Principles I–VII.

**Version**: 1.1.0 | **Ratified**: 2026-11-21 | **Last Amended**: 2026-11-21
