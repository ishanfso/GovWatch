# Changelog

All changes to GovWatch are logged here, newest first.
Format: `[Date] - What changed and why`

---

## [2026-05-17] — MVP Foundation

### Added
- `CLAUDE.md` — Context file so Claude Code always knows the full project state at session start
- `README.md` — Public project description
- `.gitignore` — Prevents secrets (config.py) and OS files from being committed
- `docs/CHANGELOG.md` — This file
- `docs/BUILD_LOG.md` — Tracks every feature built
- `docs/ROADMAP.md` — Future feature backlog
- `docs/ARCHITECTURE.md` — System design documentation
- `docs/SETUP_GUIDE.md` — Step-by-step setup for non-technical users
- `data/sample_issues.json` — 20 realistic mock civic issues for Bangalore (used when no API key is set)
- `dashboard/index.html` — Main dashboard HTML, single-page layout
- `dashboard/css/styles.css` — All dashboard styling (clean government-grade look)
- `dashboard/js/app.js` — Dashboard logic: loads data, renders cards, chart, filters
- `scripts/fetch_tweets.py` — Fetches civic tweets from Twitter API v2 (free tier)
- `scripts/process_issues.py` — Categorizes issues, assigns severity, deduplicates
- `scripts/requirements.txt` — Python package list
- `scripts/config.example.py` — Template for API keys (copy to config.py, never commit)

### Architecture Decision
- Chose static HTML dashboard over a web framework — zero hosting cost, works on GitHub Pages
- Chose JSON flat-file storage over a database — good enough for MVP, Obsidian-readable
- Twitter API v2 free tier — real data without cost

---

*Add new entries at the TOP of this file, above this line.*
