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

- [x] Map view — interactive Bangalore map (Leaflet + OpenStreetMap, free)
- [x] Issue clustering — group tweets about the same problem, show count badge
- [x] Search — free-text search across all issue cards
- [x] Export to CSV — one-click download for offline reports and presentations
- [x] Status tracking — officials can mark issues Acknowledged / In Progress / Resolved
- [x] Department view — issues grouped by BBMP / BESCOM / BWSSB / BTP
- [x] LLM noise filter — Claude AI removes politician visits, news, campaigns from dataset
- [x] Modern dashboard design — gradient header, card accents, improved visual hierarchy

---

## Phase 3 — Data Pipeline Maturity ✅ COMPLETE

Goal: Make data collection cost-efficient and repeatable.

- [x] Incremental fetch — `since_id` ensures Twitter only returns new tweets; no double billing
- [x] Deduplication — same tweet never stored twice across fetch runs
- [x] Persistent filter verdicts — already-classified tweets skipped on future LLM filter runs
- [x] Backup before filter — `issues_unfiltered.json` always saved before modifying data
- [x] GitHub Actions auto-refresh — daily at 6 AM IST; commits updated data automatically
- [x] Date range filter — filter by preset (7d, 30d, this month) or custom From/To dates

---

## Phase 4 — Actionable Dashboard ✅ COMPLETE

Goal: Turn the dashboard from a read-only feed into a tool officials can actually act on.

- [x] Issue aging — relative age on every card ("2d ago"), full date on hover
- [x] SLA / TAT timers — category-specific turnaround times; green/amber/red badge per card
- [x] Assign & Email button — one click opens a pre-filled Gmail draft to the correct official
- [x] POC directory — maps each category to the right official email
- [x] Role-based URL views — `?role=bbmp/bescom/bwssb/btp` filters to that department
- [x] Public Ledger redesign — warm canvas, forest green, Source Serif 4 typography
- [x] Queue-first layout — priority rows + sticky detail panel instead of card grid
- [x] 5 KPI cards — Overdue SLA, High Risk Open, New Today, Unassigned, Resolved This Week
- [x] Analytics tab — category chart, severity bars, SLA table by department

---

## Phase 5 — Officials Intelligence ✅ IN PROGRESS

Goal: Give officials a complete self-serve routing system so the right person gets the right complaint automatically, with full org chart visibility and escalation paths.

- [x] **Consolidated officials database** — 369 wards × all departments: 370-ward accountability map, BBMP email directory (444 entries), BESCOM hierarchy (504 units), BWSSB service stations (122), SWM ward-level contacts (198 JHIs), MLAs (36), MPs (3), Traffic Police RTI (66 stations)
- [x] **Officials tab** — new dashboard tab with three sections:
  - Ward & Area Lookup: search any area/ward → see every responsible official with name, phone, email, send button
  - Department Org Charts: graphical hierarchy for BBMP, BESCOM, BWSSB, Traffic Police, Political
  - Issue Routing Guide: for each complaint type — first contact, CC, escalation 1, escalation 2, SLA
- [x] **Smart assignment** — detail panel now shows ward-specific named officials (not generic inboxes) based on issue area + category
- [x] **Multi-contact email** — single email compose pre-fills To (first contact), CC (all relevant officials), with issue details in body
- [ ] **Assignment tracking** — "Assigned to" named person per issue; leadership sees team queue (requires backend)
- [ ] **Twitter close-loop** — when official marks Resolved, auto-reply on original tweet so citizen gets closure

---

## Phase 6 — Self-Serve Routing Config

Goal: Let admins configure routing rules and org structure themselves without touching code.

- [ ] **Routing config panel** — in-dashboard editor to add/edit department contacts, sub-departments, ward officers
- [ ] **Custom SLA targets** — set turnaround time per category from the dashboard
- [ ] **Escalation rules** — configure: if unacknowledged for Xh → escalate to next level automatically
- [ ] **"My Queue" personal view** — each official can bookmark a URL that shows only their assigned issues (`?assignee=name`)
- [ ] **Internal notes** — free-text note per issue, saved in localStorage, visible in detail panel
- [ ] **Citizen reply template** — button to open pre-filled Twitter/X reply to the original complainant

---

## Phase 7 — Distribution

Goal: Get the data to officials without them needing to open a browser.

- [ ] **WhatsApp alerts** — daily digest of top issues to officials via WhatsApp Business API
- [ ] **Email digest** — weekly summary email to configured official list
- [ ] **PDF export** — formatted one-pager for council meetings and presentations
- [ ] **Citizen-facing portal** — public view where citizens can track if their issue was acknowledged
- [ ] **Briefing / presentation mode** — full-screen top-10 queue view designed for projector use

---

## Phase 8 — Data Quality & Precision

Goal: Make location and routing more accurate.

- [ ] **Ward boundary GeoJSON** — overlay ward polygons on map so officials can click a ward visually
- [ ] **Area confidence scoring** — flag issues where area is just "Bangalore" (low precision)
- [ ] **Kannada tweet support** — translate Kannada complaints before categorization
- [ ] **Official response tracking** — detect when govt accounts reply to complaints on Twitter

---

## Phase 9 — Multi-Channel

Goal: Pull civic complaints from platforms beyond Twitter.

- [ ] **Reddit r/bangalore** — free API, public posts, no auth needed
- [ ] **Facebook Groups** — harder (Meta Graph API restricted); parking lot for now
- [ ] **311-style portals** — integrate with existing BBMP/BWSSB complaint portal data if accessible

---

## Phase 10 — Scale & Infrastructure

Goal: Productionise GovWatch for real institutional use (only after feature set is proven).

- [ ] **Custom domain** — govwatch.in or similar
- [ ] **Move off GitHub Pages** — Vercel (free tier, supports server functions)
- [ ] **Database** — Supabase (Postgres + real-time + free tier); replaces JSON flat files
- [ ] **User accounts** — officials sign up, each sees only their department's queue by default
- [ ] **Expand to other cities** — configurable keywords and area maps for Mumbai, Delhi, Chennai, Hyderabad

---

## Parking Lot

- Budget vs complaint heatmap (areas with high complaints, low budget allocation)
- SMS alerts for ward councillors
- Mobile-optimised view for officials in the field
- Historical trend charts (month-over-month, requires 3+ months of data)
- Resolution analytics — avg time to close, SLA compliance % by department

---

*Last updated: 2026-06-20*
