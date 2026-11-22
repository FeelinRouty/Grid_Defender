# Grid Defender

![Grid Defender title card in a dark control-room style: the Level 3 board with Engineering, Control Center and Substation zones, where a green path from the engineering workstation crosses both firewall conduits to RTU R2 and a vendor laptop's red path is stopped before conduit 1.](assets/images/card.webp)

**Write firewall rules on an 8×8 substation grid, run waves of DNP3 traffic through your conduits, and learn IEC 62443 zones and conduits by watching what gets through.**

Grid Defender is a browser game for network engineers who know IP, ports and ordered firewall policies but are new to OT and SCADA. You play the OT network engineer at a small electric co-op. In each round you build rule cards on the conduits between zones so the SCADA master can do its job, and so that nothing else can. Every wave explains what got through, what was stopped, and why.

A project from **NAF AC6 — Loop Engineering, Spec-Driven Development & the Future of VibeOps**.

| Project | Details |
| --- | --- |
| Status | v1 complete. Playable, with automated and scripted browser checks recorded below. Every factual claim cites a public source we read. The learner playtest and the manual keyboard and VoiceOver checks were descoped and have not been run. |
| Networking topic | IEC 62443 zones, conduits and target security levels (SL-T); DNP3 over TCP (IEEE 1815); stateful first-match firewall policy |
| Typical session | 15–25 minutes for six rounds (target; not yet measured with a learner) |
| Live demo | Not published yet |
| Built by | Daniel Minnick |

## The challenge

In round 1.1 the board shows the Control Center zone (rows 1–3) with the SCADA master **M** at C2 and an HMI **H** at F2, and the Substation zone (rows 5–8) with RTUs **R1** at B6 and **R2** at G6. The only path between the zones is conduit **A** at D4. The ticket says *M must read R1 over DNP3*. If you permit `Control Center → Substation, any service`, the wave shows the HMI's direct poll and a telnet session sailing through, and the game reports **attack allowed** and **over-permissive**: 28 flows the ticket doesn't need. If you permit only `M → R1 tcp/20000`, those packets stop at the implicit deny and the round is **correct**.

## What you'll learn

| By the end, you can… | You'll practise by… |
| --- | --- |
| Explain that cross-zone traffic must pass a conduit, and write a least-privilege conduit policy | Permitting only the ticketed master → RTU flows (Level 1) |
| Say which side opens a DNP3 TCP session, and why a stateful conduit needs no inbound rule for responses or unsolicited alarms (0x82) | Denying RTU-initiated connections while unsolicited alarms still arrive (Level 2) |
| Restrict DNP3 by function code, order rules to avoid shadowing, and permit a flow on every conduit it crosses | Writing SL-T 3 rules with READ / SELECT / OPERATE, and a two-conduit path from Engineering (Level 3) |
| Name two threats a conduit can't stop, and the control that would | Reading the "out of reach" notes for a spoofed master address and RTU-to-RTU traffic |

**Before playing:** source/destination/port matching and first-match rule order. Each level's briefing teaches the OT parts.

## Play locally

Clone or download this repository and open a terminal in the project root:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

On Windows:

```powershell
py -m http.server 8000 --bind 127.0.0.1
```

Open **http://127.0.0.1:8000**. Press **Ctrl+C** to stop the server. The game loads ES modules and JSON, so it must be served over HTTP; opening `index.html` with `file://` is not supported. There is nothing to install and no build step.

## How to play

1. Choose a level on the level select screen. Each card says what the level teaches. Read the briefing and its story, then press **Start**.
2. Read the **Work order**: it lists the exact flows that must work, with **NEW** on the lines this round adds. Everything else must be denied.
3. Rounds build on each other: each round opens with your rules from the round before (or that round's reference rules if you skipped it), so you change only what the work order needs. Edit a card, or add one with **Add rule**. Each card has an action (Permit or Deny), a source and destination (an asset, a whole zone or Any, grouped by zone), and a service (`DNP3`, `tcp/20000`, `Other TCP` or `Any`). Function codes appear only for DNP3, and one card can carry several. Use **↑ / ↓** to order cards, since the first match wins. In Level 3, choose which conduit you are editing.
4. Press **Run Wave**. The result panel explains each problem and the wave log lists every packet's verdict, and then packets animate across the board.
5. Fix and retry as often as you like. A correct round enables **Next**.
6. Stuck? **Help** reveals a method, then a worked step, then the reference rules as text you type in yourself.

| Control | Action |
| --- | --- |
| Mouse or keyboard (Tab, Enter, Space, arrow keys) | Every control is a native button, radio button or checkbox; the chips are styled radio buttons and checkboxes |
| Run Wave | Grades the round and plays the wave; an incomplete card gives guidance instead and doesn't count |
| Help | Up to three hints per round; recorded as assistance and never completes a round |
| Levels (header) | Returns to the level select; progress is kept |
| Restart (header) | Asks for confirmation; Confirm clears the session and returns to the level select, Cancel or Escape changes nothing |

**Progress:** an attempt is a valid Run Wave on an unsolved round. A round completes the first time it is graded correct, and running again afterwards changes nothing. The summary shows, per round, whether it was completed, the valid attempts, and the help used. There are no lives, timer or score. Reloading the page starts a fresh session.

## What this game models

- **Firewall:** stateful, first match, implicit deny. Rules decide new connections; replies and unsolicited responses on a permitted connection return automatically.
- **DNP3:** port 20000 is the registered DNP3 port. **Game assumption:** the RTU listens on TCP 20000, the master opens every connection, and unsolicited responses (0x82) return inside it. Real devices can be set up in other ways. The function codes you can filter are READ 0x01, WRITE 0x02, SELECT 0x03, OPERATE 0x04, DIRECT_OPERATE 0x05, COLD_RESTART 0x0D and STOP_APPL 0x12. In this game, DIRECT_OPERATE stands for control without the select step.
- **ISA/IEC 62443:** zones group assets with common security requirements, conduits group the communication channels between zones, and the standard defines security levels SL 0–4. **Game assumption:** each zone has a target security level (SL-T) that the game turns into firewall rules. SL-T 2 means deny by default and permit named source → destination → service flows. SL-T 3 adds a DNP3 protocol check and function-code restriction. A conduit enforces the higher SL-T of the two zones it joins, and a flow crossing two conduits must be permitted on both. This mapping is ours, not a rule taken from the standard.
- **Grading:** your rules are checked against *every* possible cross-zone flow in the round, not just the wave. A round is correct only if each conduit permits exactly the ticketed flows (on an SL-T 2 conduit, a port-only rule for a ticketed source → destination is accepted). The wave is a sample chosen to show the round's lesson.
- **Honest limits:** a forged master address and traffic that stays inside one zone can't be stopped by any conduit rule. The game shows them as "out of reach", explains what would help (DNP3 Secure Authentication, switch features such as IP Source Guard, smaller zones), and never grades them.

**Outside the model:** DNP3 over UDP or serial, DNP3 link-layer addresses, Secure Authentication behaviour, TLS, outstation-initiated TCP connections, the 62443 risk-assessment process, other kinds of security level, and the Purdue model.

**How claims are sourced.** The ISA/IEC 62443 and IEEE 1815 standards are paywalled and were not available to this project. Every factual statement in the game is backed by a public source we read on 2026-11-21. Anything those sources couldn't support was narrowed, or labelled in the game as a game assumption. The standards themselves remain the authority: if you have them, please check our wording against them.

| Source we read | What it supports in the game |
| --- | --- |
| [IANA port registry](https://www.iana.org/assignments/service-names-port-numbers/service-names-port-numbers.xhtml?search=20000): `dnp`, 20000/tcp | Port 20000 is the registered DNP3 port |
| [Wireshark DNP3 dissector](https://gitlab.com/wireshark/wireshark/-/blob/master/epan/dissectors/packet-dnp.c) (`packet-dnp.c`): Application Layer function codes, `TCP_PORT_DNP` | Function-code values and names, the default port 20000, and that a control can be refused with "No SELECT received" |
| [Cisco white paper: ISA/IEC-62443-3-3: What is it and how to comply?](https://www.cisco.com/c/en/us/products/collateral/security/isaiec-62443-3-3-wp.html) (updated 16 Aug 2024): sections on zones and conduits, foundational requirements, and FR5 | Zone and conduit definitions; SL 0–4 definitions; FR 5 Restricted Data Flow (SR 5.1 network segmentation, SR 5.2 zone boundary protection, least privilege). A vendor summary, not the standard |
| [Cremers, Dehnel-Wild and Milner: *Secure Authentication in the Grid: A Formal Analysis of DNP3: SAv5*](https://www.cs.ox.ac.uk/files/9139/esorics-extended-version.pdf) (2017): §1, §2.1 | DNP3 is IEEE 1815-2012; master stations command outstations; Secure Authentication v5 (Chapter 7 of IEEE 1815-2012) lets an outstation challenge critical requests; it addresses spoofing, modification and replay |
| [Extreme Networks SLX-OS 20.5.1: IP Source Guard and DHCP Snooping](https://documentation.extremenetworks.com/slxos/SW/20xx/20.5.1/l3config/GUID-172160F3-B188-44E2-A9A2-D4D5C245AC84.shtml) | Switch-port filtering that limits a host claiming another host's IP address |

## Run the tests

With the server running, open **http://127.0.0.1:8000/tests/**. Or, with Node 18+:

```sh
node tests/run-node.mjs
```

The runner reports totals and the IDs of any failed tests, and treats zero discovered tests as a failure. The evaluator's expected results (`tests/cases.js`, C1–C14) were written by hand from the specification and are never computed by the engine.

## How it was built

The project follows Spec Kit: **constitution → specify → clarify → plan → tasks → analyze → implement**.

- **Stack:** semantic HTML, CSS and native JavaScript ES modules. No framework, bundler, dependency or backend.
- **Runtime:** static files only. No account, network service, model or API key.
- **Build tools:** Claude Code with GitHub Spec Kit 1.4.2.dev0.
- **Working artifacts:** `.specify/memory/constitution.md` (v1.0.1) and `specs/001-grid-defender-v1/` (spec, plan, research, data model, contracts, quickstart, tasks with an implementation log). `FOUNDATION.md` holds the original design notes; the spec is authoritative where they differ.
- **Layout:** `engine/` holds pure logic (flows, rules, content validation, session state, feedback text), `ui/` holds the views, `data/levels.json` holds all content, and `tests/` holds both test runners.
- **One useful design decision:** grading compares the permitted flow set with the ticket over every possible flow, with an SL-T 2 "don't care" class. That accepts any equivalent correct answer, catches over-broad rules that the wave didn't happen to exercise, and lets a round be added by changing content alone, which the trial-round test proves.

## Verification

**Last checked:** 2026-11-21, macOS, Chromium (Claude desktop app browser pane) and Node 26.8.1, on the working tree before the first commit. A fresh copy was served from a subfolder for the final run.

**Automated:** `node tests/run-node.mjs` → **PASS 81/81** (2026-11-22). That covers evaluator cases C1–C14 (with extra hand-checked cases for the reworked rounds 2.1 and 2.2), the limit-packet rules, a speed budget, purity, content validation (17 error codes, the shipped file, and that every source was checked), the trial round, session state, and the round chain: every reference solution is graded correct, and no round is already solved by the rules it starts with.

**2026-11-22 update (themed v1.1):** level select, level stories, rounds that build on each other, the chip rule editor, and DNP3 function codes shown only for the DNP3 service. Checked in the browser pane at 1280 px: level select → Level 3 → round 3.1 solved with real chip clicks (one card carrying READ, SELECT and OPERATE) → Next carried those rules into 3.2 → an empty card was flagged and focused. Keyboard-only and screen-reader passes were not repeated for the new editor.

| Acceptance criterion | Result | Evidence |
| --- | --- | --- |
| US1-1 Briefing before the board | Pass | Manual V1 |
| US1-2 Correct rule is graded correct with explanation | Pass | C1; manual V3 |
| US1-3 Zone-wide permit: over-permissive + attack allowed, retry | Pass | C2; manual V2 |
| US1-4 Deny-all: required blocked | Pass | C3 (automated) |
| US1-5 Empty or incomplete card: guidance, no attempt | Pass | C13; manual V4 |
| US2-1 Next → next round / briefing / summary | Pass | State tests; full six-round playthrough |
| US2-2 Run Wave after success changes nothing | Pass | State test; manual V5 |
| US2-3 Wrong valid run adds one attempt | Pass | State test; manual V15 |
| US2-4 Restart confirm / cancel | Pass | State tests; manual V9 (Cancel, Escape, Confirm) |
| US2-5 Summary shows completed, attempts, help | Pass | Manual V15 |
| US3-1 Both-directions feedback | Pass | C5; manual V16 |
| US3-2 Three help tiers, never complete a round | Pass | State tests; manual V6 |
| US3-3 Shadowed rule note | Pass | C10; manual V17 |
| US4-1 Intra-zone packet out of reach, round still correct | Pass | C14 and limit tests; manual V7 |
| US4-2 Spoofed packet out of reach, Secure Authentication + anti-spoofing named | Pass | Limit tests; manual V7 |
| US4-3 Limit packets never fail or add attempts | Pass | Limit tests (5 rule sets) |
| US5-1 Keyboard reaches every core action, visible focus | **Partial** | Real Tab/Enter key presses through Start → Add rule → Run Wave → Next; focus ring visible. **Not verified:** choosing an option inside a native dropdown by keyboard. That manual check was descoped from v1 by the project owner on 2026-11-21; the steps are kept in [docs/accessibility-checklist.md](docs/accessibility-checklist.md) |
| US5-2 Text log per packet; result announced | **Partial** | Log lines and live-region text checked; **not** tested with a real screen reader. That VoiceOver check was descoped from v1 by the project owner on 2026-11-21; the steps are kept in [docs/accessibility-checklist.md](docs/accessibility-checklist.md) |
| US5-3 Reduced motion: no movement, no lost information | Pass (simulated) | The reduced-motion media query was stubbed to true; the OS setting itself was not toggled |
| US5-4 Board text equivalent | Pass | Manual V19 |

| Other check | Result | Notes |
| --- | --- | --- |
| Layout at 768 px (SC-004a) | Pass | Stacked layout, page width = viewport (no horizontal scroll), Run Wave outside scrolling lists |
| Feedback speed (SC-005) | Pass | About 1 ms from Run Wave to filled results; grading test budget under 100 ms |
| Content error blocks the game (C12) | Pass | Manual V13: "Round 1.1 unavailable: unknown-asset" |
| New round from content only (SC-007) | Pass | Trial-round test; `engine/*.js` checksums unchanged |
| Served from a subfolder | Pass | Fresh copy served at `/Grid_Defender/`; game and tests load with relative paths |
| Every claim backed by a source we read (SC-006) | Pass | All 5 source records read on 2026-11-21 and checked by a content test; unsupported claims narrowed or labelled as game assumptions. The standards themselves were not consulted (paywalled) |
| Learner playtest (SC-002, SC-003) | **Not run, descoped** | Descoped from v1 by the project owner on 2026-11-21. Whether the feedback teaches a first-time learner is unmeasured. The script is kept in [docs/playtest-script.md](docs/playtest-script.md) |

## Known limitations and next steps

- **Known limitations:**
  - Claims rest on public secondary sources, not the IEC 62443 and IEEE 1815 texts themselves.
  - Keyboard use of the chip editor and screen-reader output haven't been checked by a person.
  - Widths below 768 px are not supported.
  - Progress isn't saved across reloads.
- **Next improvement:** run the learner playtest ([docs/playtest-script.md](docs/playtest-script.md)) and the keyboard/VoiceOver check ([docs/accessibility-checklist.md](docs/accessibility-checklist.md)). Both were descoped from v1, so the game's teaching effect and its screen-reader experience are unverified.

Found an incorrect answer or unclear explanation? Open an issue with the round, your rule cards, the result you expected and the result you got, and a reference if you have one.

## Credits

Created by Daniel Minnick, built with Claude Code. Workshop by John Capobianco, Joksan Flores and Elliot Conner. Adapted from the [NAF AC6 workshop materials](https://github.com/automateyournetwork/NAF_AC6) and the [Networking Video Game Starter Kit](https://github.com/automateyournetwork/NetworkingVideoGameStarterKit), using [GitHub Spec Kit](https://github.com/github/spec-kit).

**Assets and dependencies:** original assets only; no third-party runtime dependencies.

**License:** no license file has been added yet. Choose one before publishing.
