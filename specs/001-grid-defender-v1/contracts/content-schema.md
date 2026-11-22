# Contract: Content file (`data/levels.json`)

The fields and validation rules are defined in [../data-model.md](../data-model.md). This file shows
the concrete shape using round 1.1. All six rounds follow the spec's *Round Content* table.

```json
{
  "schemaVersion": 1,
  "sources": [
    { "id": "iana-dnp", "title": "IANA Service Name and Port Registry", "section": "dnp 20000/tcp",
      "url": "https://www.iana.org/assignments/service-names-port-numbers", "claim": "DNP3 uses TCP port 20000", "verified": false },
    { "id": "iec62443-3-3-fr5", "title": "ISA/IEC 62443-3-3", "section": "FR 5, SR 5.1–5.2",
      "claim": "Zone boundary protection; deny by default, allow by exception", "verified": false }
  ],
  "boards": [
    {
      "id": "two-zone",
      "zones": [
        { "id": "control", "name": "Control Center", "slt": 2, "color": "zone-a",
          "cells": ["A1","B1","C1","D1","E1","F1","G1","H1","A2","B2","C2","D2","E2","F2","G2","H2","A3","B3","C3","D3","E3","F3","G3","H3"] },
        { "id": "substation", "name": "Substation", "slt": 2, "color": "zone-b",
          "cells": ["A5","…","H8"] }
      ],
      "assets": [
        { "id": "M",  "glyph": "M",  "name": "SCADA master", "role": "master",     "cell": "C2" },
        { "id": "H",  "glyph": "H",  "name": "HMI",          "role": "hmi",        "cell": "F2" },
        { "id": "R1", "glyph": "R1", "name": "Feeder RTU 1", "role": "outstation", "cell": "B6" },
        { "id": "R2", "glyph": "R2", "name": "Feeder RTU 2", "role": "outstation", "cell": "G6" },
        { "id": "X",  "glyph": "X",  "name": "Rogue device", "role": "rogue",      "cell": "E7" }
      ],
      "conduits": [ { "id": "A", "cell": "D4", "joins": ["control", "substation"] } ]
    }
  ],
  "levels": [
    {
      "id": "L1", "title": "Zones & conduits", "boardId": "two-zone",
      "briefing": { "paragraphs": ["…"], "workedExample": "…", "simplifications": ["SL-T 2 = deny by default, named flows (game rule)"], "sourceIds": ["iec62443-3-3-fr5"] },
      "sourceIds": ["iec62443-3-3-fr5", "iana-dnp"],
      "rounds": [
        {
          "id": "1.1", "title": "First poll",
          "ticketText": "Commission polling: the SCADA master must read Feeder RTU 1.",
          "availableAssets": ["M", "H", "R1", "R2"],
          "required": [ { "src": "M", "dst": "R1", "variant": "dnp3", "fcs": ["READ"] } ],
          "wave": [
            { "id": "p1", "kind": "new", "flow": { "src": "M", "dst": "R1", "variant": "dnp3", "fc": "READ" }, "label": "Scheduled poll" },
            { "id": "p2", "kind": "in-session", "parent": "p1", "flow": { "src": "R1", "dst": "M", "variant": "dnp3", "fc": "RESPONSE" }, "label": "Poll response" },
            { "id": "p3", "kind": "new", "flow": { "src": "H", "dst": "R1", "variant": "dnp3", "fc": "READ" }, "label": "HMI polling directly" },
            { "id": "p4", "kind": "new", "flow": { "src": "M", "dst": "R1", "variant": "other-tcp" }, "label": "Telnet to RTU" }
          ],
          "hints": ["Method: …", "Worked step: …", "Reference rules: 1 permit M → R1 tcp/20000"],
          "feedback": { "correct": "…", "attack-allowed": "{flow} got through {conduit} via rule {rule}. …" },
          "sourceIds": ["iana-dnp"]
        }
      ]
    }
  ]
}
```

`"…"` marks content that is written during implementation. The cell list is abbreviated in this
example and written out in full in the real file.
