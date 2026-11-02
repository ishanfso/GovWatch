# Filing agent: "We file it for you"

Status: **Phase 1, planning** (2026-11-02). Nothing is built or live yet beyond a "coming soon" note on [[USER_FLOWS|Report a problem]].

---

## The idea

Today, Report a problem writes the complaint and hands the resident over to the official channel. The filing agent would go one step further: with the resident's permission, it submits the complaint on the official government portal for them and comes back with the official complaint ID.

The resident stays in control. The agent signs in with **their** phone number, they type the OTP the portal sends them, they check the filled form, and only then does it submit.

---

## How it would work

```
Resident (our Report a problem page)          Our server                       Official portal (iPGRS first)
──────────────────────────────────────        ────────────────────             ──────────────────────────────
1. Fills type, place, description
2. Reads what will happen, ticks consent  ─►  3. Opens the portal in a
                                                 headless browser          ─►  "Login as citizen", enters phone
                                                                               Portal texts OTP to the resident
4. Types the OTP into our page            ─►  5. Enters OTP                ─►  Signed in
   (and solves a CAPTCHA if one appears:          Fills the grievance form;
    the agent never bypasses CAPTCHAs)           Claude picks department
                                                 and category from the
                                                 portal's own lists
6. Sees a screenshot of the filled form   ◄─  Pauses before submitting
7. Approves, or edits and approves        ─►  8. Submits                   ─►  Returns a Grievance ID
9. Sees the Grievance ID and how to track ◄─  10. Deletes the session and
   it on the official site                        everything it collected
```

**Where Claude helps (the "LLM in the loop"):** matching the resident's plain description to the portal's department and category dropdowns, tidying the complaint text, and coping with small layout changes on the portal. The clicking itself is done by a fixed Playwright script, which is more predictable than letting a model click freely.

**Where a person is always in the loop:** consent, the OTP, any CAPTCHA, and the final "submit" approval.

---

## Rules it must follow

1. **Never claim it filed something without an official ID.** If anything fails, say so plainly and fall back to the manual channels.
2. **Never store OTPs, passwords or session cookies.** Each filing session is wiped as soon as it ends, and after 10 minutes at most.
3. **Keep only what's needed.** Phone number, name and address are used for this one filing, then deleted. We keep only the grievance ID, type, ward and date, so we can show "filed through Civic Issue India" statistics.
4. **Be obvious about what's happening.** Before the resident types their phone number, the page says in plain words: "We'll sign in to Karnataka's iPGRS portal as you. The portal will send an OTP to your phone. Type it here. We file the complaint, show it to you before sending, and then delete your details."
5. **No bypassing.** No CAPTCHA solving and no workarounds for portal limits. If the portal blocks automation, the agent stops and we ask the department for an official route.
6. **Rate limits.** One complaint per phone number per hour, and a daily cap overall, so the tool can't be used to flood a department.
7. **Respect each portal's terms of use.** Go live on a portal only after checking its terms, ideally with written permission (see [[EMAIL_DRAFTS]]).

These follow India's Digital Personal Data Protection Act, 2023: clear consent for a stated purpose, the minimum data needed, and deletion when the purpose is done.

---

## What it needs

| Piece | Choice | Cost |
|---|---|---|
| Server | Small container on Render or Railway, **India region** (government sites often block foreign traffic) | about $7–10 a month |
| Browser automation | Playwright with headless Chromium | free |
| AI | Claude, small model, for category matching and text clean-up | a few cents per complaint |
| Website | Stays on GitHub Pages; the Report a problem page talks to the server | free |

The owner creates the hosting account; Claude writes the code and the setup steps.

---

## Phases

1. **Planning (now):**
   - this document
   - a "coming soon" note on Report a problem
   - permission emails to the Centre for e-Governance (runs iPGRS) and the Greater Bengaluru Authority
2. **First agent: iPGRS.**
   - Build it on the server, where the real portal can be reached and tested.
   - Turn it on only after one real complaint has been filed end to end and returned a Grievance ID.
   - Then make "We file it for you" the headline feature.
3. **More portals:** BESCOM's online complaint form, then Sahaaya once version 3.0 is released.
4. **Official route:** if a department offers a partner interface (the GBA's planned single-window "Sahaaya Plus"), switch to it and retire the browser agent for that department.

## Done means (for phase 2)
- [ ] A real complaint filed on iPGRS through the site, with a Grievance ID that shows up on the iPGRS tracking page
- [ ] Consent, OTP, review and submit steps tested on a phone
- [ ] No personal data left on the server after a session (checked)
- [ ] Clear failure message and fallback to manual channels, tested by unplugging the portal
- [ ] Rate limits tested
