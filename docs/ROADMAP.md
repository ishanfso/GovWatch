# Roadmap

Features planned for GovWatch, in priority order.
Each item moves to CHANGELOG.md when completed.

---

## Phase 1 — MVP ✅ COMPLETE

- [x] Project structure and documentation setup
- [x] Sample data (20 mock Bangalore civic issues)
- [x] Static dashboard — category cards, filters, chart
- [x] Twitter fetch script (Tweepy, paid tier)
- [x] Issue categorization script
- [x] GitHub Pages deployment — `https://ishanfso.github.io/GovWatch/dashboard/`
- [x] First live data fetch completed

---

## Phase 2 — Squeeze the Data ✅ COMPLETE

Goal: Extract maximum value from already-fetched data before spending more on Twitter API.

- [x] **Map view** — interactive Bangalore map (Leaflet + OpenStreetMap, free)
- [x] **Issue clustering** — group tweets about the same problem, show count badge
- [x] **Search** — free-text search across all issue cards
- [x] **Export to CSV** — one-click download for offline reports and presentations
- [x] **Status tracking** — officials can mark issues Acknowledged / In Progress / Resolved
- [x] **Department view** — issues grouped by BBMP / BESCOM / BWSSB / BTP
- [x] **LLM noise filter** — Claude AI removes politician visits, news, campaigns from dataset
- [x] **Modern dashboard design** — gradient header, card accents, improved visual hierarchy

---

## Phase 3 — Data Pipeline Maturity ✅ COMPLETE

Goal: Make data collection cost-efficient and repeatable.

- [x] **Incremental fetch** — `since_id` ensures Twitter only returns new tweets; no double billing
- [x] **Deduplication** — same tweet never stored twice across fetch runs
- [x] **Persistent filter verdicts** — already-classified tweets skipped on future LLM filter runs
- [x] **Backup before filter** — `issues_unfiltered.json` always saved before modifying data

---

## Phase 4 — Intelligence Layer (Next)

Goal: Make the dashboard actively useful in daily government work, not just a feed to browse.

- [ ] **Top issues digest** — "Top 5 highest-engagement issues right now" panel above the feed
- [ ] **AI weekly brief** — Claude generates a 1-page natural language summary: top problems, worst areas, what's trending. Run as a script, output displayed in dashboard or emailed.
- [ ] **Issue aging** — show how old each complaint is ("3 days ago"); flag issues unresolved after 7+ days
- [ ] **Trend indicators** — "Roads complaints ↑ 40% vs last week in Whitefield" (requires 2+ fetch snapshots)

---

## Phase 5 — Distribution

Goal: Get the data to officials without them needing to open a browser.

- [ ] **Email digest** — weekly summary email to a list of officials (free tier of Resend or SendGrid)
- [ ] **WhatsApp alerts** — send top daily issues via WhatsApp Business API (low cost, high open rate for Indian officials)
- [ ] **PDF export** — formatted one-pager for use in meetings and presentations

---

## Phase 6 — Precision

Goal: Make location and routing more accurate.

- [ ] **Ward mapping** — map Bangalore area names to the city's 198 official wards
- [ ] **Department auto-routing** — display which specific official/ward councillor is responsible
- [ ] **Kannada tweet support** — translate Kannada complaints before categorization

---

## Phase 7 — Scale to Other Cities

Goal: Expand beyond Bangalore.

- [ ] **City selector** — configurable keywords and areas for any Indian city
- [ ] **Multi-source data** — add Reddit (r/bangalore), Citizen app, 311-style portals
- [ ] **Official response tracking** — detect when govt accounts reply to complaints
- [ ] **Public portal** — citizens can verify if their issue was seen

---

## Parking Lot

- Integration with BBMP's existing complaint portal
- Historical trend charts (month-over-month, requires ongoing data collection)
- Budget vs complaint heatmap (areas with high complaints, low budget allocation)
- SMS alerts for ward councillors
- Mobile-optimized view for officials in the field

---

*Last updated: 2026-05-17*
