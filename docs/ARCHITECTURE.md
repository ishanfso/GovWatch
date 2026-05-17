# Architecture

How GovWatch works, from tweet to dashboard.

---

## System Overview

```
Twitter/X (API v2 — Basic paid tier)
    │
    │  Search queries: Bangalore civic keywords, hashtags, @BBMP_MAYOR mentions
    ▼
scripts/fetch_tweets.py
    │  Tweepy client → raw tweet objects
    │  Output: data/raw_tweets.json
    ▼
scripts/process_issues.py
    │  Keyword categorization, severity scoring, area extraction
    │  Output: data/issues.json  (all matched tweets, including noise)
    ▼
scripts/filter_issues.py           ← Claude API (Haiku) — removes non-civic tweets
    │  Backup: data/issues_unfiltered.json
    │  Output: data/issues.json  (clean, genuine civic complaints only)
    ▼
data/issues.json                   ← flat-file "database", committed to repo
    │
    │  Browser fetch() — no server required
    ▼
dashboard/js/app.js
    │  Renders cards, chart, map, department view, clustering, filters
    ▼
dashboard/index.html               ← what government officials see
    (GitHub Pages: https://ishanfso.github.io/GovWatch/dashboard/)
```

---

## Component Details

### 1. Data Collection — `scripts/fetch_tweets.py`

Uses **Tweepy** with Twitter API v2 **Basic tier (paid, ~$100/month)**.
The free tier does not support the search queries GovWatch relies on.

**What it does:**
- Runs 8 targeted search queries covering Roads, Water, Electricity, Waste, Flooding, Parks, Traffic, and direct @BBMP_MAYOR complaints
- Deduplicates across queries using tweet ID
- Pulls tweet text, author, timestamp, likes, retweet count
- Saves raw data to `data/raw_tweets.json`

**Search strategy:**
- Keyword sets scoped to `"bangalore" OR "bengaluru"` for each category
- Hashtag queries: `#BangaloreRoads`, `#BBMPRoads`
- Language filter: English (`lang:en`)
- Exclude retweets (`-is:retweet`) to reduce duplicate noise
- 7-day lookback window (API limit for Basic tier)
- Max 100 results per query (API limit)

**Run manually.** Auto-refresh via GitHub Actions is paused to control API cost.

---

### 2. Issue Processing — `scripts/process_issues.py`

Reads `data/raw_tweets.json` and produces structured `data/issues.json`.

**Categorization** — keyword matching, first match wins:

| Category | Example keywords |
|---|---|
| Roads | pothole, road damage, crater, digging, footpath |
| Water | bwssb, water supply, no water, pipe burst |
| Electricity | power cut, bescom, transformer, street light |
| Waste | garbage, trash, dump, solid waste, SWM |
| Flooding | waterlog, flood, storm drain, rainwater |
| Parks | park, garden, lalbagh, cubbon, tree fell |
| Traffic | traffic signal, traffic jam, bmtc, metro |

**Severity scoring** — based on total engagement (likes + retweets):

| Severity | Threshold |
|---|---|
| High | ≥ 50 engagement |
| Medium | 10–49 |
| Low | < 10 |

**Area extraction** — scans tweet text against a 50+ Bangalore area name list (Koramangala, Whitefield, HSR Layout, etc.). Falls back to "Bangalore" if no match.

**Output sorted** by severity then engagement — highest-priority issues appear first.

**Limitation:** Keyword matching has no semantic understanding. It will match "HD Deve Gowda visits Cubbon Park" as a Parks issue. That's what the LLM filter fixes.

---

### 3. LLM Noise Filter — `scripts/filter_issues.py`

Uses **Claude API** (model: `claude-haiku-4-5`) to remove tweets that keyword matching incorrectly captures as civic issues.

**Problem it solves:**
Keyword matching is purely syntactic. Searches for "park" match politician visits to Cubbon Park. Searches for "BMTC" match awareness campaigns about mobile theft on buses. These are not civic complaints and should not appear in the dashboard.

**How it works:**

```
issues.json (all matched tweets)
    │
    ▼  batches of 20
Claude Haiku — system prompt (cached)
    "Is this tweet a genuine civic complaint
     a citizen is reporting for the government to fix?"
    │
    │  Response: ["yes","no","yes","yes","no", ...]
    ▼
kept → data/issues.json (overwritten)
removed → discarded (logged to console)
backup → data/issues_unfiltered.json (always saved first)
```

**Prompt caching:** The system prompt (classification rules) is sent with `cache_control: ephemeral`. After the first batch, every subsequent API call reuses the cached prompt — reducing cost by ~85% on a typical run.

**Batch size:** 20 tweets per API call. For 300 tweets → 15 API calls.

**Cost estimate:** ~$0.05–0.10 for a full 300-tweet dataset.

**Default on ambiguity:** If the API response is truncated or returns fewer lines than expected, the script keeps (not discards) the tweet. It's safer to show a borderline tweet than to silently drop a real issue.

**What gets removed (examples):**
- `[Parks]` "Ex-PM HD Devegowda visits mango and jackfruit exhibition at Cubbon park"
- `[Traffic]` "Kannadiga making others aware about illegal migrants stealing phones inside BMTC buses"
- `[Electricity]` "BESCOM declares 18% dividend to government" (financial news)
- `[Flooding]` "IMD issues yellow alert for Bangalore" (weather forecast, not a complaint)

**What stays:**
- `[Roads]` "Massive crater on 80 feet road Koramangala — been 3 weeks with no repair @BBMP_MAYOR"
- `[Water]` "BWSSB water supply cut for 48 hours in HSR Layout — no communication"
- `[Flooding]` "Ground floor completely waterlogged in BTM Layout. Drainage not working"

---

### 4. Data Storage — `data/issues.json`

Single JSON array committed to the repo. No database.

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
    "source_url": "https://twitter.com/i/web/status/1234567890",
    "keywords": ["pothole", "road"],
    "status": "open"
  }
]
```

**Capacity:** JSON flat-file works comfortably up to ~10,000 issues. Beyond that, migrate to SQLite.

**Fallback:** If `issues.json` doesn't exist, the dashboard automatically loads `data/sample_issues.json` (20 realistic mock issues). The dashboard always works.

---

### 5. Dashboard — `dashboard/`

Pure HTML + CSS + JavaScript. No build process. No server required. Works by opening `index.html` directly in a browser.

| File | Role |
|---|---|
| `index.html` | Page structure, loads CSS/JS, CDN links for Leaflet and Chart.js |
| `css/styles.css` | All styling — modern design, responsive, government-grade |
| `js/app.js` | All logic — data loading, rendering, filtering, chart, map, export |

**Dashboard features:**
- Issue cards (category, area, severity, engagement, status dropdown, tweet link)
- Summary stats row (total issues, high severity count, top category, most affected area)
- Category breakdown bar chart (Chart.js)
- Filters: category, severity, status, area, free-text search
- Status tracking per issue — Open / Acknowledged / In Progress / Resolved (stored in `localStorage`, no server needed)
- Issue clustering — group tweets about the same category+area, show count badge
- Map view — Leaflet.js + OpenStreetMap, coloured markers by severity, popup on click
- Department view — issues grouped by BBMP / BESCOM / BWSSB / BTP
- CSV export — downloads current filtered view as a spreadsheet

**External CDN dependencies:**
- [Leaflet.js 1.9.4](https://leafletjs.com/) — interactive map
- [Chart.js 4.4.0](https://www.chartjs.org/) — bar chart
- OpenStreetMap tiles — map background (free, no API key)

---

## Data Pipeline — End to End

```
Step                  Script                  Input               Output
─────────────────────────────────────────────────────────────────────────────
1. Fetch              fetch_tweets.py         Twitter API         raw_tweets.json
2. Categorize         process_issues.py       raw_tweets.json     issues.json (noisy)
3. Filter (optional)  filter_issues.py        issues.json         issues.json (clean)
                                              → backup:           issues_unfiltered.json
4. Commit             git commit + push        issues.json         live on GitHub Pages
5. View               browser → index.html    issues.json         dashboard renders
```

Step 3 is optional but strongly recommended. Without it, keyword noise (political events, campaigns, news) appears in the dashboard.

---

## Deployment

### Local (for development and offline demos)
1. Clone the repo
2. Open `dashboard/index.html` in any browser — no setup needed

### GitHub Pages (live, shareable URL)
- Enabled at: `https://ishanfso.github.io/GovWatch/dashboard/`
- Serves directly from the `main` branch — no build step
- Data updates by committing a new `data/issues.json` and pushing

### Automated Refresh (on hold — cost control)
Auto-refresh via GitHub Actions is paused to avoid Twitter API charges.
When ready to enable:
```yaml
# .github/workflows/refresh.yml
schedule:
  - cron: '0 */6 * * *'   # Every 6 hours
steps:
  - run: python scripts/fetch_tweets.py
  - run: python scripts/process_issues.py
  - run: python scripts/filter_issues.py
  - run: git commit -am "Auto-refresh issues data" && git push
```

---

## Cost Analysis

| Service | Plan | Cost |
|---|---|---|
| Twitter API v2 | Basic (paid) — manual fetches only | ~$100/mo when fetching; $0 when paused |
| Anthropic / Claude API | Pay-as-you-go — Haiku model | ~$0.05–0.10 per filter run |
| GitHub repo + Pages | Free | $0 |
| Leaflet + OpenStreetMap | Free, no API key | $0 |
| Chart.js CDN | Free | $0 |
| **Current running cost** | Data fetched, no auto-refresh | **$0/month** |

**Cost strategy:** Fetch manually in batches (e.g., after major rain events or monthly) rather than continuous polling. Run the filter script after each fetch.

---

## Known Limitations

1. **7-day tweet history** — Twitter API Basic tier doesn't support historical search beyond 7 days
2. **English tweets only** — Kannada civic complaints not captured; translation step needed in future
3. **Manual refresh** — someone must run the pipeline (auto-refresh is paused for cost reasons)
4. **No auth** — dashboard is public; add authentication in a future phase if officials need privacy
5. **Area extraction is fuzzy** — tweets that don't name a specific Bangalore locality fall back to "Bangalore"
6. **LLM filter is not perfect** — borderline cases (e.g., news about a road cave-in) may be kept or removed inconsistently; the backup file allows manual recovery
