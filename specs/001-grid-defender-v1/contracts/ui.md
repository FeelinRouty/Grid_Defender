# Contract: Player interface

These are the observable controls and announcements that the acceptance criteria depend on. The
layout follows research R8 and R9.

## Views

| View | Contents | Focus on entry |
| --- | --- | --- |
| Loading | A status message | — |
| Content error | The level/round ID, the error list, and **Retry** | heading |
| Briefing | Level title, paragraphs, worked example, simplifications, source links, **Start** | heading |
| Round | Ticket, board (visual), **Board details** table, conduit selector (Level 3), rule list, **Add rule**, **Run Wave**, **Help**, result panel, wave log, **Next** (disabled until completed), **Restart** | ticket heading |
| Summary | Per-round table: completed, attempts, help tier ("method", "worked step", "solution viewed"); **Restart** | heading |

## Rule card controls (each card, in order)

1. Action `<select>`: permit / deny
2. Source `<select>`: Any, then zones, then assets (labelled "Asset R1 · Feeder RTU 1 (Substation)")
3. Destination `<select>`: the same options
4. Service `<select>`: tcp/20000 (port only), DNP3 (protocol-checked), other TCP, any
5. Function codes `<fieldset>` of checkboxes, including "Any FC". Enabled only when the service is DNP3.
6. **Move up**, **Move down**, **Delete** buttons, each with an accessible name that includes the rule number

When a card is incomplete, Run Wave puts focus on its first empty field and shows guidance next to it.

## Announcements (polite live region)

- After Run Wave: "Round 1.1: correct." or "Round 1.1: not yet — 2 problems: attack allowed, over-permissive."
- Invalid input: "Rule 2 needs a destination."
- Help: "Hint 1 of 3 shown."

## Wave log line format

`#3 DENY  H(F2) → R1(B6)  DNP3 READ  at conduit A · implicit deny`
`#5 OUT OF REACH  R1(B6) → R2(G6)  DNP3 READ  · stays inside Substation`

## Keyboard

All controls are native, so Tab and Shift+Tab move between them and Enter or Space activates them.
There are no hover-only controls and no custom key bindings in v1.

## Motion

With `prefers-reduced-motion: reduce`, results and the log appear immediately and packet dots don't
move. Without it, the animation runs for at most about 3 s. The result panel and log are filled in
*before* the animation starts, so nothing waits on it.
