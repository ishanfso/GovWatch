# Build Log

Every feature and file built in GovWatch, with dates and status.

---

## Infrastructure & Documentation

| File | Date Built | Status | Description |
|---|---|---|---|
| `CLAUDE.md` | 2026-05-17 | ✅ Live | Claude Code context file — read at every session start |
| `README.md` | 2026-05-17 | ✅ Live | Public project overview |
| `.gitignore` | 2026-05-17 | ✅ Live | Prevents secrets and OS files from being committed |
| `docs/CHANGELOG.md` | 2026-05-17 | ✅ Live | Change history (newest first) |
| `docs/BUILD_LOG.md` | 2026-05-17 | ✅ Live | This file |
| `docs/ROADMAP.md` | 2026-05-17 | ✅ Live | Future feature plan |
| `docs/ARCHITECTURE.md` | 2026-05-17 | ✅ Live | System design and data flow |
| `docs/SETUP_GUIDE.md` | 2026-05-17 | ✅ Live | Step-by-step setup for non-technical users |

---

## Data Layer

| File | Date Built | Status | Description |
|---|---|---|---|
| `data/sample_issues.json` | 2026-05-17 | ✅ Live | 20 mock civic issues (dashboard fallback) |
| `data/issues.json` | 2026-05-17 | ✅ Live | ~773 live filtered Bangalore civic tweets |
| `data/raw_tweets.json` | 2026-05-17 | ✅ Live | All raw tweets from Twitter API (pre-categorization) |
| `data/issues_unfiltered.json` | 2026-05-17 | ✅ Live | Backup of all keyword-matched tweets before LLM filter |
| `data/filter_verdicts.json` | 2026-05-17 | ✅ Live | Persistent LLM verdicts per tweet ID (incremental filtering) |

### Officials Database (Phase 5 — added 2026-06-20)

| File | Records | Description |
|---|---|---|
| `data/officials/wards.json` | 369 wards | Full ward accountability map: councillor, MLA, MP, SWM JHI, BESCOM AEE, BWSSB AE, traffic PS |
| `data/officials/issue_routing.json` | 10 types | Issue type → first contact, CC, escalation chain, SLA |
| `data/officials/escalation_chains.json` | 5 depts | Department escalation ladders (BBMP, BESCOM, BWSSB, Traffic, Political) |
| `data/officials/city_corp_contacts.json` | 55 entries | BBMP zone/division officers with email |
| `data/officials/bbmp_directory.json` | 428 entries | BBMP email directory by section and designation |
| `data/officials/swm_se.json` | 8 entries | SWM Zonal Superintending Engineers |
| `data/officials/swm_aee.json` | 27 entries | SWM AEEs by zone/division |
| `data/officials/swm_jhi.json` | 198 entries | Ward-level SWM Junior Health Inspectors with mobile |
| `data/officials/bescom_units.json` | 484 units | BESCOM operational units: zone→circle→division→AEE/AE/JE |
| `data/officials/bwssb_stations.json` | 122 stations | BWSSB service stations: EE→AEE→AE with contacts |
| `data/officials/mlas.json` | 36 MLAs | Bangalore MLAs: party, phones, email |
| `data/officials/mps.json` | 3 MPs | Bangalore MPs: phones, email, assemblies |
| `data/officials/traffic_rti.json` | 66 stations | Traffic police stations with PIO and FAA contacts |
| `data/officials/area_ward_lookup.json` | 28 areas | Dashboard area names → nearest ward name/number |

---

## Dashboard (Frontend)

| File | Date Built | Status | Description |
|---|---|---|---|
| `dashboard/index.html` | 2026-05-17 | ✅ Live | Single-page app — redesigned 2026-06-20 (Public Ledger) |
| `dashboard/css/styles.css` | 2026-05-17 | ✅ Live | Public Ledger theme — warm canvas, forest green, Source Serif 4 |
| `dashboard/js/app.js` | 2026-05-17 | ✅ Live | Queue-first logic — saved views, detail panel, analytics |

**Dashboard Features (all live):**
- [x] Priority queue — rows sorted overdue → severity → engagement; 4px severity stripe
- [x] Detail panel — selected issue shows full text, metadata, status selector, assign button
- [x] 5 KPI cards — Overdue SLA, High Risk Open, New Today, Unassigned, Resolved This Week
- [x] Saved views — All / Urgent / Overdue / Unassigned / Resolved chips
- [x] Filter bar — Department, Category, Area dropdowns + free-text search
- [x] Date filter — Last 24h / 7d / 30d / This Month / Custom date range
- [x] Sort control — Priority / Newest / Oldest / Severity
- [x] Issue clustering — group same category+area into one row with count badge
- [x] Map view — interactive Leaflet map, coloured markers by severity, click for detail
- [x] Department view — issues grouped by BBMP / BESCOM / BWSSB / BTP
- [x] Analytics tab — category bar chart + severity breakdown bars + SLA table by department
- [x] Status tracking per issue — Open / Acknowledged / In Progress / Resolved (localStorage)
- [x] CSV export — downloads current filtered view as a spreadsheet
- [x] Email assign — Gmail compose URL pre-filled to correct official (not mailto:)
- [x] Role URL params — ?role=bbmp/bescom/bwssb/btp filters to that department
- [x] Officials tab — ward lookup, department org charts, issue routing guide
- [x] Smart contacts — detail panel shows named ward-specific officials for each issue
- [x] Multi-contact email — Gmail compose with To + CC pre-filled from routing rules

---

## Scripts (Data Pipeline)

| File | Date Built | Status | Description |
|---|---|---|---|
| `scripts/fetch_tweets.py` | 2026-05-17 | ✅ Live | Incremental Twitter fetch — `since_id` avoids double billing |
| `scripts/process_issues.py` | 2026-05-17 | ✅ Live | Keyword categorization + severity scoring + verified AREA_TO_WARD lookup; preserves enriched ward data across runs |
| `scripts/filter_issues.py` | 2026-05-17 | ✅ Live | LLM filter (Claude Haiku) — extracts area from tweet text, maps to ward using verified AREA_TO_WARD dict |
| `scripts/enrich_locations.py` | 2026-06-20 | ✅ Live | LLM area extraction + Nominatim geocoding → ward mapping |
| `scripts/backfill_wards.py` | 2026-06-20 | ✅ Live | One-time keyword backfill — assigns ward_name to issues without one; no API cost |
| `scripts/requirements.txt` | 2026-05-17 | ✅ Live | Python dependencies (tweepy, anthropic, requests, python-dateutil) |
| `scripts/config.example.py` | 2026-05-17 | ✅ Live | Config template — Twitter + Anthropic API keys |
| `.github/workflows/refresh.yml` | 2026-05-17 | ✅ Live | GitHub Actions — daily auto-refresh at 6 AM IST |

---

## What Works Right Now (No Setup Needed)

1. Open `dashboard/index.html` in any browser
2. See 20 realistic Bangalore civic issues
3. Filter, search, view map, export CSV — all features work on sample data

## What the Live Dashboard Shows

- `https://ishanfso.github.io/GovWatch/dashboard/`
- ~128 real filtered Bangalore civic tweets from Twitter
- All dashboard features active on real data

## What Requires Setup to Refresh Data

1. Twitter API key (paid Basic tier) → run `fetch_tweets.py`
2. Anthropic API key → run `filter_issues.py`
3. See `docs/SETUP_GUIDE.md` for step-by-step instructions
