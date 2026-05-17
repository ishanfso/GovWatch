# Build Log

Every feature and file built in GovWatch, with dates and status.

---

## MVP — Phase 1 (Bangalore Focus)

### Infrastructure & Documentation

| File | Date Built | Status | Description |
|---|---|---|---|
| `CLAUDE.md` | 2026-05-17 | ✅ Live | Claude Code context file — read at every session start |
| `README.md` | 2026-05-17 | ✅ Live | Project overview |
| `.gitignore` | 2026-05-17 | ✅ Live | Git ignore rules including API key protection |
| `docs/CHANGELOG.md` | 2026-05-17 | ✅ Live | Change history |
| `docs/BUILD_LOG.md` | 2026-05-17 | ✅ Live | This file |
| `docs/ROADMAP.md` | 2026-05-17 | ✅ Live | Future feature plan |
| `docs/ARCHITECTURE.md` | 2026-05-17 | ✅ Live | System design |
| `docs/SETUP_GUIDE.md` | 2026-05-17 | ✅ Live | Non-technical setup guide |

### Data Layer

| File | Date Built | Status | Description |
|---|---|---|---|
| `data/sample_issues.json` | 2026-05-17 | ✅ Live | 20 mock civic issues for demos |
| `data/issues.json` | — | ⏳ Generated | Created by fetch_tweets.py when run |

### Dashboard (Frontend)

| File | Date Built | Status | Description |
|---|---|---|---|
| `dashboard/index.html` | 2026-05-17 | ✅ Live | Main dashboard — works offline with sample data |
| `dashboard/css/styles.css` | 2026-05-17 | ✅ Live | Government-grade clean styling |
| `dashboard/js/app.js` | 2026-05-17 | ✅ Live | Data loading, rendering, filters, chart |

**Dashboard Features (Phase 2 — complete):**
- [x] Issue cards with category, area, severity, engagement count
- [x] Category breakdown bar chart
- [x] Filter by category (Roads, Water, Electricity, etc.)
- [x] Filter by area (Koramangala, Indiranagar, etc.)
- [x] Filter by severity
- [x] Filter by status (Open / Acknowledged / In Progress / Resolved)
- [x] Free-text search across all issues
- [x] Severity indicators (High / Medium / Low)
- [x] Status tracking per issue (localStorage, no server needed)
- [x] "View Tweet" link on each card
- [x] Summary statistics row (total issues, top category, top area)
- [x] Last updated timestamp
- [x] **Map View** — interactive Bangalore map with coloured markers (Leaflet + OpenStreetMap)
- [x] **Issue Clustering** — group same category+area issues, show count badge
- [x] **Export CSV** — download current filtered view as spreadsheet
- [x] **Department View** — issues grouped by BBMP / BESCOM / BWSSB / BTP

### Scripts (Data Collection)

| File | Date Built | Status | Description |
|---|---|---|---|
| `scripts/fetch_tweets.py` | 2026-05-17 | ✅ Live | Twitter API v2 fetch using Tweepy |
| `scripts/process_issues.py` | 2026-05-17 | ✅ Live | NLP categorization + severity scoring |
| `scripts/requirements.txt` | 2026-05-17 | ✅ Live | Python dependencies |
| `scripts/config.example.py` | 2026-05-17 | ✅ Live | API key template |

---

## What Works Right Now (Without Any Setup)

1. Open `dashboard/index.html` in any browser
2. See 20 realistic Bangalore civic issues in the dashboard
3. Filter by category and area
4. View issue severity and engagement counts

## What Requires Setup

1. Live Twitter data → needs Twitter API key (free, see SETUP_GUIDE.md)
2. GitHub Pages hosting → 5-minute setup (see SETUP_GUIDE.md)
3. Automated data refresh → GitHub Actions (Phase 2)
