# Changelog

All changes to GovWatch are logged here, newest first.
Format: `[Date] - What changed and why`

---

## [2026-05-19] — Date Range Filter

### Added

**Date filter in dashboard sidebar**
- Preset quick-picks: All Time / Last 7 Days / Last 30 Days / This Month (chip buttons, consistent with existing filter UI)
- Custom date range: From and To date inputs for any specific range
- Selecting a custom date input automatically deactivates the preset chips
- Reset Filters button clears date filters along with all others
- Filter applies across all views (feed, map, department tab)

---

## [2026-05-17] — GitHub Actions Auto-refresh

### Added

**`.github/workflows/refresh.yml`**
- Runs daily at 6:00 AM IST (00:30 UTC) and can also be triggered manually from the GitHub Actions tab
- Writes `config.py` at runtime from GitHub repository secrets (keys never stored in the repo)
- Runs the full pipeline: `fetch_tweets.py` → `process_issues.py` → `filter_issues.py`
- Only commits if there is actually new data — skips the commit step if no new tweets were found
- Commit message includes the current issue count and UTC timestamp
- Cost-safe because `since_id` means each run only fetches tweets newer than the last run

**To activate:** add `TWITTER_BEARER_TOKEN` and `ANTHROPIC_API_KEY` as secrets in the GitHub repository settings (Settings → Secrets and variables → Actions → New repository secret).

---

## [2026-05-17] — Incremental Fetch and Filter

### Changed

**`scripts/fetch_tweets.py` — incremental fetching**
- On startup, loads existing `data/raw_tweets.json` (if present) and records all known tweet IDs
- New fetches skip any tweet ID already in the file — prevents duplicates across runs
- New tweets are appended to the existing raw dataset rather than overwriting it
- Output now reports how many new tweets were fetched vs how many were skipped as already known

**`scripts/filter_issues.py` — persistent verdicts, incremental classification**
- Introduces `data/filter_verdicts.json`: a persistent `{tweet_id: "yes"/"no"}` store
- On each run, tweets with IDs already in the verdicts file are never sent to the LLM again
- Only genuinely new tweets are classified — keeps cost near zero on subsequent runs
- Output now shows separately: previously kept + newly kept + removed this run
- Verdicts file is updated after every run so the next run can skip these too

### Workflow for growing the dataset
```
python fetch_tweets.py       # appends new tweets only
python process_issues.py     # categorizes all raw tweets
python filter_issues.py      # LLM-classifies only new ones; skips already-known
```

---

## [2026-05-17] — Phase 3: LLM Filtering + Modern Design

### Added

**AI-Powered Issue Filter (`scripts/filter_issues.py`)**
- Uses Claude API (Anthropic) to classify each tweet as a genuine civic complaint or noise
- Runs in batches of 20 with prompt caching — keeps cost under $0.10 for a full 300-tweet dataset
- Catches non-issues that keyword matching cannot: politician visits (HD Deve Gowda mango fair at Cubbon Park), mobile theft awareness campaigns, news articles about government actions
- Saves a full backup to `data/issues_unfiltered.json` before modifying anything
- Run sequence: `fetch_tweets.py` → `process_issues.py` → `filter_issues.py`

**Modern Dashboard Design** (`dashboard/css/styles.css` rewrite)
- Dark gradient header (navy → indigo) with glassmorphism brand icon
- Gradient brand title, indigo accent throughout
- Stat cards with gradient top-border accent and lift-on-hover
- Issue cards with gradient severity bar, refined shadows, soft background footer
- Tab bar with gradient active state
- Cluster toggle and issue count styled as pill badges
- Department cards with gradient header background and hover lift
- Page background uses a three-stop subtle gradient (blue-tinted to green-tinted)
- All interactive elements have improved focus rings and hover transitions

**Updated `scripts/config.example.py`**
- Added `ANTHROPIC_API_KEY` field alongside existing Twitter fields

**Updated `scripts/requirements.txt`**
- Added `anthropic>=0.40.0`

### Fixed

**`docs/SETUP_GUIDE.md`**
- Removed all "free tier" Twitter references — Basic (paid) tier is required
- Added Part 4: instructions for getting and configuring Anthropic API key
- Updated data pipeline instructions to include the optional `filter_issues.py` step

---

## [2026-05-17] — Phase 2: Value Extraction Features

### Added to dashboard

**Map View (new tab)**
- Interactive Bangalore map powered by Leaflet.js + OpenStreetMap (free, no API key)
- Every issue plotted as a coloured circle marker: red = high, amber = medium, green = low
- Marker size scales with severity; markers jitter slightly so stacked issues are visible
- Click any marker → popup with issue text, category, engagement, and "View Tweet" link
- Coordinates looked up from a 28-area Bangalore lookup table; unknown areas fall back to city centre

**Issue Clustering (toggle in feed)**
- "Group similar issues" toggle in the feed header
- When on: issues with the same category + area are merged into one card showing the highest-engagement tweet
- Cluster badge shows count (e.g. "4 reports") so officials know how widespread the problem is
- When off: all individual issues shown as before

**Export to CSV (button in filters)**
- "⬇ Export CSV" button downloads the current filtered view as a .csv file
- Columns: ID, Date, Category, Area, Severity, Status, Likes, Retweets, Author, Tweet Text, URL
- Filename includes today's date (e.g. `govwatch_bangalore_2026-05-17.csv`)
- Works with any active filter combination

**Status Tracking (on every issue card)**
- Each card has a dropdown: ⚪ Open / 🔵 Acknowledged / 🟡 In Progress / 🟢 Resolved
- Status is saved in the browser (localStorage) — no server needed
- Cards styled per status: resolved cards fade, acknowledged shows blue, in-progress shows amber
- New "Status" filter chip row lets officials view only Open or Resolved issues

**Department View (new tab)**
- Groups all issues by responsible government body: BBMP, BESCOM, BWSSB, BTP
- Each department card shows: total issues, high/medium/low severity breakdown, top 4 issues
- "See all X issues in feed" button filters the feed to that department's categories

**Search**
- Free-text search box filters across tweet text, area, category, and author simultaneously

### Changed
- Issue cards redesigned: `<div>` instead of `<a>` wrapper — allows status dropdown + tweet link coexisting cleanly
- Filters panel: added Search, Status filter chips, and Export button
- `styles.css`: complete rewrite with new component styles (tab bar, map, dept cards, status select, cluster badge)

---

## [2026-05-17] — Live Data + GitHub Pages Go-Live

### Completed
- Twitter API v2 set up with paid tier (Basic) — free tier did not allow search/read access
- First real data fetch completed — `data/issues.json` now contains live Bangalore civic tweets
- GitHub Pages enabled — dashboard is publicly accessible at `https://ishanfso.github.io/GovWatch/dashboard/`

### Decision: Auto-refresh on hold
- GitHub Actions auto-refresh (every 6 hours) is **deprioritized** to avoid Twitter API costs
- Data will be refreshed manually by running `fetch_tweets.py` when needed
- Focus shifts to extracting maximum value from already-fetched data before fetching more

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
- `scripts/fetch_tweets.py` — Fetches civic tweets from Twitter API v2 (paid tier)
- `scripts/process_issues.py` — Categorizes issues, assigns severity, deduplicates
- `scripts/requirements.txt` — Python package list
- `scripts/config.example.py` — Template for API keys (copy to config.py, never commit)

### Architecture Decision
- Chose static HTML dashboard over a web framework — zero hosting cost, works on GitHub Pages
- Chose JSON flat-file storage over a database — good enough for MVP, Obsidian-readable
- Twitter API v2 Basic (paid) — free tier does not support search queries

---

*Add new entries at the TOP of this file, above this line.*
