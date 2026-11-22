# Grid Defender · Domain foundation

> **Background notes only.** Its section-level references to ISA/IEC 62443 and IEEE 1815 were never checked; the game's sourced claims are in `data/levels.json` and the README. Where this file differs from `specs/001-grid-defender-v1/` (for example, CONFIRM 0x00 is no longer filterable and the round 2.2 spoofed packet comes from the HMI), the spec is authoritative.

Source material for `/speckit.constitution` and `/speckit.specify`. This file records the technical model, the game's simplifications, and the decisions made during design. The constitution states the rules the project enforces. This file is the evidence behind them.

## Design decisions (agreed 2026-11-21)

| Decision | Choice |
| --- | --- |
| Name | **Grid Defender** (the 8×8 board is a grid, and so is the power system) |
| Core action | Pre-painted zones and placed assets on an 8×8 board. The player writes ordered firewall rules on a conduit cell, then presses **Run Wave**. DNP3 packets animate across the board and are allowed or dropped. |
| Board growth | L1–L2: two zones (Control Center, Substation) and one conduit. L3: a third zone (Engineering) and a second conduit, so flows can cross two conduits. |
| Attack scenarios | Over-broad zone permits, outstation-initiated connections, a compromised legitimate master, non-DNP3 traffic on tcp/20000, plus two **limit** cases a conduit firewall cannot stop: a spoofed master IP and lateral RTU-to-RTU traffic |
| DIRECT_OPERATE (0x05) | Not always bad. **The ticket decides:** 0x05 is an attack in 3.1 (SBO required) and a required flow in 3.2 (capacitor bank). |
| Round count | 6 rounds. A "Storm Night" capstone is a stretch goal only. |
| Rule input | Rule cards with dropdown fields (action, source, destination, service, DNP3 function code), with controls to add, delete and reorder. There is no free-text parsing. |
| Firewall model | **Stateful, first match, implicit deny.** Rules match *new connections* top-down. Replies and in-session traffic on an allowed connection return automatically. |
| DNP3 depth | Escalates by level: L1 IP + TCP/20000 → L2 who may *initiate* → L3 DPI on application-layer function codes |
| IEC 62443 scope | Zones, conduits, and the **target security level (SL-T)** of each zone, which sets that zone's conduit requirements (a game rule, see below) |
| Win rule | **Required flows pass + attacks blocked + least privilege.** Grading checks every possible flow, not only the ones in the wave. |
| Feel | Tower-defense presentation: the rules are your "towers" and the attack traffic arrives in waves. The game is **turn-based**: no timer, lives or score, as constitution C3 requires. |

## Learner

Network engineers who already know IP, TCP ports and ordered ACLs or firewall policies. They may never have worked in OT or utility SCADA. The game has to teach *what is different*: an allowed port is not an allowed action, and segmentation comes from a design model (zones and conduits), not from where the VLANs happen to be.

## IEC 62443 model taught

| Concept | Game representation | Source |
| --- | --- | --- |
| **Zone**: a grouping of assets with common security requirements | A colored region of board cells, with a name and an SL-T badge | ISA/IEC 62443-3-2, zone and conduit definitions |
| **Conduit**: a grouping of communication channels between zones that share security requirements | The one board cell where two zones meet. It holds the firewall rule list. Cross-zone packets must pass through it. | ISA/IEC 62443-3-2 |
| **SL-T (target security level), 1–4** | A badge on each zone that sets what the conduit must enforce | ISA/IEC 62443-3-2 (SL-T assignment), 62443-3-3 (SLs) |
| **FR 5 Restricted Data Flow**: SR 5.1 network segmentation, SR 5.2 zone boundary protection (deny by default, allow by exception) | The implicit deny, plus least-privilege grading | ISA/IEC 62443-3-3, FR 5 |

SL definitions (short form, 62443-3-3): SL1 protects against casual or coincidental violation. SL2 protects against intentional violation using simple means. SL3 protects against sophisticated means with IACS-specific skills. SL4 protects against sophisticated means with extended resources.

**Game rule (simplification, must be shown in the briefing):** SL-T maps to conduit requirements as follows:

| Zone SL-T | Conduit must… |
| --- | --- |
| 1 | carry all cross-zone traffic (no bypass path exists) |
| 2 | also deny by default and permit only named source → destination → service |
| 3 | also check that tcp/20000 traffic is really DNP3, and restrict it to the function codes the flow needs (application-layer inspection) |

A conduit enforces the requirement of the **higher** SL-T of the two zones it joins.

The standard does **not** say "SL3 = DNP3 function-code filtering". It defines requirements and their enhancements per SL, and the system integrator chooses the countermeasures. The game makes the mapping fixed so it can be taught. Before shipping, check the SR 5.2 requirement-enhancement-to-SL mapping against a licensed copy of 62443-3-3.

**Excluded:** risk assessment (the 62443-3-2 ZCR steps), SL-C / SL-A, component requirements (62443-4-2), the Purdue model (it is not part of 62443 and is never presented as if it were), wireless, remote access, and the IDMZ.

## DNP3 model taught

- **Roles:** a **master** (the SCADA front end in the control center) polls **outstations** (RTUs/IEDs in substations).
- **Transport:** DNP3 over **TCP, outstation listens on port 20000** (IANA `dnp` / IEEE 1815). The master initiates the TCP connection.
- **Unsolicited responses (FC 0x82)** travel outstation → master **inside the master-initiated connection**. A stateful firewall needs no inbound rule for them. Level 2 is built on this misconception.
- **Function codes used in the game** (IEEE 1815 application layer):

| FC | Name | Direction | Game risk |
| --- | --- | --- | --- |
| 0x00 | CONFIRM | master → outstation | low |
| 0x01 | READ | master → outstation | low (polling) |
| 0x02 | WRITE | master → outstation | medium (e.g. time sync, clear restart IIN) |
| 0x03 | SELECT | master → outstation | high: first step of select-before-operate (SBO) |
| 0x04 | OPERATE | master → outstation | high: trips or closes a breaker after SELECT |
| 0x05 | DIRECT_OPERATE | master → outstation | high: control without the SBO safety step |
| 0x0D | COLD_RESTART | master → outstation | critical: restarts the device |
| 0x12 | STOP_APPL | master → outstation | critical |
| 0x81 | RESPONSE | outstation → master | reply, in-session |
| 0x82 | UNSOLICITED_RESPONSE | outstation → master | in-session |

**Excluded:** DNP3 over UDP or serial, link-layer DNP3 addresses (all assets are identified by IP), data link and transport function codes, Secure Authentication (SAv5/SAv6), DNP3-over-TLS, dual-endpoint / outstation-initiated TCP, fragmentation, IIN bits, object groups and variations. Response FCs (0x81/0x82) are never matched by player rules. They always ride on an allowed connection.

## Grading model (deterministic)

1. Each round defines a finite **flow universe**: every source asset × destination asset in a *different* zone × traffic type × function code, using the dropdown values available in that round. There are three traffic types: `dnp3` (genuine DNP3 on tcp/20000), `non-dnp3-20000` (another protocol tunneled on tcp/20000) and `other-tcp`.
2. Rule-card service options are `tcp/20000 (port only)`, `DNP3 (protocol-checked)` and `any`. The function-code field is enabled only for `DNP3 (protocol-checked)`. A port-only rule matches both `dnp3` and `non-dnp3-20000`.
3. Each round lists its **required flows** (the "ticket"). Everything else must be denied.
4. A flow's **path** is the ordered list of conduits between its source and destination zones. It is permitted end to end only if every conduit on the path permits it, and each conduit evaluates its own rules (first match, implicit deny).
5. **Per-conduit least privilege:** among the flows that cross a conduit, that conduit must permit exactly the required ones, compared at the granularity its SL-T sets. At SL-T 2 the comparison uses source, destination and port. At SL-T 3 it also uses traffic type and function code. So a port-only rule is acceptable on an SL-T 2 conduit and `over-permissive` on an SL-T 3 conduit.
6. The evaluator runs the player's rules against **every flow in the universe**.
7. Outcome codes:
   - `required-blocked`: a needed flow was denied (the lights go out)
   - `attack-allowed`: a flow from the wave got through
   - `over-permissive`: a flow outside the required set is permitted, even if no wave packet used it (a least-privilege failure)
   - `shadowed-rule`: a rule can never match because a rule above it matches first (feedback only, not a failure on its own)
   - `correct`: the permitted set equals the required set exactly
   - `wrong-conduit`: a multi-conduit required flow is permitted on one conduit and denied on another (L3)
8. The **wave** is a curated, authored sample of that universe, chosen so it shows the round's misconception. The animation shows wave packets only, and the evaluator alone decides pass or fail.
9. **Limit packets** are authored wave packets marked `limit: "spoofed-source"` or `limit: "intra-zone"`. They are animated and explained but **never graded**, because no rule set on a conduit can stop them:
   - *Spoofed source:* at the firewall the packet looks identical to the master's permitted flow. Explain that the remedy is outside the conduit firewall: DNP3 Secure Authentication, switch anti-spoofing, and monitoring.
   - *Intra-zone:* the packet never crosses a conduit. Explain that zones don't police their own internal traffic, and that the 62443 remedy is to split the zone or add controls inside it.

   Limit packets end with a neutral "out of reach" verdict, never a red failure, so the player is not blamed for something they couldn't prevent.

Because the universe is small and enumerable, any rule set that permits exactly the required set is accepted. The answer key is a set of flows, not a particular rule list.

## Board conventions

- Coordinates are columns **A–H** and rows **1–8**, as in chess.
- Each cell belongs to at most one zone. A conduit cell sits on the boundary between two zones, and each conduit joins exactly two zones.
- Zones only meet at conduits, so in L3 traffic from Engineering must pass through the Control Center to reach the Substation: **K ↔ C ↔ S**.
- Asset glyphs: **M** master, **R** RTU/outstation, **H** HMI, **E** engineering workstation, **V** vendor laptop, **X** attacker or compromised host. Every glyph also has a text label and an entry in the board's text equivalent (C4).
- The packet path is drawn through the conduit for teaching. The path never affects grading.

## Level ladder (3 levels × 2 rounds)

### Boards

```text
Levels 1–2 (two zones, one conduit)       Level 3 (three zones, two conduits)
  A B C D E F G H                           A B C D E F G H
1 C C C C C C C C   C = Control Center     1 K K K . C C C C   K = Engineering (SL-T 2)
2 C . M . . H . C       (SL-T 2)           2 K E K #1C M H C   C = Control Center (SL-T 2)
3 C C C C C C C C                          3 K V K . C C C C   S = Substation (SL-T 3)
4 . . . # . . . .   # = conduit C↔S        4 . . . . . #2. .   #1 = conduit K↔C (SL-T 2)
5 S S S S S S S S   S = Substation         5 S S S S S S S S   #2 = conduit C↔S (SL-T 3)
6 S R1. . . . R2S       (SL-T 2)           6 S R1. . . . R2S
7 S . . . X . . S                          7 S . . . . . . S
8 S S S S S S S S                          8 S S S S S S S S
```

Exact cells are illustrative. The spec fixes them, and the validator checks them.

### Rounds

| Round | Ticket (required flows) | Wave: graded packets | Wave: limit packets | Misconception exposed |
| --- | --- | --- | --- | --- |
| **1.1 First poll** | M → R1 dnp3 | H → R1 dnp3; M → R1 other-tcp (telnet) | — | "Permit Control Center → Substation, any" is fine. It isn't: the HMI and telnet get through. |
| **1.2 Second feeder** | M → R1, M → R2 dnp3 | H → R2 dnp3 | **R1 → R2 lateral** (intra-zone) | "The conduit protects everything in the zone." It only sees traffic that crosses it. |
| **2.1 Who calls whom** | M → R1 dnp3 (R1 sends unsolicited 0x82 in-session) | **Compromised R1 → M** new connection | — | "DNP3 is bidirectional, so permit both directions." Only the master initiates. |
| **2.2 Unsolicited & spoofing** | M → R1, M → R2 dnp3; unsolicited from both | Rogue X (Substation) → M new connection | **X spoofs M's IP → R2** | "Unsolicited responses need an inbound rule." Stateful replies return on their own. The limit packet shows that an IP-based firewall trusts the address it sees. |
| **3.1 Select before operate** | M → R1 FC READ, SELECT, OPERATE | M → R1 DIRECT_OPERATE (ticket requires SBO); **compromised M → R1 COLD_RESTART**; **non-DNP3 tunnel on tcp/20000** H → R1 | — | "Port 20000 allowed = safe." The legitimate master's own address carries dangerous actions, and the port alone doesn't prove the traffic is DNP3. FC filtering limits what a compromised master can do. |
| **3.2 Two conduits** | M → R1, R2 READ; **M → R2 DIRECT_OPERATE** (capacitor bank); E → R2 READ (event logs, crosses #1 and #2) | V → R2 dnp3 (blocked at #1); E → R2 COLD_RESTART; M → R1 DIRECT_OPERATE | — | (a) Configuring only the conduit nearest the destination (`wrong-conduit`). (b) The same FC can be required for one asset and an attack for another. The ticket defines least privilege. *(Rule-order shadowing moved to 3.1 during clarify; the spec is authoritative.)* |

### Concept coverage check

| Concept | Introduced | Reinforced |
| --- | --- | --- |
| Conduit as the only cross-zone path | 1.1 | 3.2 |
| Least privilege (named src/dst/service) | 1.1 | 1.2, 2.2 |
| Zones don't see intra-zone traffic | 1.2 (limit) | — |
| Master-initiated TCP / stateful return | 2.1 | 2.2 |
| IP firewall can't detect spoofing | 2.2 (limit) | — |
| Protocol check vs port-only (SL-T 3) | 3.1 | 3.2 |
| Function-code least privilege, SBO vs 0x05 | 3.1 | 3.2 |
| Higher-SL-T conduit rule, multi-conduit paths | 3.2 | — |
| First-match shadowing | 3.2 | (feedback in any round) |

Open for `/speckit.clarify`:
- Does 3.2 carry too many lessons? If it runs long, move the rule-order shadowing lesson to 3.1.
- Should the briefing for 2.2 introduce DNP3 Secure Authentication by name, or keep it to one sentence?

## Tower-defense presentation, kept inside the constitution

- **Wave** = the authored traffic sample, animated after the player presses **Run Wave** (that counts as submitting).
- **Towers** = rule cards on the conduit. A dropped packet is shown stopping at the conduit cell, with a text log line such as `#3 DENY X(B7) → R1(F6) dnp3 FC=05 · matched rule 2`.
- **No lives, health or timer.** A failed wave shows the consequence (a breaker icon trips, the feeder goes dark) as feedback, and the round stays open for a retry.
- **One memorable moment:** in L3, a packet with a *permitted port* turns red at the conduit when the DPI catches `DIRECT_OPERATE`.
- **Limit packets** are drawn in a neutral color with a dashed trail. They end with an "out of reach" note explaining which control *would* stop them.
- **Stretch: Storm Night capstone.** Round 7 on the three-zone board, with a mixed wave that combines every lesson. It is not in the v1 scope.

## References (fill in sections when verifying)

| Reference | Supports |
| --- | --- |
| ISA/IEC 62443-3-2:2020, *Security risk assessment for system design* | Zone, conduit and SL-T definitions |
| ISA/IEC 62443-3-3:2013, *System security requirements and security levels*, FR 5 (SR 5.1, SR 5.2) | Segmentation, zone boundary protection, deny by default |
| IEEE Std 1815-2012, Secure Authentication (clause 7) | Why spoofed-source packets need authentication rather than a firewall rule (2.2 limit packet) |
| ISA overview: https://www.isa.org/standards-and-publications/isa-standards/isa-iec-62443-series-of-standards | Public summary of the series |
| IEEE Std 1815-2012, *DNP3*, application layer function codes (Table 4-1 or equivalent) | FC values and names |
| IANA service registry, `dnp` 20000/tcp | Port 20000 |
| DNP Users Group, https://www.dnp.org | Protocol overview, master/outstation roles |
