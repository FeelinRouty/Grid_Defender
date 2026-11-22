# Data Model: Grid Defender v1

Phase 1 output. Covers the entities from the spec's Key Entities, their fields, validation rules and
state. The file format is in [contracts/content-schema.md](contracts/content-schema.md).

## Authored content (`data/levels.json`)

### Content document
| Field | Type | Rules |
| --- | --- | --- |
| `schemaVersion` | integer | must be `1` |
| `sources` | Source[] | unique `id` |
| `boards` | Board[] | unique `id` |
| `levels` | Level[] | ≥ 1, ordered. v1 ships exactly 3; that is checked by a content test, not by the validator, so a trial round can be added (T057) |

### Source
`id`, `title`, `section`, `url`, `claim`, `verified` (boolean: the team read this source and it supports `claim`), `checked` (ISO date it was read). Every shipped source must be `verified: true` with a `checked` date; a content test enforces this.

### Board
| Field | Type | Rules |
| --- | --- | --- |
| `id` | string | unique |
| `zones` | Zone[] | cells must not overlap; ≥ 2 zones |
| `assets` | Asset[] | unique `id`; each asset sits on a cell inside exactly one zone |
| `conduits` | Conduit[] | each conduit's cell is outside every zone; it joins exactly two distinct zones |

The board's zone graph (zones are nodes, conduits are edges) must be **connected** and **acyclic**,
so every pair of zones has exactly one path. v1 boards are chains (C–S, and K–C–S).

### Zone
`id`, `name`, `slt` (integer 1–3), `color` (a design token name), `cells` (coordinates such as `"A1"`).
A level may override a zone's `slt` (Level 3 raises the Substation to 3).

### Asset
`id` (for example `M`, `R1`), `glyph`, `name`, `role` ∈ {master, hmi, outstation, engineering,
vendor, rogue}, `cell`. The asset's zone is derived from its cell.

### Conduit
`id` (for example `A`, `1`, `2`), `cell`, `joins` [zoneId, zoneId]. **Effective SL-T** is derived
as the higher `slt` of the two zones it joins (FR-015).

### Level
`id` (`L1` to `L3`), `title`, `concept`, `boardId`, `sltOverrides` (zoneId → slt, optional),
`briefing` (Briefing), `sourceIds`, `rounds` (≥ 1, ordered; v1 ships 2 per level).

### Briefing
`paragraphs` (string[]), `workedExample` (string, different from every round), `simplifications`
(string[]: the game rules this level depends on), `sourceIds`.

### Round
| Field | Type | Rules |
| --- | --- | --- |
| `id` | string (`1.1` to `3.2`) | unique |
| `title`, `ticketText` | string | the plain-language work order |
| `availableAssets` | assetId[] | the board assets present this round (for example, X only in 2.2) |
| `required` | Flow[] | ≥ 1; every endpoint is in `availableAssets` and in different zones; must satisfy the zone SL-T rule (an FC set is given whenever any conduit on the path has effective SL-T ≥ 3) |
| `wave` | WavePacket[] | ≥ 1; ordered |
| `hints` | [method, workedStep, solutionText] | exactly 3 strings; `solutionText` is read-only reference rules (FR-021) |
| `feedback` | reasonCode → string | wording per outcome; may contain `{flow}`, `{conduit}` and `{rule}` slots |
| `sourceIds` | sourceId[] | ≥ 1 |

### Flow
`src` assetId, `dst` assetId, `variant` ∈ {`dnp3`, `non-dnp3-20000`, `other-tcp`}, `fc` (FC name,
required when variant is `dnp3`, absent otherwise). A ticket entry may list `fcs: [...]`, which
expands to one Flow per FC.

Derived: **portClass** is `20000` for `dnp3` and `non-dnp3-20000`, and `other` otherwise. **path**
is the ordered list of conduits between the source zone and the destination zone (empty within a
single zone).

### WavePacket
| Field | Type | Rules |
| --- | --- | --- |
| `id` | string | unique within the round |
| `kind` | `new` \| `in-session` \| `limit` | |
| `flow` | Flow | for `in-session`, the variant is DNP3 with `fc` RESPONSE or UNSOLICITED_RESPONSE |
| `parent` | packetId | required for `in-session`; must point to an earlier `new` packet in the opposite direction |
| `limit` | `spoofed-source` \| `intra-zone` | required for `limit` packets |
| `actualSrc` | assetId | `spoofed-source` only: the real sender, whose zone must be the spoofed source's zone (the packet must cross the same conduits) |
| `label` | string | short story text ("compromised master") |
| `explanation` | string (optional) | limit packets: why no conduit rule can stop it, and which control would; shown as a neutral "out of reach" note |
| `sourceIds` | sourceId[] (optional) | sources cited with the explanation; must exist |

Limit validation: an `intra-zone` packet's src and dst share a zone. A `spoofed-source` packet's
`flow` equals a required flow. Anything else is a content error (Principle VI).

## Player input (in memory)

### RuleCard
| Field | Values | Complete when |
| --- | --- | --- |
| `action` | `permit` \| `deny` | set |
| `src` / `dst` | `any` \| `zone:<id>` \| `asset:<id>` | set |
| `service` | `port-20000` \| `dnp3` \| `other-tcp` \| `any` | set |
| `fcs` | `"any"` \| FC name[] | non-empty when service is `dnp3`; ignored otherwise |

`rulesByConduit`: conduitId → RuleCard[] (at most 8). Every list is empty when a round opens
(FR-008a), and the lists persist across retries within the round.

Matching (FR-009, FR-011):
- `src`/`dst` match by asset, by the asset's zone, or `any`.
- `port-20000` matches the `dnp3` and `non-dnp3-20000` variants.
- `dnp3` matches only the `dnp3` variant, with `fc` in `fcs` (or any FC).
- `other-tcp` matches only `other-tcp`.
- `any` matches every variant.

## Derived evaluation data

- **Universe**: every Flow with src ≠ dst, both in `availableAssets` and in different zones, in
  every variant. It is enumerated in canonical order (research R7).
- **Classification** at conduit *c* for each flow crossing *c*: `required`, `dont-care` or
  `forbidden` (FR-013, research R4).
- **RoundResult**: see [contracts/evaluator.md](contracts/evaluator.md).

## Session state (in memory, page lifetime)

```text
SessionState {
  view: loading | content-error | briefing | round | summary
  levelIndex, roundIndex
  rulesByConduit                         // current round only
  lastResult: RoundResult | null
  rounds: { [roundId]: { completed: bool, attempts: int, helpTier: 0..3 } }
  confirmRestart: bool
}
```

### Transitions

```text
loading ──valid content──▶ briefing(L1)
loading ──invalid──▶ content-error (shows level/round id; Retry reloads)

briefing(Ln) ──Start──▶ round(first round of Ln), rules empty

round ──Run Wave, invalid input──▶ round + guidance          (attempts unchanged)
round ──Run Wave, unsolved, incorrect──▶ round + result       (attempts +1)
round ──Run Wave, unsolved, correct──▶ round + result, completed=true, Next enabled (attempts +1)
round ──Run Wave, already completed──▶ wave replays, result shown (no counter changes)
round ──Help──▶ helpTier = max(helpTier, tier)               (never completes)
round ──Next (completed only)──▶ next round | briefing(Ln+1) | summary

any ──Restart──▶ confirmRestart=true ──Confirm──▶ fresh SessionState, briefing(L1)
                                      ──Cancel──▶ unchanged
```

Rules: `attempts` counts only valid Run Wave presses while a round is unsolved. `completed` is set
once and never cleared except by Restart. Rounds open strictly in order (FR-024).
