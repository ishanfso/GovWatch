# Architecture

How GovWatch works, from tweet to dashboard.

---

## System Overview

```
Twitter/X
    │
    │  (search API, free tier)
    ▼
fetch_tweets.py          ← runs manually or via GitHub Actions
    │
    │  (raw tweet JSON)
    ▼
process_issues.py        ← categorizes, scores severity, deduplicates
    │
    │  (structured issues.json)
    ▼
data/issues.json         ← flat-file "database", lives in the repo
    │
    │  (loaded by browser fetch())
    ▼
dashboard/js/app.js      ← reads JSON, renders cards and chart
    │
    ▼
dashboard/index.html     ← what government officials see in their browser
```

---

## Component Details

### 1. Data Collection (`scripts/fetch_tweets.py`)

- Uses **Tweepy** with Twitter API v2 (free tier)
- Searches for tweets matching Bangalore civic issue keywords
- Free tier allows ~500,000 tweet reads per month
- Outputs raw tweet data to a staging format
- Runs manually for MVP; Phase 2 will automate via GitHub Actions

**Search strategy:**
- Keyword sets for each issue category
- Geo-filter for Bangalore (lat/long bounding box)
- Language filter: English + Kannada
- Exclude retweets to reduce noise
- 7-day lookback window (free API limit)

### 2. Issue Processing (`scripts/process_issues.py`)

- Reads raw tweet data from fetch_tweets.py output
- **Categorizes** each tweet using keyword matching:
  - Roads: pothole, road, crater, bump, digging
  - Water: water, tanker, borewell, leakage, pipe
  - Electricity: power cut, BESCOM, transformer, outage
  - Waste: garbage, trash, dumping, SWM
  - Flooding: flood, waterlogging, drain, stormwater
  - Parks: park, tree, garden, BBMP
  - Traffic: signal, jam, congestion
- **Scores severity** based on engagement (likes + retweets):
  - High: >50 total engagement
  - Medium: 10–50
  - Low: <10
- **Extracts area** from tweet text using a Bangalore area name list
- **Deduplicates** using tweet ID
- Writes structured output to `data/issues.json`

### 3. Data Storage (`data/issues.json`)

Single JSON array of issue objects. No database needed for MVP.

```json
[
  {
    "id": "1234567890",
    "text": "Massive pothole on 80 feet road Koramangala causing accidents",
    "author": "@concerned_citizen",
    "date": "2025-01-15T10:30:00Z",
    "category": "Roads",
    "area": "Koramangala",
    "severity": "high",
    "likes": 45,
    "retweets": 12,
    "source_url": "https://twitter.com/concerned_citizen/status/1234567890",
    "keywords": ["pothole", "road", "accident"],
    "status": "open"
  }
]
```

### 4. Dashboard (`dashboard/`)

Pure HTML + CSS + JavaScript. No build process. No server required.

- `index.html` — page structure, loads CSS and JS
- `css/styles.css` — clean, professional government-grade UI
- `js/app.js` — all logic:
  - Loads `data/issues.json` (or falls back to `data/sample_issues.json`)
  - Renders issue cards
  - Populates category breakdown bar chart (Chart.js via CDN)
  - Handles category and area filters
  - Shows summary statistics

**Fallback behavior:** If no `issues.json` exists, the dashboard automatically loads `sample_issues.json` so it always works.

---

## Deployment

### Local (for demos and development)
1. Clone the repo
2. Open `dashboard/index.html` in a browser
3. That's it

### GitHub Pages (for officials to access via URL)
1. Go to repo Settings → Pages
2. Set source to `main` branch, `/` (root) or `/dashboard` folder
3. URL: `https://ishanfso.github.io/GovWatch/dashboard/`

### Automated Refresh (Phase 2 — GitHub Actions)
```yaml
# .github/workflows/refresh.yml
schedule:
  - cron: '0 */6 * * *'   # Every 6 hours
steps:
  - run: python scripts/fetch_tweets.py
  - run: python scripts/process_issues.py
  - run: git commit -am "Auto-refresh issues data" && git push
```

---

## Cost Analysis

| Service | Usage | Monthly Cost |
|---|---|---|
| Twitter API v2 (Basic paid tier) | Manual fetches only — auto-refresh paused | ~$100/mo if run regularly; $0 when paused |
| GitHub repo + Pages | Hosting + CI | $0 |
| Chart.js CDN | Dashboard charts | $0 |
| OpenStreetMap / Leaflet | Map view (Phase 2) | $0 |
| **Current running cost** | Data already fetched, no auto-refresh | **$0/month** |

**Cost strategy:** Fetch data manually in batches (e.g., once a month, or after major rain/events) rather than continuous polling. This keeps Twitter API costs near zero between fetches.

---

## Limitations (MVP)

1. **7-day tweet history only** — free Twitter API doesn't go further back
2. **English tweets only** — Kannada tweet support needs a translation step (Phase 3)
3. **Manual refresh** — someone must run the fetch script (Phase 2 automates this)
4. **No login/auth** — dashboard is public; add auth in Phase 3 if needed
5. **No database** — JSON file works up to ~10,000 issues; beyond that, consider SQLite
