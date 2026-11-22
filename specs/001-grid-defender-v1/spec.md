# Feature Specification: Grid Defender v1 — First Playable

**Feature Branch**: `001-grid-defender-v1`

**Created**: 2026-11-21

**Status**: Draft

**Input**: User description: "A browser game that teaches network engineers the foundations of IEC 62443 (zones and conduits) using firewall rules and the DNP3 protocol used for SCADA in the electrical utility space, played on an 8x8 grid." Design decisions are recorded in `FOUNDATION.md`; governing rules are in `.specify/memory/constitution.md` v1.0.0.

## Pitch

**You are the OT network engineer at a fictional electric co-op: write firewall rules on the conduits of an 8×8 grid so the SCADA master can run the substations, then press Run Wave and watch every attack packet stop at your conduit — or not.**

Each round shows a board with zones, assets and one or two conduits, plus a work ticket listing the traffic that must work. The player builds ordered rule cards on each conduit and presses **Run Wave**. Packets animate across the board; each one is allowed, dropped, or marked "out of reach". The round is graded against every possible flow, not just the ones in the wave. The session ends after six rounds with a summary.

## Clarifications

### Session 2026-11-21

- Q: Should the rule-order shadowing lesson move from round 3.2 to round 3.1? → A: Yes. 3.1 teaches protocol check, FC least privilege and rule order; 3.2 focuses on two conduits and per-asset FCs.
- Q: What does a conduit's rule list contain when a round opens? → A: Every conduit starts with no rule cards in every round; nothing carries over from earlier rounds.
- Q: What does the worked-solution help tier do? → A: It shows the reference rule set as read-only text; the player must build the rules themselves, and the round is marked "solution viewed".
- Q: What is the narrowest width the game must stay fully playable at? → A: 768 px wide, with the board stacked above the rule list and log; side-by-side layout from typical laptop widths up.
- Q: How much should round 2.2 say about DNP3 Secure Authentication? → A: One sentence each for Secure Authentication and switch-level anti-spoofing in the "out of reach" explanation, with an IEEE 1815 source link; no further SA content in v1.

## Learner

- **Who**: Network engineers comfortable with IP, TCP ports and ordered ACL/firewall policies, with little or no OT/SCADA experience.
- **Assumed knowledge**: source/destination/port matching, first-match rule order, what a stateful firewall is.
- **Briefings teach**: zone, conduit, SL-T, DNP3 master/outstation, port 20000, unsolicited responses, function codes, select-before-operate.
- **Misconceptions this game makes visible**: "an allowed port is an allowed action"; "permit zone-to-zone is least privilege"; "DNP3 needs rules in both directions"; "a conduit protects everything inside a zone".
- **Session target**: 15–25 minutes for a first playthrough; unlimited thinking time.

## Learning Outcomes

| ID | After playing, the learner can… | The game asks them to… | Evidence |
| --- | --- | --- | --- |
| LO1 | Explain that cross-zone traffic must pass a conduit and write a least-privilege conduit policy | Permit only the ticketed master → RTU flows on a conduit | Rounds 1.1–1.2 graded correct |
| LO2 | Identify which side initiates a DNP3 TCP session and why a stateful conduit needs no inbound rule | Deny outstation-initiated connections while unsolicited responses still arrive | Rounds 2.1–2.2 graded correct |
| LO3 | Restrict DNP3 by function code, order rules to avoid shadowing, and apply a policy across two conduits | Permit only ticketed function codes on the SL-T 3 conduit and on every conduit of a multi-hop path | Rounds 3.1–3.2 graded correct |
| LO4 | Name two threats a conduit firewall cannot stop and the control that would | Read the "out of reach" explanations for spoofed and intra-zone packets | Limit packets shown in 1.2 and 2.2 |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Write a conduit policy and see it tested (Priority: P1)

As a learner, I read a short briefing, inspect the board and ticket, build rule cards on the conduit, press Run Wave, and see each packet's fate and an explanation of whether my policy is exactly least privilege.

**Why this priority**: This is the whole mechanic. Round 1.1 alone, with correct grading and feedback, is a usable teaching slice.

**Independent Test**: Play round 1.1 from a fresh session with one correct and one over-permissive rule set; both outcomes match the cases table.

**Acceptance Scenarios**:

1. **Given** a fresh session, **When** the game starts, **Then** the Level 1 briefing appears before any board can be edited.
2. **Given** round 1.1, **When** the player submits `permit M → R1 tcp/20000` and presses Run Wave, **Then** the round is graded correct, the H → R1 and M → R1 telnet packets are shown dropped by the implicit deny, and an explanation states why the policy is exactly least privilege.
3. **Given** round 1.1, **When** the player submits `permit Control Center → Substation any`, **Then** the result is `over-permissive` and `attack-allowed`, the log names H → R1 dnp3 and M → R1 telnet as allowed by rule 1, the round stays incomplete, and the player can edit and retry.
4. **Given** round 1.1, **When** the player submits `deny any → any any` only, **Then** the result is `required-blocked` naming M → R1 dnp3, and the round stays incomplete.
5. **Given** any round, **When** the player presses Run Wave with zero rule cards or with a card missing a required field, **Then** input guidance names the missing field, no wave runs, and the attempt count does not change.

---

### User Story 2 - Progress through the six-round ladder (Priority: P1)

As a learner, I advance through three levels that add one concept at a time, and finish with a summary of completed rounds, attempts and help used.

**Why this priority**: The learning outcomes LO2–LO3 depend on the sequence; the constitution requires honest progress tracking.

**Independent Test**: Complete all six rounds using the reference rule sets; verify Next, level completion, summary and restart.

**Acceptance Scenarios**:

1. **Given** a round graded correct, **When** the player presses Next, **Then** the next round opens (or the next level's briefing, or the session summary after round 3.2).
2. **Given** a round already graded correct, **When** the player presses Run Wave again, **Then** the wave may replay but completion and attempt counts do not change.
3. **Given** a round not yet solved, **When** the player presses Run Wave with a valid but wrong rule set, **Then** the attempt count increases by one and the round stays open.
4. **Given** any point in the session, **When** the player chooses Restart and confirms, **Then** all progress clears and the Level 1 briefing appears; **When** they cancel, **Then** nothing changes.
5. **Given** the session summary, **Then** it shows, per round, completed (yes/no), valid attempts, and assistance used (hint tier reached, worked solution viewed).

---

### User Story 3 - Learn from targeted feedback and help (Priority: P2)

As a learner who is stuck, I can request a method hint, then a worked step, then a worked solution, and every failed wave tells me the specific mistake.

**Why this priority**: Turns failure into learning; required by Principle II, but a round is still playable without hints.

**Independent Test**: In round 2.1, submit the "both directions" rule set, read the feedback, then step through all three help tiers.

**Acceptance Scenarios**:

1. **Given** round 2.1, **When** the player adds `permit R1 → M tcp/20000` alongside the master rule, **Then** the result is `over-permissive` and `attack-allowed` for the compromised R1 → M connection, and the explanation states that the master initiates DNP3 sessions and unsolicited responses return inside that session.
2. **Given** any round, **When** the player requests help, **Then** tier 1 explains the method, tier 2 shows one worked step, tier 3 shows a complete reference rule set as read-only text that the player must enter themselves; each tier reached is recorded as assistance and none of them completes the round.
3. **Given** a rule set containing a rule that can never match because an earlier rule matches all its traffic, **When** the wave runs, **Then** feedback marks that rule as shadowed (informational, not a failure by itself).

---

### User Story 4 - See the honest limits of a conduit (Priority: P2)

As a learner, I see attack packets my firewall cannot stop, understand why, and learn which other control would stop them.

**Why this priority**: Prevents the false lesson that a perfect conduit policy means a secure system (LO4).

**Independent Test**: Run a correct rule set in rounds 1.2 and 2.2 and check the limit packets' display and text.

**Acceptance Scenarios**:

1. **Given** round 1.2 with a correct policy, **When** the wave runs, **Then** the R1 → R2 packet travels inside the Substation zone without touching the conduit, ends with an "out of reach" verdict in a neutral style, and the explanation names zone splitting or in-zone controls as the remedy. The round is still graded correct.
2. **Given** round 2.2 with a correct policy, **When** the wave runs, **Then** the packet from H forging M's address to R2 is allowed by the conduit, is shown as "out of reach", and the explanation gives one sentence each on DNP3 Secure Authentication and switch-level anti-spoofing, with an IEEE 1815 source link. The round is still graded correct.
3. **Given** any round, **Then** limit packets never cause a failure outcome and never increase attempts.

---

### User Story 5 - Play by keyboard and with reduced motion (Priority: P1)

As a keyboard or screen-reader user, I can inspect the board, build and reorder rule cards, run waves, get help and advance without a mouse, and read every result as text.

**Why this priority**: Constitution Principle IV makes access part of the core game.

**Independent Test**: Complete round 1.1 using only the keyboard with reduced motion enabled.

**Acceptance Scenarios**:

1. **Given** any round, **Then** every core control is reachable by keyboard in a logical order with visible focus and an accessible name, including moving a rule card up or down.
2. **Given** a completed wave, **Then** a text log lists every wave packet with source, destination, service, function code, conduit, verdict and matching rule number, and the overall result is announced to assistive technology.
3. **Given** reduced motion is preferred, **When** a wave runs, **Then** results appear without packet animation and no information is lost.
4. **Given** any round, **Then** a text equivalent of the board lists each zone (name, SL-T, cells), each asset (glyph, name, role, cell, zone) and each conduit (cell, zones joined, effective SL-T).

---

### Edge Cases

- **Empty rule list / incomplete card**: input guidance; no wave; no attempt counted (US1-5).
- **Over-restrictive SL-T 2 policy**: on an SL-T 2 conduit, a protocol-checked READ-only rule for a ticket that requires only polling is accepted; finer filtering than the zone requires is never penalised.
- **Required flow on only one of two conduits (3.2)**: result `wrong-conduit` naming the flow and the conduit that denied it.
- **Deny rule placed below a broad permit**: the deny is reported as shadowed; the resulting allowed attack is reported as `attack-allowed`.
- **Multiple failure types at once**: every failure category is listed in this order: `required-blocked` and `wrong-conduit` first, then `attack-allowed`, then `over-permissive`.
- **Over-permissive with no wave evidence**: a rule that permits a forbidden flow not present in the wave still fails as `over-permissive`, naming one example flow from the universe.
- **Broken authored content** (overlapping zones, conduit not joining exactly two zones, unknown asset in a ticket, limit packet that a rule could stop, ticket violating its zone SL-T): content is validated before play starts; if any round is invalid, the game shows a content-error screen that names each unavailable level/round ID and its errors, nothing is graded, and no attempt is counted (v1 blocks the whole game rather than skipping a single round).
- **Rule card limit**: each conduit holds at most 8 rule cards; the add control explains the limit when reached.
- **Page reload**: starts a fresh session (no saved progress in v1).

## Requirements *(mandatory)*

### Functional Requirements

**Board & content**

- **FR-001**: The game MUST present each round on an 8×8 board with columns A–H and rows 1–8, showing zones (name, color, SL-T badge), assets (glyph, name, role) and conduit cells.
- **FR-002**: Levels 1–2 MUST use the two-zone board and Level 3 the three-zone board defined in *Round Content*.
- **FR-003**: Each round MUST show a ticket listing its required flows in plain text before the player edits rules.
- **FR-004**: Each level MUST open with a briefing introducing its concept with a worked example different from the rounds, and stating the game's simplifications that apply.
- **FR-005**: The game MUST validate every round's content before presenting it and refuse to grade invalid content (see Edge Cases).

**Rule building**

- **FR-006**: Players MUST be able to add, edit, delete and reorder rule cards on each conduit, up to 8 per conduit.
- **FR-007**: Each rule card MUST have: action (permit / deny); source (one asset, one zone, or any); destination (one asset, one zone, or any); service (`tcp/20000 (port only)`, `DNP3 (protocol-checked)`, `other TCP`, or `any`); and, only when service is `DNP3 (protocol-checked)`, a set of function codes (one or more of READ, WRITE, SELECT, OPERATE, DIRECT_OPERATE, COLD_RESTART, STOP_APPL, or "any FC").
- **FR-008**: In Level 3 the player MUST choose which conduit's rule list they are editing; each conduit's rules are independent.
- **FR-008a**: *(Revised 2026-11-22: rounds build on each other.)* Round 1.1 starts with empty rule lists. Every later round MUST start with the player's solved rules from the round it carries over from, or that round's reference solution if the player reached it through level select, mapped to the new board's conduits; a round MAY append seeded rules for the player to review (round 2.1). A round the player already solved reopens with their solved rules. Rules edited within a round persist across retries of that round.

**Evaluation**

- **FR-009**: Each conduit MUST evaluate a new connection against its rule cards top-down, apply the first matching card, and deny if none match.
- **FR-010**: Replies and in-session traffic on an allowed connection, including RESPONSE (0x81) and UNSOLICITED_RESPONSE (0x82), MUST pass without any rule; player rules never match them.
- **FR-011**: A `tcp/20000 (port only)` card MUST match both genuine DNP3 and non-DNP3 traffic on port 20000; a `DNP3 (protocol-checked)` card MUST match only genuine DNP3 with a listed function code.
- **FR-012**: A flow whose source and destination are in different zones MUST be permitted end to end only if every conduit on its path permits it. A flow within one zone crosses no conduit.
- **FR-013**: For each round the game MUST classify every flow in the round's flow universe at each conduit it crosses as **required**, **forbidden** or **don't-care**:
  - required: listed on the ticket;
  - don't-care: only on an SL-T 2 conduit, a flow with the same source, destination and port as a required flow but a different traffic type or function code;
  - forbidden: everything else.
- **FR-014**: A round MUST be graded **correct** only if, at every conduit, all required flows are permitted and all forbidden flows are denied. The authored wave never decides the grade.
- **FR-015**: A conduit's effective SL-T MUST be the higher SL-T of the two zones it joins.
- **FR-016**: Failed rounds MUST report each applicable outcome: `required-blocked`, `attack-allowed` (a forbidden wave packet allowed), `over-permissive` (a forbidden flow permitted, with an example), `wrong-conduit` (a required multi-conduit flow permitted on some but not all conduits of its path; reported instead of `required-blocked` for that flow). Shadowed rules MUST be reported as information.
- **FR-017**: Limit packets (spoofed source, intra-zone) MUST be shown with an "out of reach" verdict and explanation, and MUST NOT affect grading.

**Wave & feedback**

- **FR-018**: Pressing Run Wave with a valid rule set MUST grade the round, then play the round's authored wave in authored order, showing each packet stop at the conduit that denied it or reach its destination.
- **FR-019**: Every wave MUST produce a text log line per packet: number, source (cell), destination (cell), service, function code, conduit, verdict, and matching rule number or "implicit deny".
- **FR-020**: Feedback MUST name the specific mistake with relevant values and give a next step; correct feedback MUST explain why the policy is exactly least privilege. Every technical claim MUST be traceable to a cited source.
- **FR-021**: Each round MUST offer three help tiers (method hint, worked step, worked solution); reaching a tier is recorded as assistance and never completes the round. The worked solution MUST be shown as read-only text and MUST NOT fill in the player's rule list; a round completed after viewing it is marked "solution viewed" in the summary.

**Progress & session**

- **FR-022**: Valid Run Wave presses on an unsolved round MUST count as attempts; invalid input, content errors, help, and Run Wave after success MUST NOT.
- **FR-023**: A round completes once when graded correct; Next becomes available only then. A level completes when both its rounds complete. After round 3.2 the session summary appears.
- **FR-024**: *(Revised 2026-11-22: level select.)* The player MAY start any level from the level select screen, which shows each level's title, what it teaches and its progress. Rounds inside a level MUST open in order.
- **FR-025**: Restart MUST require confirmation; confirming clears all progress and returns to the level select.
- **FR-026**: There MUST be no lives, health, timer, score or speed bonus. Progress lasts for the page session only.

**Access**

- **FR-027**: All core actions MUST be keyboard operable with visible focus and accessible names; results MUST be conveyed in text, not color alone, and announced to assistive technology.
- **FR-028**: The board MUST have a text equivalent (zones, assets, conduits); the wave log is the text equivalent of the animation.
- **FR-029**: With reduced motion preferred, waves MUST present results without movement; animation MUST never delay feedback or controls.
- **FR-030**: The board, rule list, log and Run Wave MUST remain fully usable at every window width from 768 px up, with no horizontal page scrolling: side by side on typical laptop widths, stacked (board above rule list and log) when narrower. Long lists scroll within their own labelled areas without hiding Run Wave. Widths below 768 px are not supported in v1.

### Round Content

**Levels 1–2 board** — Control Center (SL-T 2): rows 1–3; Substation (SL-T 2): rows 5–8; conduit **#A** at D4 joins them.
Assets: **M** SCADA master C2; **H** HMI F2; **R1** feeder RTU B6; **R2** feeder RTU G6; **X** rogue device E7 (round 2.2 only).

**Level 3 board** — Engineering (SL-T 2): A1–C3; Control Center (SL-T 2): E1–H3; Substation (SL-T 3, raised after the Level 2 incident): rows 5–8. Conduit **#1** at D2 joins Engineering ↔ Control Center (effective SL-T 2); conduit **#2** at F4 joins Control Center ↔ Substation (effective SL-T 3). Engineering reaches Substation only via #1 then #2.
Assets: **E** engineering workstation B2; **V** vendor laptop B3; **M** F2; **H** G2; **R1** B6; **R2** G6.

| Round | Concept | Ticket (required flows) | Wave — graded packets | Wave — limit packets |
| --- | --- | --- | --- | --- |
| 1.1 First poll | Conduit, least privilege | M → R1 DNP3 READ | M → R1 DNP3 READ; H → R1 DNP3 READ; M → R1 other TCP (telnet) | — |
| 1.2 Second feeder | Named flows, zone-to-zone is too broad | M → R1 DNP3 READ; M → R2 DNP3 READ | M → R2 DNP3 READ; H → R2 DNP3 OPERATE | R1 → R2 DNP3 (intra-zone) |
| 2.1 Who calls whom | Master initiates; stateful return | M → R1 DNP3 READ (R1 sends unsolicited responses in-session) | M → R1 READ; R1 → M 0x82 in-session; R1 → M new connection tcp/20000 | — |
| 2.2 Unsolicited & spoofing | No inbound rule needed | M → R1, M → R2 DNP3 READ (both send unsolicited) | R2 → M 0x82 in-session; X → M new connection tcp/20000; X → M other TCP | H forging M's address → R2 DNP3 READ |
| 3.1 Select before operate | Protocol check, FC least privilege, compromised master, rule order (a broad permit above a deny shadows it) | M → R1 DNP3 READ, SELECT, OPERATE | M → R1 SELECT then OPERATE; M → R1 DIRECT_OPERATE; M (compromised) → R1 COLD_RESTART; H → R1 non-DNP3 on tcp/20000 | — |
| 3.2 Two conduits | Multi-conduit path, per-asset FCs | M → R1 READ; M → R2 READ, DIRECT_OPERATE (capacitor bank); E → R2 READ (crosses #1 and #2) | E → R2 READ; V → R2 DNP3 READ; E → R2 COLD_RESTART; M → R1 DIRECT_OPERATE | — |

### Cases the implementation must satisfy

Expected results below are reasoned from FR-009–FR-017 by hand, not produced by the evaluator.

| Case | Round | Player rule set (top-down) | Expected result | Why |
| --- | --- | --- | --- | --- |
| C1 Correct | 1.1 | 1 permit M → R1 tcp/20000 | correct | Only required (M→R1 READ) and SL-T 2 don't-care flows (other FCs/non-DNP3 on 20000 M→R1) permitted |
| C2 Zone-wide | 1.1 | 1 permit Control Center → Substation any | attack-allowed (H→R1 READ, M→R1 telnet); over-permissive | Forbidden flows from H and on other TCP permitted |
| C3 Deny all | 1.1 | 1 deny any → any any | required-blocked (M→R1 READ) | Ticket flow denied |
| C4 Finer than needed | 1.1 | 1 permit M → R1 DNP3 {READ} | correct | Finer than SL-T 2 requires is never penalised |
| C5 Both directions | 2.1 | 1 permit M → R1 tcp/20000; 2 permit R1 → M tcp/20000 | attack-allowed (R1→M new connection); over-permissive | Outstation-initiated connection is forbidden; 0x82 needs no rule |
| C6 Inbound for unsolicited | 2.2 | 1 permit M → R1 tcp/20000; 2 permit M → R2 tcp/20000; 3 permit Substation → M tcp/20000 | attack-allowed (X→M); over-permissive | Rule 3 is unnecessary and admits X |
| C7 Port only at SL-T 3 | 3.1 | 1 permit M → R1 tcp/20000 | attack-allowed (DIRECT_OPERATE, COLD_RESTART); over-permissive | At SL-T 3 FC and traffic type are compared; port-only permits them |
| C8 Correct SBO | 3.1 | #2: 1 permit M → R1 DNP3 {READ, SELECT, OPERATE}. #1: none | correct | Exactly the ticketed FCs; H non-DNP3 tunnel denied by implicit deny; no ticket flow crosses #1, so its implicit deny is correct |
| C9 One conduit only | 3.2 | #2: 1 permit M → R1 DNP3 {READ}; 2 permit M → R2 DNP3 {READ, DIRECT_OPERATE}; 3 permit E → R2 DNP3 {READ}. #1: none | wrong-conduit (E→R2 READ denied at #1) | Multi-conduit flow must be permitted on every conduit of its path |
| C10 Shadowed deny | 3.1 | #2: 1 permit M → R1 DNP3 any FC; 2 deny M → R1 DNP3 {DIRECT_OPERATE, COLD_RESTART} | rule 2 shadowed; attack-allowed (M→R1 DIRECT_OPERATE, M→R1 COLD_RESTART); over-permissive | First match: rule 1 already permits them; fix by reordering or by permitting only READ, SELECT, OPERATE |
| C11 Boundary: SL-T 2 conduit #1 port-only | 3.2 | #1: 1 permit E → R2 tcp/20000; #2: rules from C9 | correct | #1 is effective SL-T 2, so port-only is acceptable there; #2 enforces FCs |
| C12 Content error | any | Ticket references asset "R3" not on the board | content-error screen naming round 1.1 and `unknown-asset`; not graded; no attempt | Authoring error, not learner failure |

### Key Entities

- **Board**: 8×8 cells; contains zones, assets and conduits.
- **Zone**: name, color, SL-T (1–3), set of cells; no overlaps.
- **Asset**: glyph, name, role (master, HMI, RTU/outstation, engineering workstation, vendor laptop, rogue), cell, zone.
- **Conduit**: cell, the two zones it joins, effective SL-T (derived), ordered rule list (≤ 8).
- **Rule card**: action, source, destination, service, function-code set (DNP3 only).
- **Flow**: source asset, destination asset, traffic type (DNP3, non-DNP3 on 20000, other TCP), function code (DNP3 only); path = ordered conduits crossed.
- **Ticket**: the round's required flows, with a plain-language work-order description.
- **Wave**: ordered authored packets; each is a flow plus optional limit kind (spoofed-source, intra-zone) and in-session flag.
- **Round result**: outcome categories, example flows, per-packet verdicts, shadowed rules.
- **Session progress**: per round — completed, valid attempts, highest help tier reached; current round.
- **Source reference**: title, section, supported claim; linked from briefings, hints and feedback.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the hand-checked cases (C1–C12 and each round's own cases) produce the expected result.
- **SC-002** *(descoped from v1 release evidence, 2026-11-21; not run)*: A first-time learner from the target audience completes all six rounds in 25 minutes or less of play.
- **SC-003** *(descoped from v1 release evidence, 2026-11-21; not run)*: After a wrong wave, a tester can state the specific mistake in their own words from the feedback alone in at least 5 of 6 rounds.
- **SC-004**: A tester completes round 1.1 using only the keyboard, with reduced motion enabled, without assistance.
- **SC-004a**: A tester completes round 1.1 in a 768 px-wide window and on a typical laptop window without horizontal scrolling or hidden controls.
- **SC-005**: Feedback and the wave log are available within 1 second of pressing Run Wave, with or without animation.
- **SC-006**: Every briefing, hint and feedback claim about DNP3 or IEC 62443 links to a source; a reviewer finds zero claims that contradict the cited source.
- **SC-007**: A new round using the existing boards can be added by changing content only and passing content validation.

## Assumptions

- Assets are identified by IP address only; DNP3 link-layer addresses are not modelled.
- DNP3 CONFIRM (0x00) and other protocol housekeeping inside an allowed session are treated as in-session traffic and always pass; they are not offered as filterable function codes.
- The Level 3 Substation SL-T rises from 2 to 3; the briefing presents this as the utility's response to the Level 2 incident.
- Every forbidden flow must be denied at every conduit it crosses (defense in depth), not only at one.
- In round 3.2, DIRECT_OPERATE is required for R2 (capacitor bank) and forbidden for R1, to show the ticket defines least privilege.
- Rounds are linear on first play; replaying a completed round is out of scope for v1.
- Out of scope: accounts, persistence across reloads, multiplayer, leaderboards, runtime AI, level editor, audio, DNP3 over UDP/serial, Secure Authentication behaviour, TLS, 62443 risk assessment, SL-C/SL-A, the Purdue model, and the "Storm Night" capstone (stretch).
- Sources (decision 2026-11-21): the paywalled ISA/IEC 62443 and IEEE 1815 texts are not available to this project. Every factual claim is backed by a public source the team has read (IANA registry, Wireshark DNP3 dissector, Cisco 62443-3-3 white paper, Cremers et al. SAv5 analysis, Extreme Networks IP Source Guard guide). Claims those sources can't support are narrowed or stated to the player as game assumptions, per constitution v1.1.0 Principle I.
