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
- [x] **GitHub Actions auto-refresh** — daily at 6 AM IST; commits updated data automatically
- [x] **Date range filter** — filter by preset (7d, 30d, this month) or custom From/To dates

---

## Phase 4 — Actionable Dashboard ✅ COMPLETE

Goal: Turn the dashboard from a read-only feed into a tool officials can actually act on.

- [x] **Issue aging** — relative age on every card ("2d ago"), full date on hover
- [x] **SLA / TAT timers** — category-specific turnaround times; green/amber/red badge per card
- [x] **Assign & Email button** — one click opens a pre-filled email to the correct department POC
- [x] **POC directory** — maps each category to the right official email (BBMP, BESCOM, BWSSB, BTP)
- [x] **Role-based URL views** — `?role=bbmp/bescom/bwssb/btp` filters to that department, shows banner
- [x] **Coming Soon tab** — shows planned features for stakeholder/investor demos

---

## Phase 5 — Closing the Loop (Next)

Goal: Make the dashboard actionable end-to-end — issue raised → routed → resolved → citizen notified.

- [ ] **Twitter close-loop** — when official marks Resolved, auto-post reply on original tweet thread so citizen gets closure. Thread becomes the source of truth.
- [ ] **Twitter clarification bot** — when complaint lacks location/detail, bot replies on thread asking for more info. Demo first with a controlled test account.
- [ ] **Assignment tracking** — "Assigned to" field per issue; leadership view shows queue per official
- [ ] **Resolution metrics** — avg time to close, SLA compliance %, issues resolved this week
- [ ] **Improve LLM filter prompt** — based on manual CSV review: better distinguish citizen_complaint vs civic_commentary, govt announcements, and duplicate clusters

---

## Phase 6 — Distribution

Goal: Get the data to officials without them needing to open a browser.

- [ ] **WhatsApp alerts** — daily digest of top issues to officials via WhatsApp Business API
- [ ] **Email digest** — weekly summary email to a configured list of officials
- [ ] **PDF export** — formatted one-pager for council meetings and presentations
- [ ] **Citizen-facing portal** — public view where citizens can track if their issue was acknowledged

---

## Phase 7 — Precision

Goal: Make location and routing more accurate.

- [ ] **Ward mapping** — map Bangalore area names to the city's 198 official wards
- [ ] **Department auto-routing** — display which specific ward councillor is responsible
- [ ] **Kannada tweet support** — translate Kannada complaints before categorization
- [ ] **Official response tracking** — detect when govt accounts reply to complaints

---

## Phase 8 — Multi-Channel

Goal: Pull civic complaints from platforms beyond Twitter.

- [ ] **Reddit r/bangalore** — free API, public posts, no auth needed
- [ ] **Facebook Groups** — harder (Meta Graph API restricted); parking lot for now
- [ ] **311-style portals** — integrate with existing BBMP/BWSSB complaint portal data if accessible

---

## Phase 9 — Scale & Infrastructure

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

---

*Last updated: 2026-05-19*
