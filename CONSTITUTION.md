# Grid Defender · Project constitution

**Purpose:** help network engineers who are new to OT practice **IEC 62443 zone-and-conduit segmentation for DNP3 SCADA traffic** by **writing ordered firewall rules on an 8×8 board and running waves of DNP3 packets through the conduit**.

**First release:** one core mechanic (rule cards on a conduit cell, then Run Wave), three short levels of two rounds each, a browser, and a 60-minute workshop build. Change this budget only by updating the agreed scope. Domain detail and the candidate level ladder are in [FOUNDATION.md](FOUNDATION.md).

## C1 · Technical truth is a release requirement

The game must never reward a technically incorrect answer. Grading must be reproducible from a documented rule and the challenge inputs. Unsupported or ambiguous content is an authoring error: the game explains that the challenge is unavailable and does not grade it.

**Model being taught:**
- **Firewall:** stateful, first match, implicit deny. Rules match new connections. Replies and in-session traffic on an allowed connection return automatically.
- **DNP3:** over TCP, the outstation listens on 20000 and the master initiates the connection. Unsolicited responses (0x82) travel inside the master's connection. Players filter on the application-layer function codes listed in FOUNDATION.md.
- **IEC 62443:** zones, conduits, and zone SL-T. The SL-T → conduit-requirement mapping is a **game simplification**: 1 means all traffic goes through the conduit; 2 means deny by default with named flows; 3 means a DNP3 protocol check plus function-code restriction. A conduit enforces the higher SL-T of the two zones it joins, and a flow that crosses several conduits must be permitted by each one. The briefing says all this is simplified, and so does the README.
- **Honest limits:** some wave packets cannot be stopped by any conduit rule: a spoofed master address, and traffic that stays inside one zone. The game shows them, says which real control would address them, and never grades them or presents them as the player's failure.
- **Excluded:** DNP3 over UDP or serial, DNP3 link-layer addresses, Secure Authentication, TLS, dual-endpoint TCP, the 62443 risk assessment process, SL-C/SL-A, and the Purdue model.

Fictional assets, attack waves and breaker animations may illustrate a rule. They must not change it.

**Evidence:** hand-checked correct, incorrect and boundary cases for every round. A source and section for each DNP3 and 62443 claim. Review of all shipped briefings and explanations. Expected results are recorded independently of the evaluator under test.

## C2 · Every round teaches through a decision

The player's main action, choosing and ordering rule cards, must exercise the target skill. Introduce each concept (conduit, initiation direction, function code) in a briefing before a round tests it. Show every decision-relevant value: asset names and cells, zones, SL-T, the ticket's required flows, and the function codes available. A wrong wave names the specific failure (`required-blocked`, `attack-allowed`, `over-permissive`, `wrong-conduit`) with the packet, the conduit and the rule that matched, and gives a useful next step. A correct wave explains why the rule set is exactly least privilege.

Learning sequence: **zones & conduits on a two-zone board (L1) → who may initiate (L2) → function-code inspection, rule order and two conduits on a three-zone board (L3)**. No function code is "always bad": the round's ticket defines what is required, and everything else is denied. Hints reveal a method first, then a worked step. Worked solutions are available to a stuck learner, and viewing one is recorded as assistance, never as independent mastery.

**Evidence:** a teammate can connect each rule-card decision to a learning outcome, and can describe what a deliberately wrong rule set taught them.

## C3 · Progress is honest and retry is safe

A round completes only when a valid rule set is graded `correct` across the round's whole flow universe. A failed wave leaves the round playable. Running a wave with no rules, or with an incomplete rule card, gives input guidance and does not count as an attempt. Pressing Run Wave again cannot award progress twice.

The tower-defense framing is presentation only: **no lives, health bar, countdown, score or speed bonus.** Waves start only when the player presses Run Wave. Hints and retries carry no penalty. Completed rounds, attempts and assistance are shown separately, and completion is not proof of independent mastery. The specification must say exactly what advances a round, finishes a level and resets a session.

**Evidence:** checks for an empty rule set, an incomplete card, a failed wave, a repeated Run Wave, a hint, completion and reset all match the specification.

## C4 · Access is part of the core game

All core actions must work by keyboard with visible focus, readable labels and an understandable order: inspecting the board, adding, editing, reordering and deleting rule cards, Run Wave, hints, Next and Restart. Success and failure are explained in text as well as color. The board has a text equivalent (a table of each asset's cell, zone, SL-T and role, plus the conduit). The wave result is also a text log of each packet's verdict and the rule it matched. Respect reduced-motion preferences. Animation must never delay feedback or controls.

The board, rule list and log stay usable on a typical laptop and in a narrow window. The rule list and packet log may scroll in their own labeled containers, but must never hide Run Wave.

**Evidence:** a keyboard-only playthrough, a narrow-window check and a reduced-motion check. Record what was actually checked, and do not claim full accessibility certification.

## C5 · The first version is deterministic and self-contained

Ship authored content and deterministic domain logic. The game needs no account, backend, live device or network connection, packet capture, model or API key. Wave contents and their order are authored, not random. AI may help write code and assets during development, and its output gets the same review as any other contribution.

Runtime AI tutoring, generated scenarios, procedural boards and free-text rule parsing are stretch work. Adding any of them requires an explicit change to this constitution, the specification and the verification approach before implementation.

**Evidence:** a clean browser session can play using only the project's static files, and no external service decides an answer.

## C6 · Content and logic can be reviewed separately

Board layout, zones, SL-T, assets, the conduit, tickets (required flows), waves, hints, sources and difficulty live in editable data. The firewall evaluator is pure and separate from rendering, animation and progress tracking. Validate data before presenting a round. These are content errors: overlapping zones, a conduit that doesn't join exactly two zones, two zones with no conduit path between them, assets off the board, required flows that reference unknown assets, a ticket that violates its zone's SL-T rule, and a limit packet that a conduit rule *could* actually stop (it must be intra-zone, or identical at the firewall to a required flow).

**The answer key is the required flow set, not a rule list.** The evaluator compares the player's permitted set with the required set over the enumerated flow universe. Feedback must agree with the evaluator's reasoning, and a hand-authored answer can never override it.

Adding another round that uses the existing mechanic should require only a data change and its checks, not a new scoring path or screen.

**Evidence:** inspect one round's data, trace one player rule set through the evaluator flow by flow, and add a trial round without modifying the evaluator.

## C7 · Done is demonstrated

Ship only the agreed scope. The requirements, plan, tasks and README must describe the same game. A feature is complete when its acceptance criteria pass and its actual status is recorded. A screenshot, a checked task box or the agent saying "done" is not enough by itself.

When time is short, reduce scope explicitly. Cut Level 3 round 2 (the second conduit) before cutting correctness, so the three-zone board is the first thing to go. The Storm Night capstone stays a stretch goal until the six rounds are verified. Fix incorrect teaching and broken core interactions before adding packet animation or visual effects. Keep failed and untested checks visible.

**Evidence:** reproducible run and test commands, recorded verification results, a fresh-start playthrough, and a README another attendee can follow.

## How we change these rules

For any material change, record the reason, update the affected spec and plan, and rerun analysis. A conflict with this constitution is resolved openly. The build agent must not weaken a principle just to make its implementation pass.
