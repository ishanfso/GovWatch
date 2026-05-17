# GovWatch — Claude Code Context File

Every time you start a Claude Code session in this repository, read this file first.
It gives you full context so you never have to re-explain the project.

---

## What is GovWatch?

GovWatch is a civic intelligence dashboard for government officials in Bangalore, India.
It aggregates public complaints and civic issues posted on Twitter/X by citizens, then
presents them in a clean, actionable dashboard so officials can prioritize and respond.

**Phase 1 scope (MVP):** Bangalore only.
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
├── CLAUDE.md                   ← You are here. Read first every session.
├── README.md                   ← Public-facing project description
├── .gitignore
├── docs/
│   ├── CHANGELOG.md            ← EVERY code change logged here (newest first)
│   ├── BUILD_LOG.md            ← Every file/feature built, with date
│   ├── ROADMAP.md              ← Future features, prioritized
│   ├── ARCHITECTURE.md         ← System design and data flow
│   └── SETUP_GUIDE.md          ← Step-by-step setup for non-technical users
├── dashboard/
│   ├── index.html              ← Main dashboard (single-page app)
│   ├── css/styles.css          ← All styling
│   └── js/app.js               ← Dashboard logic, reads issues.json
├── data/
│   ├── sample_issues.json      ← Realistic mock data for MVP demos
│   └── issues.json             ← Live data (written by fetch script)
└── scripts/
    ├── fetch_tweets.py         ← Pulls civic tweets from Twitter/X
    ├── process_issues.py       ← Categorizes and scores issues
    ├── requirements.txt        ← Python dependencies
    └── config.example.py       ← Config template — copy to config.py, never commit config.py
```

---

## Tech Stack (MVP — zero or near-zero cost)

| Layer | Tool | Cost | Why |
|---|---|---|---|
| Dashboard | Static HTML + Tailwind CSS + Chart.js | Free | No server needed, works from file or GitHub Pages |
| Data storage | JSON files in repo | Free | Obsidian can also read/display JSON |
| Twitter data | Twitter API v2 free tier (Tweepy) | Free | 500k tweets/month read access |
| Hosting | GitHub Pages | Free | Auto-deploy from repo |
| Automation | GitHub Actions (optional) | Free tier | Run fetch script on schedule |

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
  "source_url": "https://twitter.com/...",
  "keywords": ["pothole", "road", "broken"],
  "status": "open"
}
```

**Categories used:** Roads, Water, Electricity, Waste, Parks, Traffic, Flooding, Other

**Severity logic:** high (>50 engagements), medium (10–50), low (<10)

---

## Key Decisions Made

1. **Static dashboard over server-side app** — Zero hosting cost, GitHub Pages compatible.
2. **JSON file as database** — Enough for MVP, Obsidian can display it, no DB setup needed.
3. **Twitter API free tier** — Real data without cost. Falls back to sample data if no API key.
4. **Obsidian-first docs** — All docs are markdown so the founder sees live project state in their vault.
5. **No frameworks (React/Vue/etc.)** — Vanilla JS keeps it simple and editable without build tools.

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

## Twitter Search Queries Used

These hashtags/keywords are searched to find Bangalore civic issues:

```
#BangaloreCivicIssues OR #BBMP OR #BangaloreRoads
"bangalore" (pothole OR flooding OR waterlogging)
"bangalore" (power cut OR electricity OR BESCOM)
"namma bengaluru" (complaint OR issue OR problem)
@BBMP_MAYOR OR @CMofKarnataka (complaint)
```

---

## Contact & Links

- GitHub Repo: `ishanfso/GovWatch`
- Obsidian Vault: Local machine, synced via GitHub Desktop
- Hosting: GitHub Pages at `https://ishanfso.github.io/GovWatch` (to be set up)
