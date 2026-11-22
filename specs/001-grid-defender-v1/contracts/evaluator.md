# Contract: Firewall evaluator

These are pure functions in `engine/`. They take no DOM, timers, randomness or network, and they never change progress state.
The same inputs always give the same output.

## `validateContent(doc) → { ok: true } | { ok: false, errors: ContentError[] }`

`ContentError = { levelId, roundId | null, code, detail }`. The codes are:

`schema`, `duplicate-id`, `zone-overlap`, `asset-off-board`, `asset-outside-zone`,
`conduit-in-zone`, `conduit-joins`, `zone-graph`, `unknown-asset`, `same-zone-required`,
`slt-ticket` (a required flow crosses an effective SL-T ≥ 3 conduit without an FC),
`limit-stoppable`, `bad-parent`, `unknown-source`, `hint-count`.

The whole document is validated before play starts. A round that has errors is never graded, and in v1 any error blocks the whole game: the content-error view lists every affected level and round ID.

## `evaluateRound(round, board, rulesByConduit) → RoundResult`

```text
RoundResult {
  status: "correct" | "incorrect" | "invalid-input" | "content-error"
  inputErrors: [{ conduitId, ruleIndex, field }]          // only when invalid-input
  failures: [{                                            // ordered per research R7
    code: "required-blocked" | "wrong-conduit" | "attack-allowed" | "over-permissive",
    flow: Flow,                                            // first offending flow: canonical order; for attack-allowed, wave order (a packet the player saw)
    conduitId: string | null,                              // the conduit that denied or wrongly permitted it
    ruleIndex: number | null,                              // the matching rule (1-based) or null = implicit deny
    count: number                                          // how many universe flows share this code
  }]
  shadowed: [{ conduitId, ruleIndex, byRuleIndex | null, kind: "shadowed" | "never-matches" }]
  packets: [{                                              // one per wave packet, in authored order
    packetId, verdict: "allowed" | "denied" | "in-session" | "no-session" | "out-of-reach",
    conduitId | null, ruleIndex | null, path: conduitId[],
    hops: [{ conduitId, action: "permit" | "deny", ruleIndex | null }]   // every conduit the packet reached, for the log
  }]
}
```

### Algorithm

1. If any rule card is incomplete (data-model RuleCard), return `invalid-input` with its
   `inputErrors`. No other field is computed.
2. Build the **universe** and each flow's **path**.
3. At each conduit, `decide(c, flow)` takes the first matching rule top-down: permit leads to allowed,
   deny leads to denied, and no match leads to denied (implicit deny).
4. Classify each flow at each conduit on its path as `required`, `dont-care` or `forbidden` (FR-013).
5. Failures:
   - **required-blocked**: a required flow denied at every conduit on its path.
   - **wrong-conduit**: a required flow permitted at some conduits and denied at others.
   - **attack-allowed**: a graded wave packet (`kind: new`) whose flow is forbidden at some conduit
     and is permitted end to end.
   - **over-permissive**: a flow forbidden at conduit *c* that *c* permits, whether or not it
     appears in the wave.
6. Return `correct` only when there are no failures. Shadowed rules never change the status.
7. Packets: a `new` packet walks its path and stops at the first conduit that denies it. An
   `in-session` packet gets `in-session` if its parent was `allowed`, and `no-session` otherwise.
   A `limit` packet always gets `out-of-reach`. A spoofed packet is still walked so the log can show
   which rule allowed it.

## `explain(result, round, board) → FeedbackItem[]`

This assembles the text from `round.feedback[code]` together with the values in the result. It may
not add a reason the evaluator did not report (Principle VI).

## Hand-checked cases (from spec.md, expected results written independently)

| Case | Round | Expect `status` | Expect failure codes (in order) | Other expectations |
| --- | --- | --- | --- | --- |
| C1 | 1.1 | correct | — | packets: M→R1 allowed; H→R1 denied (implicit); telnet denied |
| C2 | 1.1 | incorrect | attack-allowed, over-permissive | attack-allowed example H→R1 |
| C3 | 1.1 | incorrect | required-blocked | example M→R1 dnp3 READ, rule 1 |
| C4 | 1.1 | correct | — | — |
| C5 | 2.1 | incorrect | attack-allowed, over-permissive | example R1→M, rule 2 |
| C6 | 2.2 | incorrect | attack-allowed, over-permissive | X→M allowed by rule 3; the spoofed packet is out-of-reach |
| C7 | 3.1 | incorrect | attack-allowed, over-permissive | DIRECT_OPERATE allowed by rule 1 at conduit 2 |
| C8 | 3.1 | correct | — | H tunnel denied at conduit 2 (implicit) |
| C9 | 3.2 | incorrect | wrong-conduit | E→R2 READ denied at conduit 1 |
| C10 | 3.1 | incorrect | attack-allowed, over-permissive | rule 2 at conduit 2 shadowed by rule 1 |
| C11 | 3.2 | correct | — | port-only rule at conduit 1 is accepted |
| C12 | any | content-error | — | `unknown-asset` for "R3" |
| C13 | any | invalid-input | — | a card with service `dnp3` and an empty FC set → field `fcs`; attempts unchanged |
| C14 | 1.2 | correct (with C1-style rules for R1 and R2) | — | R1→R2 packet out-of-reach, path [] |
