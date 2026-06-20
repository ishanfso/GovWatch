# Changelog

All changes to GovWatch are logged here, newest first.
Format: `[Date] - What changed and why`

---

## [2026-06-20] — Officials Tab: Ward Lookup Bug Fix (Bellandur → Pulakeshi Nagar)

### Fixed

**`dashboard/js/app.js` — Critical ward lookup mismatch**

- **Root cause**: `wards.json` has duplicate `ward_no` values (e.g., Bellandur, Chandranagara, and Pulakeshi Nagar all share ward_no 47). Building `wardNoLookup` by ward_no caused the last-processed ward to overwrite the others — so any area_ward_lookup entry pointing at ward_no 47 would return Pulakeshi Nagar regardless of what was selected.
- **Fix**: All six lookup sites that previously used `wardNoLookup[String(info.ward_no)]` for `area_ward_lookup` entries now use `wardLookup[info.ward_name.toLowerCase()]` first (name-based, always unique), falling back to `wardNoLookup` only if the name doesn't match.
- **Location detection**: `findBestWardMatch` now runs a direct substring pass against known area keys *before* trigram similarity — "Bellandur Lake" from Nominatim now correctly matches "Bellandur" instead of a wrong ward.
- Affected functions: `initWardSearch` (suggestion builder + click handler), `findBestWardMatch`, `findWardByArea` (two branches)

---

## [2026-06-20] — Officials Tab: Location Detection, Phone Links, All MLAs, Better Routing

### Fixed

**`dashboard/js/app.js` — Officials tab usability fixes**

- **Ward search suggestions now work**: searches all 369 wards by name + constituency, plus the 28 named areas from `area_ward_lookup.json`; shows "Ward 28 → Koramangala East" format so it's clear what you'll get; Enter key selects first result
- **Location detection**: new "Detect My Location" button uses `navigator.geolocation` + OpenStreetMap Nominatim reverse geocoding; finds the nearest ward via trigram similarity matching and shows its contact card automatically
- **Phone numbers are now clickable**: all phone numbers in ward cards, smart contacts, and org charts are `tel:` links — tap on mobile to call directly
- **All 36 MLAs shown**: removed `slice(0, 12)` cap from Political org chart; added live search/filter box to find MLA by name, constituency, or party
- **Smart routing fixed**: `getSmartContacts` now uses robust `findWardByArea()` — case-insensitive, partial-match, falls back from area lookup → ward name lookup; fixes the "generic inbox" problem where areas like "koramangala" didn't match "Koramangala"

**`dashboard/css/styles.css` — Officials tab styles**

- `.btn-detect-location` — green pill button with hover and disabled states
- `.ward-contact-phone` — green clickable tel: links with "T: " prefix
- `.sc-phone` — clickable phone in smart contacts
- `.org-contact-info` — phone links in org chart cards

---

## [2026-06-20] — Phase 5: Officials Intelligence + Smart Assignment

### Added

**`data/officials/` — 14 new JSON files (consolidated Bangalore officials database)**

Extracted from the `bengaluru_gov_watch_consolidated.xlsx` spreadsheet covering the full administrative structure of Bangalore:

- `wards.json` — 369-ward accountability map: councillor, MLA, MP, SWM JHI, BESCOM AEE, BWSSB AE, traffic PS per ward
- `issue_routing.json` — 10 civic issue types mapped to: first contact, CC list, escalation 1, escalation 2, political escalation, SLA target
- `escalation_chains.json` — 5-department escalation ladders (BBMP, BESCOM, BWSSB, Traffic Police, Political)
- `city_corp_contacts.json` — 55 BBMP city corporation zone/division officers with email
- `bbmp_directory.json` — 428 BBMP email directory entries by section and designation
- `swm_se.json` — 8 SWM Zonal Superintending Engineers
- `swm_aee.json` — 27 SWM AEEs by zone/division
- `swm_jhi.json` — 198 ward-level SWM Junior Health Inspectors with mobile numbers
- `bescom_units.json` — 484 BESCOM operational units: zone → circle → division → subdivision → AEE/AE/JE
- `bwssb_stations.json` — 122 BWSSB service stations: division → EE → subdivision → AEE → service station AE
- `mlas.json` — 36 Bangalore MLAs with party, phones, email
- `mps.json` — 3 Bangalore MPs with phones, email, assembly constituencies
- `traffic_rti.json` — 66 traffic police stations with PIO and FAA contacts
- `area_ward_lookup.json` — 28 dashboard area names fuzzy-matched to official ward names/numbers

**`dashboard/index.html` — Officials tab added**

New fifth tab in the main navigation with three sections:
- **Ward & Area Lookup**: search any Bangalore area → see every responsible official (SWM, BESCOM, BWSSB, Traffic, Councillor, MLA, MP) in a colour-coded grid card
- **Department Org Charts**: click any of 5 departments → graphical escalation ladder showing who to contact at each level and why
- **Issue Routing Guide**: 10 civic issue types → first contact, CC, escalation chain, SLA target, notes

**`dashboard/css/styles.css` — Officials UI components**

~330 lines of new styles: ward card grid, org chart levels, routing cards with coloured badges (first/cc/escalation/political), ward search suggestions, smart contact rows in detail panel.

**`dashboard/js/app.js` — Officials intelligence logic**

- `initOfficials()` — lazy-loads all 13 officials JSON files in parallel on first Officials tab visit
- `initWardSearch()` — live fuzzy search with auto-suggestions, ward card on select
- `renderWardCard(ward)` — 8-cell grid showing every responsible contact for a ward with Gmail compose buttons
- `renderOrgChart(dept)` — escalation chain view for BBMP, BESCOM, BWSSB, Traffic Police, Political
- `renderRoutingGuide()` — 2-column grid of all 10 routing cards
- `getSmartContacts(issue)` / `renderSmartContactsHTML(issue)` — in detail panel: shows named ward-specific officials for the selected issue's area + category
- `buildSmartEmailLink(contacts, issue)` — Gmail compose URL pre-filled with To (first contact), CC (all others), subject and body with issue details

---

## [2026-06-20] — Assign Button Opens Gmail in Browser

### Fixed

**`dashboard/js/app.js` — `buildEmailLink`**

Changed the Assign button from a `mailto:` link (which opens Apple Mail or whatever the OS default is) to a Gmail web compose URL (`https://mail.google.com/mail/?view=cm&...`). Now clicking Assign always opens a pre-filled Gmail draft in the browser — no desktop mail app involved.

---

## [2026-06-20] — Restore Date Filters + Sort Control

### Added

**`dashboard/index.html` + `dashboard/js/app.js` — date filtering and sort restored**

- **Date preset dropdown**: All Time / Last 24 Hours / Last 7 Days / Last 30 Days / This Month / Custom Range
- **Custom date range**: From and To date inputs appear inline when "Custom Range" is selected
- **Sort control** in queue header: Priority (overdue → severity → engagement), Newest First, Oldest First, Severity
- Reset Filters clears date and sort back to defaults

---

## [2026-06-20] — Dashboard Redesign: Public Ledger Theme (Option 3)

### Changed

**`dashboard/index.html` — full layout restructure**

Complete rewrite from a report-style card grid to a civic operations queue:

- **Header**: Dark forest-green (`#1f4d3a`) brand bar with Source Serif 4 wordmark, data freshness badge, and Export CSV button
- **KPI row**: 5 operational cards — Overdue SLA, High Risk Open, New Today, Unassigned, Resolved This Week (replaces old 4-stat row)
- **Saved views toolbar**: Chips for All / Urgent / Overdue / Unassigned / Resolved (replaces prominent filter sidebar)
- **Filter bar**: Compact inline dropdowns (Department, Category, Area) + search field
- **Tab navigation**: Queue · Map · Departments · Analytics (removed "Coming Soon" from main nav)
- **Queue + Detail layout**: Two-column — left is a priority-sorted row list, right is a sticky detail panel for the selected issue
- **Analytics tab**: Bar chart (moved from always-visible) + severity breakdown bars + SLA performance table by department

**`dashboard/css/styles.css` — Public Ledger design system**

Complete rewrite using the Option 3 "Public Ledger" palette:

- **Background**: `#f8f5ef` warm document canvas
- **Panels**: `#fffdf8` warm off-white surfaces
- **Brand/action**: `#1f4d3a` / `#31572c` deep forest green
- **Accent/danger**: `#9a3412` / `#991b1b` rust and deep red
- **Typography**: Source Sans 3 (body) + Source Serif 4 (headings, brand, KPI numbers)
- **Queue rows**: Coloured 4px left stripe per severity; priority/category/area/dept/SLA/age visible at a glance
- **Detail panel**: Sticky side panel with full complaint text, metadata grid, status selector, Assign button, source link
- **Analytics cards**: Severity bar chart, breakdown bars, SLA-by-department table

**`dashboard/js/app.js` — queue-first logic**

- Saved views filtering: Urgent (high + open), Overdue (SLA elapsed), Unassigned (open), Resolved
- Queue sorted: overdue first → severity → engagement
- Detail panel renders and updates on row click; status changes reflect immediately in queue dot and KPIs
- Analytics tab: severity breakdown + per-department SLA table
- All existing features preserved: status tracking (localStorage), CSV export, map, departments, clustering, email assign, role URL params

---

## [2026-05-20] — Stricter LLM Filter + Clean Design Overhaul

### Fixed

**`scripts/filter_issues.py` — tighter SYSTEM_PROMPT, verdict reset**

The filter was letting through news accounts reporting politician visits (HD Deve Gowda mango exhibition × 3), BMTC launch announcements, awareness campaigns, and service promotions. Root cause: the prompt said "any citizen reporting any civic problem" without explicitly excluding these account/content types.

Key changes:
- **Explicitly reject media/news accounts** — @ANI, journalism-style prose, links to articles
- **Explicitly reject politician visits** — even to BBMP/government spaces like parks
- **Explicitly reject government announcements** — scheme launches, new routes, work-in-progress/completed
- **Explicitly reject awareness campaigns and service promos** — phone theft awareness, free pickup offers, new app rollouts
- **Concrete examples in prompt** — Deve Gowda mango exhibition → NO, BMTC Volvo launch → NO, power cut complaint → YES
- **356 yes-verdicts reset** — all previously approved tweets re-classified from scratch with the new prompt on the next GitHub Actions run; 197 no-verdicts kept

### Changed

**`dashboard/css/styles.css` + `dashboard/index.html` — complete design overhaul**

Full rewrite to match the clean, minimal aesthetic of Claude artifacts.

- **Background**: white (#f9fafb) instead of gradient
- **Font**: Inter (via Google Fonts) for crisp, readable typography
- **Accent**: indigo (#6366f1) throughout — tags, active chips, links, stat numbers
- **Header**: white with 1px bottom border instead of dark navy-to-indigo gradient
- **Issue cards**: 3px left severity strip instead of gradient top bar; subtle 1px borders and light shadow
- **Tabs**: underline style (2px border-bottom) instead of pill/gradient buttons
- **All UI**: removed heavy gradients everywhere; clean flat surfaces with minimal shadows

---

## [2026-05-19] — Revised LLM Filter: Genuine Citizen Issues over Strict Actionability

### Changed

**`scripts/filter_issues.py` — SYSTEM_PROMPT and deduplication logic**

The filter now asks: "Did a real citizen experience a real civic problem?" rather than requiring a specific address before passing a tweet.

Key rule changes:
- **Vague location is now OK** — "power cut in Bangalore" with no street still passes. We will ask the user for location later via the Twitter clarification bot.
- **Billing and admin complaints now pass** — BESCOM billing disputes, wrong meter readings, portal failures are genuine citizen issues worth tracking as policy problems.
- **Same-author duplicates auto-rejected in Python** — before the LLM runs, tweets where the same @handle posted near-identical text (Jaccard >= 0.75) are deduplicated. Cheapest copy is kept, rest auto-marked "no" with zero LLM cost.
- **Different users reporting the same problem all pass** — each citizen's complaint is independent and each deserves acknowledgment.
- Author is now passed to the LLM in each batch so it can detect within-batch same-author duplicates too.

Still rejected: political commentary, city-level opinion rants, news articles, government progress updates, requests for new infrastructure, comparison posts, appreciation tweets, third-party aggregate reports.

**`data/filter_verdicts.json`** — verdicts reset for all 181 currently-kept tweets so the new prompt re-classifies them. Previously-rejected 268 tweets unchanged (no re-cost).

---

## [2026-05-19] — Actionable Dashboard: SLA, Email Routing, Role Views, Coming Soon

### Added

**Issue aging + SLA timers**
- Every issue card now shows relative age ("2d ago") instead of absolute date — hover for the full date
- SLA badge on each card showing remaining time or overdue amount, colour-coded: green (within TAT), amber (>75% elapsed), red (overdue)
- TAT by category: Electricity & Flooding = 4h, Water = 24h, Waste & Traffic = 48h, Roads & Other = 72h, Parks = 168h

**Assign & Email button (POC directory)**
- Each issue card has a 📧 Assign button that opens a pre-filled email to the right official
- POC directory maps every category to the correct department email: roads@bbmp.gov.in, swm@bbmp.gov.in, consumer.care@bescom.co.in, complaints@bwssb.org, traffic.blr@ksp.gov.in, and more
- Email body includes: category, area, severity, age, TAT deadline, tweet text, and source link

**Role-based URL views**
- Append `?role=bbmp`, `?role=bescom`, `?role=bwssb`, or `?role=btp` to the URL
- Dashboard filters to only that department's issues and shows a banner identifying the role
- Useful for sharing a direct link with a specific official

**Coming Soon tab**
- New tab showing 8 planned features: Multi-channel (Reddit/Facebook), Twitter clarification bot, Twitter close-loop, WhatsApp alerts, PDF reports, citizen portal, resolution analytics, city expansion

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
