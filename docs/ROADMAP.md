# Roadmap

Features planned for GovWatch, in priority order.
Each item moves to CHANGELOG.md when completed.

---

## Phase 1 — MVP ✅ COMPLETE

- [x] Project structure and documentation setup
- [x] Sample data (20 mock Bangalore civic issues)
- [x] Static dashboard — category cards, filters, chart
- [x] Twitter fetch script (Tweepy, paid tier — free tier does not support search)
- [x] Issue categorization script
- [x] GitHub Pages deployment — `https://ishanfso.github.io/GovWatch/dashboard/`
- [x] First live data fetch completed — real Bangalore civic tweets in `data/issues.json`

---

## Phase 2 — Squeeze the Data ✅ COMPLETE

Goal: Extract maximum value from already-fetched data before spending more on Twitter API calls.

- [x] **Map view** — interactive Bangalore map (Leaflet + OpenStreetMap, free)
- [x] **Issue clustering** — group tweets about the same problem, show count badge
- [x] **Search** — free-text search across all issue cards
- [x] **Export to CSV** — one-click download for offline reports and presentations
- [x] **Status tracking** — officials can mark issues Acknowledged / In Progress / Resolved (saved in browser)
- [x] **Department view** — issues grouped by BBMP / BESCOM / BWSSB / BTP
- [ ] **Top issues digest** — "Top 5 most-engaged issues this week" summary panel *(deferred to Phase 3)*

---

## Phase 3 — Data Refresh Strategy (On Hold Until Needed)

Goal: Bring in fresh data cost-efficiently when the current dataset gets stale.

- [ ] **Manual refresh workflow** — document exactly when and how to re-run fetch (monthly? after rain events?)
- [ ] **Incremental fetch** — only pull tweets newer than the latest one already stored (reduces API calls)
- [ ] **GitHub Actions auto-refresh** — scheduled runs, only when budget allows
- [ ] **Data deduplication** — prevent same tweet appearing twice across fetch runs
- [ ] **Issue aging** — mark issues as "stale" after N days

---

## Phase 4 — Official Dashboard Features

Goal: Features that make it genuinely useful for government officials in meetings and daily work.

- [ ] **Email digest** — daily summary email of top issues (free tier of Resend or SendGrid)
- [ ] **Trend analysis** — "Roads complaints up 40% this week in Whitefield"
- [ ] **Export to PDF** — formatted report for presentations
- [ ] **WhatsApp integration** — send issue alerts via WhatsApp Business API (low cost)
- [ ] **Ward/pin code mapping** — map areas to Bangalore's 198 wards for precise location

---

## Phase 5 — Scale to Other Cities

Goal: Expand beyond Bangalore.

- [ ] **City selector** — configurable keywords and areas for any Indian city
- [ ] **Multi-source data** — add Reddit (r/bangalore), Citizen app, 311-style portals
- [ ] **Department routing** — auto-route Roads issues to BBMP, Power to BESCOM, etc.
- [ ] **Official response tracking** — detect when govt accounts reply to complaints
- [ ] **Public portal** — citizens can verify if their issue was seen

---

## Phase 3 — Official Dashboard Features

Goal: Features that make it genuinely useful for government officials.

- [ ] **Status tracking** — officials can mark issues as "Acknowledged", "In Progress", "Resolved"
- [ ] **Email digest** — daily summary email of top issues (use free tier of Resend or SendGrid)
- [ ] **Issue clustering** — group similar complaints from the same area (same pothole, multiple tweets)
- [ ] **Trend analysis** — "Roads complaints up 40% this week in Whitefield"
- [ ] **Export to PDF/CSV** — for offline reports and presentations
- [ ] **WhatsApp integration** — send issue alerts via WhatsApp Business API (low cost)

---

## Phase 4 — Scale to Other Cities

Goal: Expand beyond Bangalore.

- [ ] **City selector** — configurable keywords and areas for any Indian city
- [ ] **Multi-source data** — add Reddit (r/bangalore), Citizen app, 311-style portals
- [ ] **Department routing** — auto-route Roads issues to BBMP, Power to BESCOM, etc.
- [ ] **Official response tracking** — detect when govt accounts reply to complaints
- [ ] **Public portal** — citizens can verify if their issue was seen

---

## Parking Lot (Good Ideas, Not Prioritized Yet)

- AI-generated weekly brief (using Claude API)
- SMS alerts for ward councillors
- Sentiment analysis on issue urgency
- Integration with BBMP's existing complaint portal
- Mobile-optimized view for officials on the go
- Historical trend charts (month-over-month)
- Budget vs complaint heatmap (areas with high complaints, low budget allocation)

---

*Last updated: 2026-05-17*
