# Grid Defender · Keyboard and VoiceOver check

Closes the two **partial** results in the README:

- **US5-1:** every core action works from the keyboard.
- **US5-2:** results are announced to a screen reader.

The automated run already confirmed the Tab order, Enter on buttons, and the visible focus ring. What it could **not** do is pick an option inside a native dropdown, or hear a real screen reader.

**Time needed:** about 15 minutes on a Mac. No extra software.

---

## 0 · Setup (2 minutes)

- [ ] Turn on full keyboard navigation: **System Settings → Keyboard → Keyboard navigation → On**. Without it, macOS Tab skips buttons and dropdowns.
- [ ] In the project folder, run `python3 -m http.server 8000 --bind 127.0.0.1` and open **http://127.0.0.1:8000** in **Chrome** or **Safari**. In Safari, also tick **Settings → Advanced → Press Tab to highlight each item on a webpage**.
- [ ] Reload the page so you start on the Level 1 briefing.
- [ ] Put the mouse or trackpad out of reach for parts A and B.

**Keys on macOS**

| To… | Press |
| --- | --- |
| Move to the next or previous control | Tab / Shift+Tab |
| Press a button | Return or Space |
| Open a dropdown | Space, or ↓ |
| Move within an open dropdown / choose | ↑ ↓, then Return |
| Tick a checkbox | Space |
| Choose a radio option (Level 3 conduit picker) | ← → or ↑ ↓ |
| Close the Restart dialog | Esc |

---

## A · Keyboard only (no VoiceOver), round 1.1 (about 5 minutes)

| # | Do this | Expect | Pass / Fail / Notes |
| --- | --- | --- | --- |
| A1 | Tab from the top of the briefing | Focus reaches the source link, then **Start**; a clear orange focus ring is visible each time | |
| A2 | Return on **Start** | Round 1.1 opens; focus is on the "Round 1.1 · First poll" heading | |
| A3 | Tab to **Add rule to conduit A**, press Return | A rule card appears; focus is on its **Action** dropdown | |
| A4 | **Action:** open the dropdown, choose **Permit** | The dropdown shows Permit. *This is the step the automation couldn't do* | |
| A5 | Tab → **Source**: choose **Asset M · SCADA master** | Shown | |
| A6 | Tab → **Destination**: choose **Asset R1 · Feeder RTU 1** | Shown | |
| A7 | Tab → **Service**: choose **tcp/20000 (port only)** | Shown; the function-code checkboxes stay greyed out | |
| A8 | Change **Service** to **DNP3 (protocol-checked)**, Tab into the function codes, press Space on **READ 0x01** | The checkboxes become available; READ is ticked; focus didn't jump away when the service changed | |
| A9 | Tab to **Run Wave**, press Return | "✓ Correct"; the wave log fills in | |
| A10 | Tab onward | Focus reaches **Next** (not skipped), then the wave log | |
| A11 | Return on **Next** | Round 1.2 opens; focus is on its heading | |
| A12 | Add a card, leave it empty, Tab to **Run Wave**, Return | Focus jumps to the card's empty **Action**; red guidance appears beside the card; Attempts stays 0 | |
| A13 | Tab to **Help** and press Return three times | Each press shows one more hint and focus moves to the new hint; after the third the button says "All help shown" | |
| A14 | Tab to **Move up / Move down / Delete** on a card | Each works with Return; disabled ones are skipped | |
| A15 | Shift+Tab back to **Restart** in the header, Return, then **Esc** | The dialog opens with focus on Cancel; Esc closes it, nothing is lost, and focus returns to Restart | |
| A16 | *(Optional, Level 3)* In any Level 3 round, use the arrow keys on the **Conduit to edit** radio buttons | Switching shows the other conduit's rules | |

---

## B · VoiceOver (about 8 minutes)

Turn VoiceOver on with **Cmd+F5** (or Touch ID ×3). Reload the page. Use **Tab** to move, and listen.

| # | Do this | Expect to hear | Pass / Fail / What you heard |
| --- | --- | --- | --- |
| B1 | Tab to **Start** | "Start, button" | |
| B2 | Return on Start | The heading "Round 1.1 · First poll" is read | |
| B3 | Add a rule; Tab through the four dropdowns | **"Action, pop-up button"** (then the value), **"Source…"**, **"Destination…"**, **"Service…"**. The label must be the field name, not "Choose…" | |
| B4 | Tab into the function codes | "READ 0x01, checkbox" (and so on); dimmed when the service isn't DNP3 | |
| B5 | Tab to the Move and Delete buttons | "Move rule 1 up, button", "Delete rule 1, button" | |
| B6 | Leave a field empty and press **Run Wave** | It announces, e.g., **"Rule 1 on conduit A needs a destination."** | |
| B7 | Fill the card correctly and press **Run Wave** | It announces **"Round 1.1: correct."** without you moving focus | |
| B8 | Make it wrong (e.g. Source = Zone · Control Center, Service = Any service), press **Run Wave** | It announces "Round 1.1: not yet — 2 problems: attack allowed, over-permissive." | |
| B9 | Press **Help** | It announces "Hint 1 of 3 shown." and reads the hint | |
| B10 | Navigate to **Board details** (VO+Cmd+H moves between headings) and into the Assets table (VO+arrow keys) | Rows and columns are read, e.g. "M, SCADA master, … C2, Control Center" | |
| B11 | Navigate to the **Wave log** | Each line is read, e.g. "✕ #3 DENY H(F2) → R1(B6) DNP3 READ… implicit deny". Note if the symbols are read oddly | |
| B12 | Open **Restart** | The dialog title "Restart the session?" is read, and focus is on Cancel | |

Turn VoiceOver off with **Cmd+F5**.

---

## C · Results

**Date:** ________ · **macOS:** ________ · **Browser + version:** ________

| Item | Result | Notes |
| --- | --- | --- |
| US5-1 keyboard: A1–A16 | ☐ Pass ☐ Fail | |
| US5-2 screen reader: B1–B12 | ☐ Pass ☐ Fail | |

For every **Fail**, write down the step number, what you pressed, and what happened or what you heard. Send the results back. Each failure will be fixed, then the README verification table updated from **Partial** to **Pass**. A pass is recorded as "VoiceOver on macOS, browser X". It is not an accessibility certification.
