# GovWatch — Claude Code Context File

Every time you start a Claude Code session in this repository, read this file first.
It gives you full context so you never have to re-explain the project.

---

## What is GovWatch?

GovWatch is a civic intelligence dashboard for government officials in Bangalore, India.
It aggregates public complaints and civic issues posted on Twitter/X by citizens, then
presents them in a clean, actionable dashboard so officials can prioritize and respond.

**Current scope:** Bangalore only.
**Long-term vision:** Expand to all Indian cities.

---

## Who is the user?

The repository owner is a non-technical founder. They do not write code.
- All code must be built and maintained by Claude.
- All explanations must be in plain English.
- Every change must be documented in `docs/CHANGELOG.md`.
- Every file created must be logged in `docs/BUILD_LOG.md`.
- Future ideas must be tracked in `docs/ROADMAP.md`.

---

## Repository = Obsidian Vault

This GitHub repository is also an Obsidian vault on the owner's local machine.
- All documentation lives as `.md` files readable in Obsidian.
- The owner uses **GitHub Desktop** to pull changes after every push.
- Never break the markdown structure — Obsidian renders it.
- Internal links use `[[WikiLink]]` syntax only where appropriate for Obsidian notes.

---

## Project Structure

```
GovWatch/
├── CLAUDE.md                      ← You are here. Read first every session.
├── README.md                      ← Public-facing project description
├── .gitignore
├── docs/
│   ├── CHANGELOG.md               ← EVERY code change logged here (newest first)
│   ├── BUILD_LOG.md               ← Every file/feature built, with date
│   ├── ROADMAP.md                 ← Future features, prioritized
│   ├── ARCHITECTURE.md            ← System design and data flow
│   └── SETUP_GUIDE.md             ← Step-by-step setup for non-technical users
├── dashboard/
│   ├── index.html                 ← Main dashboard (single-page app)
│   ├── css/styles.css             ← All styling (modern design, responsive)
│   └── js/app.js                  ← Dashboard logic, reads issues.json
├── data/
│   ├── sample_issues.json         ← 20 mock issues (fallback when no real data)
│   ├── issues.json                ← Live filtered data (shown in dashboard)
│   ├── issues_unfiltered.json     ← Backup of all keyword-matched tweets pre-filter
│   ├── raw_tweets.json            ← Raw Twitter API output (all fetched tweets)
│   ├── filter_verdicts.json       ← Persistent LLM verdicts: {tweet_id: "yes"/"no"}
│   └── officials/                 ← Phase 5: Bangalore officials database (14 JSON files)
│       ├── wards.json             ← 369-ward map: councillor, MLA, MP, SWM, BESCOM, BWSSB, traffic per ward
│       ├── issue_routing.json     ← 10 issue types → first contact, CC, escalation chain, SLA
│       ├── escalation_chains.json ← 5-dept escalation ladders
│       ├── city_corp_contacts.json← 55 BBMP zone/division officers
│       ├── bbmp_directory.json    ← 428 BBMP email entries by section
│       ├── swm_se.json            ← 8 SWM zonal SEs
│       ├── swm_aee.json           ← 27 SWM AEEs
│       ├── swm_jhi.json           ← 198 ward-level SWM JHIs with mobile
│       ├── bescom_units.json      ← 484 BESCOM units: zone→circle→division→AEE/AE/JE
│       ├── bwssb_stations.json    ← 122 BWSSB service stations
│       ├── mlas.json              ← 36 Bangalore MLAs
│       ├── mps.json               ← 3 Bangalore MPs
│       ├── traffic_rti.json       ← 66 traffic PS contacts
│       └── area_ward_lookup.json  ← 28 dashboard areas → nearest ward name/number
└── scripts/
    ├── fetch_tweets.py            ← Pulls new tweets from Twitter/X (incremental)
    ├── process_issues.py          ← Categorizes and scores all raw tweets
    ├── filter_issues.py           ← LLM filter: removes non-civic noise (incremental)
    ├── requirements.txt           ← Python dependencies
    └── config.example.py          ← Config template — copy to config.py, never commit
```

---

## Tech Stack

| Layer | Tool | Cost | Why |
|---|---|---|---|
| Dashboard | Static HTML + Chart.js + Leaflet | Free | No server needed, works on GitHub Pages |
| Data storage | JSON files in repo | Free | Obsidian can also read/display JSON |
| Twitter data | Twitter API v2 **Basic (paid)** via Tweepy | ~$100/mo when fetching; $0 when paused | Free tier does not support search queries |
| LLM filtering | Anthropic Claude API (Haiku model) | ~$0.05–0.10 per filter run | Removes noise that keyword matching can't catch |
| Hosting | GitHub Pages | Free | Live at `https://ishanfso.github.io/GovWatch/dashboard/` |
| Automation | GitHub Actions | **On hold** — avoid API costs | Will revisit when budget allows |

---

## Data Pipeline

Run in this order after each fetch session:

```
python fetch_tweets.py       ← appends only new tweets (uses since_id, no double billing)
python process_issues.py     ← categorizes all raw tweets
python filter_issues.py      ← LLM-classifies only new tweets (skips already-known IDs)
```

Then commit `data/issues.json`, `data/raw_tweets.json`, `data/filter_verdicts.json` and push.

---

## Data Model

Each civic issue has this shape (in `data/issues.json`):

```json
{
  "id": "tweet_id",
  "text": "Original tweet text",
  "author": "@handle",
  "date": "2025-01-15T10:30:00Z",
  "category": "Roads",
  "area": "Koramangala",
  "severity": "high",
  "likes": 45,
  "retweets": 12,
  "source_url": "https://twitter.com/i/web/status/tweet_id",
  "keywords": ["pothole", "road", "broken"],
  "status": "open"
}
```

**Categories:** Roads, Water, Electricity, Waste, Parks, Traffic, Flooding, Other

**Severity:** high (≥50 engagement), medium (10–49), low (<10)

---

## Key Decisions Made

1. **Static dashboard over server-side app** — Zero hosting cost, GitHub Pages compatible.
2. **JSON file as database** — Enough for current scale, Obsidian can display it, no DB setup.
3. **Twitter API v2 Basic (paid)** — Free tier does not support search. Fetch manually; auto-refresh paused.
4. **Incremental fetch with `since_id`** — Twitter only returns tweets newer than last fetch; no double billing.
5. **LLM filtering (Claude Haiku)** — Keyword matching pulls in noise (politician visits, campaigns, news); LLM removes it cheaply with prompt caching.
6. **Persistent filter verdicts** — Once a tweet is classified, its verdict is stored; future runs never re-classify it.
7. **Obsidian-first docs** — All docs are markdown so the founder sees live project state in their vault.
8. **No frameworks (React/Vue/etc.)** — Vanilla JS keeps it simple and editable without build tools.
9. **Officials data as static JSON** — All 369-ward, multi-department contact data lives in `data/officials/`. Loaded lazily on first Officials tab visit; no server or database needed.
10. **Gmail compose URLs for all email** — All "Assign" and contact buttons open `mail.google.com` compose URLs (not `mailto:`), so clicking always opens Gmail in the browser.

---

## Twitter Search Queries (in fetch_tweets.py)

```
("bangalore" OR "bengaluru") (pothole OR "road damage" OR "road condition") lang:en -is:retweet
(#BangaloreRoads OR #BBMPRoads) -is:retweet
("bangalore" OR "bengaluru") (BWSSB OR "water supply" OR "water cut" OR "no water") lang:en -is:retweet
("bangalore" OR "bengaluru") (BESCOM OR "power cut" OR "power outage" OR "no electricity") lang:en -is:retweet
("bangalore" OR "bengaluru") (garbage OR "solid waste" OR "SWM" OR "dumping") lang:en -is:retweet
("bangalore" OR "bengaluru") (waterlogged OR flooding OR "storm drain" OR "rain water") lang:en -is:retweet
("bangalore" OR "bengaluru") (BBMP park OR "garden maintenance" OR Lalbagh OR Cubbon) lang:en -is:retweet
("bangalore" OR "bengaluru") ("traffic signal" OR "traffic jam" OR BMTC OR "road block") lang:en -is:retweet
@BBMP_MAYOR (complaint OR issue OR problem OR broken OR damaged) lang:en -is:retweet
```

---

## Session Start Checklist

When beginning any new Claude Code session:
1. Read this file (`CLAUDE.md`)
2. Read `docs/CHANGELOG.md` to see recent changes
3. Read `docs/ROADMAP.md` to understand what's planned next
4. Check `git log --oneline -5` to see recent commits
5. Then proceed with the user's request

---

## Rules for Claude in This Repo

- **Always** update `docs/CHANGELOG.md` after any code change
- **Always** update `docs/BUILD_LOG.md` when a new file is created
- **Always** commit with clear messages the founder can understand
- **Never** commit `config.py` (contains API keys)
- **Never** use complex frameworks without explaining to the user why
- **Never** leave half-finished features without a note in ROADMAP.md
- Keep all markdown files Obsidian-compatible

---

## Links

- GitHub Repo: `ishanfso/GovWatch`
- Live Dashboard: `https://ishanfso.github.io/GovWatch/dashboard/`
- Obsidian Vault: Local machine, synced via GitHub Desktop
