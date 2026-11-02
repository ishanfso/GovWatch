# Filing agent — supervised test driver

**Status:** prototype for a one-off, supervised test (2026-11-02). Not used by the website. See [[FILING_AGENT]].

`driver.js` keeps one headless browser session open and takes one command at a time on `127.0.0.1:7788`, so Claude can step through a government portal with the owner watching:

- Claude sends screenshots of each step.
- The owner types the OTP (and any CAPTCHA answer) in the chat. CAPTCHAs are never bypassed.
- Nothing is submitted until the owner replies "submit".

It never logs typed values (phone numbers, OTPs).

```
node scripts/filing_agent/driver.js
curl -s -X POST 127.0.0.1:7788/cmd -d '{"op":"goto","url":"https://ipgrs.karnataka.gov.in/"}'
# ops: goto, fields, fill, select, click, shot, text, close
```

## Requirements
- The cloud environment must allow `ipgrs.karnataka.gov.in` and `karnataka.gov.in` (Network access → Allowed domains). The change applies when the session's container restarts.
- Indian government sites may refuse non-Indian servers. If they do, run the driver on the owner's own computer instead (Claude desktop app → Remote Control).
