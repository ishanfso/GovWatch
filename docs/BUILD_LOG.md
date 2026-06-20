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
| `data/issues.json` | 2026-05-17 | ✅ Live | ~128 live filtered Bangalore civic tweets |
| `data/raw_tweets.json` | 2026-05-17 | ✅ Live | All raw tweets from Twitter API (pre-categorization) |
| `data/issues_unfiltered.json` | 2026-05-17 | ✅ Live | Backup of all keyword-matched tweets before LLM filter |
| `data/filter_verdicts.json` | 2026-05-17 | ✅ Live | Persistent LLM verdicts per tweet ID (incremental filtering) |

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
- [x] Issue clustering — group same category+area into one row with count badge
- [x] Map view — interactive Leaflet map, coloured markers by severity, click for detail
- [x] Department view — issues grouped by BBMP / BESCOM / BWSSB / BTP
- [x] Analytics tab — category bar chart + severity breakdown bars + SLA table by department
- [x] Status tracking per issue — Open / Acknowledged / In Progress / Resolved (localStorage)
- [x] CSV export — downloads current filtered view as a spreadsheet
- [x] Email assign — pre-filled email to correct department official
- [x] Role URL params — ?role=bbmp/bescom/bwssb/btp filters to that department

---

## Scripts (Data Pipeline)

| File | Date Built | Status | Description |
|---|---|---|---|
| `scripts/fetch_tweets.py` | 2026-05-17 | ✅ Live | Incremental Twitter fetch — `since_id` avoids double billing |
| `scripts/process_issues.py` | 2026-05-17 | ✅ Live | Keyword categorization + severity scoring |
| `scripts/filter_issues.py` | 2026-05-17 | ✅ Live | LLM filter (Claude Haiku) — incremental, persists verdicts |
| `scripts/requirements.txt` | 2026-05-17 | ✅ Live | Python dependencies (tweepy, anthropic, python-dateutil) |
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
