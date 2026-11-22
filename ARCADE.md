---
# ARCADE SUBMISSION — fill this file in, commit it to the ROOT of your game repository as ARCADE.md,
# then send John your GitHub URL. Everything between the two --- lines is machine-read.
#
# INSTRUCTIONS FOR THE BUILD AGENT (the coding agent that built this game):
#  1. You were there. Fill every field from your own session, your files and your tool list.
#  2. Do NOT invent. If something was not recorded or you do not know it, write "unknown".
#     A truthful "unknown" is better than a confident guess. Never estimate tokens or cost.
#  3. Ask the human ONLY for the fields marked (HUMAN): name, location, links, consent, first-project.
#  4. Keep strings on one line, quote any value containing a colon. Lists use [a, b, c] or "- item".
#  5. Do not put secrets, API keys, tokens, private URLs or file paths from the human's machine here.
#  6. Run the game once yourself and confirm the Runtime section is correct before you finish.
#  7. Then fill in the three short prose sections below the frontmatter. Plain language, no hype.
arcade_version: 1

game:
  title: "Grid Defender"
  slug: "grid-defender"
  tagline: "Write conduit firewall rules and stop DNP3 attack waves on an 8x8 substation grid"
  summary: "You are the OT network engineer at a small electric co-op. In each round you build ordered firewall rule cards on the conduits between IEC 62443 zones, run a wave of DNP3 traffic, and see exactly what got through and why. You learn least-privilege conduit policy, why a stateful conduit needs no inbound rule for DNP3, and DNP3 function-code filtering across two conduits."
  topics: [IEC 62443, Zones and conduits, DNP3, Firewall policy, SCADA]
  category: "security"
  skill_level: "intermediate"   # players are expected to know IP, ports and ordered ACLs; no OT experience assumed
  play_minutes: 20              # spec target is 15-25 minutes for six rounds; not measured with a learner
  levels: 6                     # 3 levels x 2 rounds
  card_image: ""                # no card image exists in the repo yet
  card_image_alt: ""
  repo: "unknown"               # the repo has not been pushed to GitHub; no remote is configured
  repo_path: ""
  license: "unknown"            # no LICENSE file in the repo

creator:
  name: "Daniel Minnick"
  github: "FeelinRouty"
  location: ""
  organization: ""
  links: []
  first_spec_project: true
  workshop: "NAF AC6"
  consent_to_publish: true

build:
  started: "2026-11-21"
  finished: "2026-11-21"
  wall_time: "unknown"
  spec_driven:
    framework: "GitHub Spec Kit"
    framework_version: "1.4.2.dev0"   # from .specify/init-options.json; `specify version` was not run
    artifacts: [constitution, spec, clarify, plan, research, data-model, contracts, quickstart, tasks, checklists]   # the /speckit.analyze report was shown in the session, not saved to a file
    task_count: 58
    loops_or_phases: 8           # tasks.md phases 1-8 (setup, foundational, US1, US2, US5, US3, US4, polish)
  model: "claude-opus-5-5"
  helper_models: ["web-fetch sub-agents for reading web pages (model ID not reported)"]
  harness: "Claude Code (Claude desktop app, Code tab)"
  harness_version: "unknown"   # the desktop app's browser pane reported Claude/6.6395.0 in its user agent; the Claude Code version itself was not recorded
  mcp_servers: ["Claude_Browser (built-in browser pane; used for every browser check)", "ccd_turn (Claude app task list and wrap-up; used)", "ccd_session, ccd_session_mgmt, ccd_view, ccd_window, ccd_sidebar, ccd_settings, ccd_pr, ccd_host, ccd_directory, ccd_connectors (Claude app; connected, not used)", "Claude Docs connector (connected, not used)", "claude-in-chrome (connected, not used)", "Claude_Code_iOS_Simulator (connected, not used)", "terminal (connected, not used)", "visualize (connected, not used)", "mcp-registry (connected, not used)", "scheduled-tasks (connected, not used)", "easel (connected, not used)", "claude-artifacts (connected, not used)"]
  rag_and_sources: ["NAF AC6 starter kit templates in the repo (CONSTITUTION.md, SPEC.md, PLAN.md, README.md)", "GitHub Spec Kit skill files in .github/skills (constitution, specify, clarify, plan, tasks, analyze, implement)", "IANA Service Name and Port Number Registry: dnp 20000/tcp", "Wireshark DNP3 dissector source epan/dissectors/packet-dnp.c", "Cisco white paper: ISA/IEC-62443-3-3: What is it and how to comply? (updated 16 Aug 2024)", "Cremers, Dehnel-Wild and Milner: Secure Authentication in the Grid: A Formal Analysis of DNP3 SAv5 (2017)", "Extreme Networks SLX-OS 20.5.1 guide: IP Source Guard and DHCP Snooping", "Web search results used to find the above"]
  skills_and_plugins: ["Spec Kit commands speckit-constitution, speckit-specify, speckit-clarify, speckit-plan, speckit-tasks, speckit-analyze, speckit-implement (run by following their .github/skills SKILL.md files; not invoked as Claude skills)", "Claude app PostToolUse hook notices for the browser preview"]
  other_tools: ["Node.js v26.8.1 (terminal test runner)", "Custom dependency-free browser test runner (tests/index.html)", "Python 3 http.server", "Chrome 156.0.8078.100 in the Claude desktop app browser pane", "WebSearch", "WebFetch (via sub-agents)", "curl", "git", "shasum"]
  human_prompts: 22              # chat messages from the human; answers to the agent's multiple-choice questions are not counted
  usage:
    input_tokens: unknown
    output_tokens: unknown
    cost_note: "unknown"
  ai_generated_assets: ["code, game content and documentation: claude-opus-5-5", "images: none", "audio: none"]

runtime:
  kind: "static-web"
  stack: [HTML, CSS, JavaScript ES modules, JSON content]
  start: "python3 -m http.server 8000 --bind 127.0.0.1"
  url_after_start: "http://127.0.0.1:8000"
  hosted_url: ""
  static_root: "."
  requires_install: false
  requires_network: false
  requires_api_key: false
  uses_ai_at_runtime: false
  browsers: ["Chrome 156 (Claude desktop app browser pane)"]
  accessibility: "Keyboard: Tab and Enter tested with real key presses through Start, Add rule, Run Wave and Next, with a visible focus ring; choosing options inside native dropdowns by keyboard was not verified. Reduced motion: tested by simulating the media query, not the OS setting. 768 px layout tested. Screen reader: not tested; live-region text checked only."
  save_state: "none (progress is in memory; reload starts a new session)"

verification:
  tests: "node tests/run-node.mjs (or open /tests/ after starting the server)"
  tests_passing: 65
  facts_sourced_from: ["IANA port registry (dnp 20000/tcp)", "Wireshark packet-dnp.c (DNP3 function codes, default port)", "Cisco ISA/IEC-62443-3-3 white paper (zones, conduits, SL 0-4, FR 5)", "Cremers, Dehnel-Wild and Milner 2017 (DNP3 Secure Authentication, IEEE 1815-2012 chapter 7)", "Extreme Networks SLX-OS guide (IP Source Guard)"]
  known_limits: ["The ISA/IEC 62443 and IEEE 1815 texts were not consulted (paywalled); claims rest on public secondary sources", "Per-zone target security levels and their mapping to firewall rules are a game simplification", "Models only DNP3 over TCP with the master opening every connection; no UDP, serial, link-layer addresses, TLS or outstation-initiated connections", "Secure Authentication behaviour is explained but not simulated", "No 62443 risk assessment, other kinds of security level, or Purdue model", "Spoofed-source and intra-zone packets are shown as out of reach and never graded", "Learner playtest and manual keyboard-dropdown and VoiceOver checks were descoped and not run", "Widths below 768 px are not supported; no saved progress"]
---

## In one paragraph

Grid Defender is a browser game for network engineers who already know IP, ports and firewall rule order, but are new to OT and utility SCADA. Across six rounds on an 8×8 board, you write rule cards on the conduits between IEC 62443 zones so a SCADA master can poll its RTUs over DNP3, and nothing else gets through. Each wave shows every packet's fate. Your policy is graded against every possible flow, not only the sample traffic, so over-broad rules are caught even when no attack used them. It suits anyone who wants to see why "port 20000 is open" isn't the same as "only the right actions are allowed".

## How it was built

We started from the NAF AC6 starter templates and a clarifying conversation that fixed the mechanic: rule cards on a conduit, then run a wave. It also fixed a stateful first-match firewall, a ladder that escalates to DNP3 function codes, and a tower-defense presentation with no timer or lives. The human then reshaped the level ladder, adding a second conduit in Level 3, attacks a firewall can't stop, and a rule that the ticket decides whether DIRECT_OPERATE is allowed. The Spec Kit artifacts followed in order: constitution, spec, clarify (five answers), plan with research, data model, contracts and quickstart, then tasks and analyze (twelve findings, all fixed), and implementation in eight phases.

Testing in the browser caught real bugs. Dropdown labels were wrapping their own selects, announcements failed in background tabs, animation keyframes left the packet dots invisible, and hints repeated their labels. Late in the build, the human chose to narrow every claim to public sources we could actually read, rather than cite paywalled standards unchecked. The learner playtest and the manual screen-reader checks were descoped and left visible as not run.

## What we'd tell the next builder

- Write the grading cases by hand before any UI, and grade against every possible flow, not just the demo traffic. That decision caught over-broad rules and made adding a round a content-only change.
- Decide early which sources you can actually read. Citing paywalled standards you can't check creates rework, so narrow claims to the evidence or label them as game assumptions from the start.
- Check each change in a real browser and measure, don't eyeball. Several bugs, including invisible animation dots, only showed up when sampling the page state mid-run.
