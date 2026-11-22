# Grid Defender · Learner playtest script

Closes task **T058** and checks **SC-002** (six rounds in 25 minutes or less) and **SC-003** (the learner can state their mistake from the feedback alone in at least 5 of 6 rounds).

**Time needed:** about 40 minutes: 5 minutes of setup, up to 30 minutes of play, 5 minutes of debrief.
**People:** one learner and one facilitator (you). Run it with one learner at a time.

---

## 1 · Who to recruit

The learner should:

- ✅ know IP addresses, TCP ports and firewall rules or ACLs, including that rule order matters
- ✅ have little or no OT, SCADA or DNP3 experience
- ❌ not have seen this game, its spec or its design notes
- ❌ not be you, or anyone who helped build it

Write down only their role and their years in networking. No names.

## 2 · Before they arrive

- [ ] In the project folder, run `python3 -m http.server 8000 --bind 127.0.0.1` and open **http://127.0.0.1:8000** in a normal browser window.
- [ ] Confirm the Level 1 briefing is showing. If you've played already, reload the page so the session is fresh.
- [ ] Have a timer and this sheet ready, and keep the answer key (section 7) where the learner can't see it.
- [ ] Optional: screen-record with the learner's consent.

## 3 · What to say (read it aloud, word for word)

> "This is a short browser game about firewalling a power-utility network. I'm testing the game, not you. There's no score and no time limit, and wrong answers are expected.
>
> Please think out loud as you play: say what you're looking at and why you're choosing things. I won't give you hints. If you're stuck, the game has its own Help button, and using it is completely fine.
>
> After some wrong attempts I'll ask you one quick question. Ready? Start whenever you like."

**Then stay quiet.** Don't explain zones, DNP3, function codes or the interface. If they ask you something, reply: *"What do you think? The game should tell you; if it doesn't, that's useful for me to know."* Note every question they ask, because each one shows a gap in the game.

## 4 · During play

- **Start the timer** when they press **Start** on the Level 1 briefing. **Stop it** when the **Session summary** appears.
- **After each failed Run Wave**, once they've read the result panel, ask exactly:
  > "In your own words, what was wrong?"

  Write their answer word for word on the sheet. Don't correct them or react.
- If a round's first Run Wave is correct, there's nothing to ask; mark the round "solved first try".
- Note anywhere they hesitate for more than about 30 seconds, and what they were looking at.

**Stop early** if they've played for 35 minutes, or if they're clearly frustrated and want to stop. Record which round they reached; that is still a result.

## 5 · Debrief (5 minutes, after the summary)

Ask these, and write down the answers:

1. "In one sentence each: what's a zone, and what's a conduit?"
2. "Why didn't you need a rule for the RTU to reach the master?" (Level 2)
3. "Why wasn't allowing port 20000 enough in Level 3?"
4. "Which packet did your firewall *not* stop, even when you were correct, and why?" (Rounds 1.2 / 2.2)
5. "What was the most confusing moment?"
6. "Anything in the feedback that was wrong, unclear or that you disagreed with?"

## 6 · Scoring sheet

**Learner:** role ______________ · years in networking ____ · OT experience: none / a little · **Date:** ________

| Round | Attempts (from summary) | Help used (from summary) | Their words after each wrong wave | Mistake stated correctly? (Y/N/—) |
| --- | --- | --- | --- | --- |
| 1.1 First poll | | | | |
| 1.2 Second feeder | | | | |
| 2.1 Who calls whom | | | | |
| 2.2 Unsolicited & spoofing | | | | |
| 3.1 Select before operate | | | | |
| 3.2 Two conduits | | | | |

**Total play time** (Start → summary): ______ min

**Scoring rules:**

- **Mistake stated correctly**: mark **Y** for a round if, after at least one wrong wave in it, the learner's words match the round's mistake in the answer key (section 7). The idea matters, not the exact terms; "the HMI could get in" counts for 1.1. Mark **N** if they described a different or wrong cause. Mark **—** if the round was solved on the first try, since there was nothing to explain.
- **SC-003** = rounds marked Y ÷ rounds marked Y or N. **Pass** if that's at least 5/6, or, when fewer than 6 rounds had a wrong wave, if every Y-or-N round is a Y except at most one.
- **SC-002**: **pass** if total play time is 25 minutes or less.
- Rounds solved only after the reference rules were shown (Help used = "Solution viewed") still count for timing, but list them separately; they aren't evidence of independent mastery.

| Result | Value | Pass? |
| --- | --- | --- |
| SC-002 play time | ___ min | ≤ 25 → ☐ |
| SC-003 mistakes stated | ___ Y of ___ | ☐ |
| Rounds needing "Solution viewed" | ___ | (record only) |

**Questions the learner asked** (each is a gap in the game):

**Hesitations over 30 s** (round, what they were looking at):

**Debrief answers (1–6):**

## 7 · Answer key (facilitator only, don't show the learner)

| Round | The mistake the round is built to catch | Typical wrong rules | Reference rules |
| --- | --- | --- | --- |
| 1.1 | A zone-wide or "any" permit is too broad: it lets the HMI and telnet through | `permit Control Center → Substation any` | `permit M → R1 tcp/20000` |
| 1.2 | Same idea with two RTUs: name each flow. (Packet #4, R1 → R2, is out of reach and not a mistake.) | Zone-to-zone permit, or `M → Substation any` | `M → R1 tcp/20000`; `M → R2 tcp/20000` |
| 2.1 | Permitting the RTU → master direction. Only the master opens sessions; unsolicited alarms come back inside them | Extra `permit R1 → M tcp/20000` | `permit M → R1 tcp/20000` |
| 2.2 | An inbound rule "for unsolicited" admits the rogue device X. (Packet #5, the forged master address, is out of reach.) | Extra `permit Substation → M …` | `M → R1 tcp/20000`; `M → R2 tcp/20000` |
| 3.1 | Port 20000 or "any FC" lets dangerous function codes through; or a deny placed below a broad permit never runs | `permit M → R1 tcp/20000`; or a broad DNP3 permit above `deny … {DIRECT_OPERATE, COLD_RESTART}` | Conduit 2: `permit M → R1 DNP3 {READ, SELECT, OPERATE}` |
| 3.2 | The Engineering → R2 flow must be permitted on **both** conduits; and DIRECT_OPERATE is allowed for R2 only | Rules on conduit 2 only; or `M → Substation DNP3 {READ, DIRECT_OPERATE}` | Conduit 1: `permit E → R2 tcp/20000`. Conduit 2: `M → R1 DNP3 {READ}`; `M → R2 DNP3 {READ, DIRECT_OPERATE}`; `E → R2 DNP3 {READ}` |

## 8 · After the session

Send the completed sheet back (a photo or the text is fine). It will be used to:

- record SC-002 and SC-003 as pass or fail in the README's verification table and the tasks log, and close T058
- turn every "N", every question asked, and every long hesitation into a specific fix in the briefings or feedback text
