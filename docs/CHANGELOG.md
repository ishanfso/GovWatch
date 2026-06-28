# Changelog

All changes to GovWatch are logged here, newest first.
Format: `[Date] - What changed and why`

---

## [2026-06-28] — Admin user management panel

### What changed

**Modified files:**
- `dashboard/index.html` — Added "Admin" tab button (hidden for non-admins) and empty admin tab content div.
- `dashboard/js/app.js` — Admin tab now visible only when `window._userRole === "admin"`. Added `renderAdminTab()` which fetches all user profiles from Supabase, shows stats (total/pending/viewer/admin), a "Pending Approval" section with Approve buttons, and an All Users table with per-row role controls (Approve · Suspend · Make Admin · Demote). Actions write to the `profiles` table and re-render on success.
- `dashboard/css/styles.css` — Added admin panel styles: stat cards, section headers, user table, role pills (color-coded by role), and all action button variants.
- `scripts/supabase_schema.sql` — Changed default role from `viewer` to `pending` (new signups require approval). Added `admin update any profile` RLS policy so admins can change other users' roles. Added incremental SQL block for existing installations.

### Why
Previously, approving users required logging into Supabase directly and running SQL. Admins can now manage all users inside the dashboard — see pending signups, approve or suspend access, promote/demote roles — without leaving the app.

### One-time Supabase action required
Run the incremental SQL block at the bottom of `scripts/supabase_schema.sql` in Supabase SQL Editor to add the new RLS policy.

---

## [2026-06-23] — Supabase auth + landing page + migrate localStorage to shared state

### What changed

**New files:**
- `index.html` — Full landing page replacing the old redirect. Shows city selector (Bangalore active, 5 cities coming soon), Google OAuth button, and email/password sign-in/sign-up form with toggle. Supabase handles auth.
- `js/supabase-client.js` — Shared Supabase client (URL + anon key placeholders). Used by both landing page and dashboard.
- `js/landing.js` — Landing page auth logic: session check on load, Google OAuth redirect, email sign-in/sign-up form handling, toggle between sign-in and sign-up modes.
- `css/landing.css` — Dark landing page styles matching dashboard palette (`#0d1117` background, `#2d6a4f` green accent, responsive 3→2→1 city grid).
- `scripts/supabase_schema.sql` — Complete SQL to run in Supabase SQL Editor. Creates `profiles`, `issue_actions`, and `issue_comments` tables with RLS policies and a realtime publication on `issue_actions`.

**Modified files:**
- `dashboard/index.html` — Added Supabase CDN + client script + auth guard (redirects to `/` if no session). Updated CSP to allow `*.supabase.co` in connect-src. Added `header-user` div with user email display and Sign Out button.
- `dashboard/js/app.js` — Replaced `localStorage`-based `getStatus`/`setStatus`/`getAssignment`/`setAssignment` with Supabase-backed equivalents that read from an in-memory `issueStateCache` (fast, synchronous) and write to `issue_actions` table. Added `loadIssueStates()` which fetches all rows at startup and subscribes to a Postgres realtime channel so status changes sync live across all users. Added user email display and sign-out wiring in `init()`.

### Why
Issue status and assignments were stored in each user's browser (`localStorage`). This meant one official couldn't see another's updates. Supabase gives a shared, real-time state that all logged-in users see immediately — no page refresh needed.

---

## [2026-06-22] — Expand area detection: Bangalore-tagged issues drop from 78% to 40%

### What changed

**`scripts/process_issues.py`**

Root cause fixed: `BANGALORE_AREAS` previously had ~50 hardcoded entries. Most tweets mentioned "Bangalore" generically so 625/799 issues fell through to the default "Bangalore" tag.

- `MANUAL_AREA_ALIASES`: Expanded to ~60 manually curated entries (was ~50)
- `_build_area_list()`: New startup function that merges ward names from `wards.json` (369 entries) + BESCOM unit names from `bescom_units.json` (484 entries) with the manual aliases, filtering entries shorter than 4 characters and sorting longest-first so specific names ("BTM Layout") match before short sub-strings ("BTM")
- `PINCODE_AREA`: New dict mapping 74 Bangalore pincodes (560001–560104) to canonical area names as a fallback for tweets that include a postcode but no area name
- `extract_area()`: Updated to try name match → pincode regex → "Bangalore" fallback (was name-only → fallback)

**Result**: Issues with a specific area tag rose from 174/799 (22%) to 476/799 (60%). "Bangalore"-tagged count fell from 625 to 323. The 323 remaining are genuinely location-unspecific tweets.

---

## [2026-06-21] — WhatsApp message generator + Ward heat map

### What changed

**`dashboard/js/app.js`**

`whatsappUrl(issue)`: Generates a `wa.me/?text=` link with a pre-formatted WhatsApp message for any issue. Format includes severity emoji, category, area, department, reported date, tweet snippet (200 chars), and the original tweet URL. Opens WhatsApp (web or app) with the message pre-filled — no typing needed.

`renderWardHeatMap(issues)`: Renders a colour-coded tile grid in the Analytics tab showing every area's open issue intensity. Scoring: each high-severity issue = 3 pts, each overdue SLA issue = 2 pts, each open issue = 1 pt. Tiles are coloured in 5 tiers (none → low → medium → high → critical). Clicking any tile switches to the Queue tab with that area pre-filtered.

**`dashboard/index.html`**
- Added WhatsApp button (`btn-whatsapp`) in the detail pane action bar alongside the existing Raise/Email and tweet buttons
- Added "Area Heat Map" analytics card at the top of the Analytics tab (wide card) with legend + `ward-heatmap` grid container

**`dashboard/css/styles.css`**
- `.btn-whatsapp`: green-tinted action button matching app button family
- `.heatmap-grid`, `.heatmap-tile`: responsive tile grid with 5 colour tiers (tile-none / tile-low / tile-medium / tile-high / tile-critical)
- `.hm-area`, `.hm-count`, `.hm-sub`, `.hm-high`, `.hm-overdue`: tile content styles

---

## [2026-06-21] — Directory tab: visual org hierarchy + slide-in profile drawer

### What changed

**`dashboard/js/app.js`**
- Replaced broken dropdown cascade (dept → zone → name selects) with a fully visual org hierarchy system
- New `renderDirectoryOrg(dept)` dispatches to per-dept renderers based on active dept chip
- `renderBBMPOrg()`: groups city corp contacts by corporation, zone cards expand to officer grid
- `renderSWMOrg()`: zone cards show SE name + AEE count; expanding shows SE head card + AEE person grid
- `renderBESCOMOrg()`: zone cards → AEEs grouped by circle within each zone sub-panel
- `renderBWSSBOrg()`: division cards → AEE person grid with subdivision info
- `renderTrafficOrg()`: flat grid of all traffic PS cards (all 66 PIOs)
- `renderPoliticalOrg()`: MP cards → MLA grid grouped under each MP's assemblies
- `dirPersonCard()` / `dirHeadCard()`: shared helper functions for consistent person card and zone head card rendering
- `openDirectoryProfile(entry)`: replaced inline `showDirectoryProfile` with a slide-in drawer — overlays from the right, dims the background, close with × or click outside
- `wireDirectorySearch()`: fixed — uses `searchInput._dirWired` property instead of module-level `directoryWired` boolean (which prevented re-init if first call had empty index)
- `renderDirectoryDeptChips()`: wires dept chip clicks and keeps chip highlight in sync with `dirActiveDept`
- `DEPT_COLORS` + `getDeptColor()`: consistent colour per dept used for avatars and badges
- `normZone()`: normalises SWM zone names ("Yelhanka Zone" vs "Yelhanka") for correct SE↔AEE matching

**`dashboard/index.html`**
- Replaced 3 cascading selects with dept chip strip + `dir-org-wrap` container
- Added `dir-profile-overlay` / `dir-profile-drawer` divs for the slide-in profile panel

**`dashboard/css/styles.css`**
- Complete CSS rewrite for Directory tab: dept chips, zone card grid, sub-panel, person card grid, head card, slide-in drawer with sticky header

---

## [2026-06-21] — Fix location detection accuracy

### What changed

**`dashboard/js/app.js`** — `detectNearestWard()`

Root cause: `getCurrentPosition` was called without `enableHighAccuracy: true`, so the browser used WiFi/cell-tower triangulation (which can be 2–10 km off in Bangalore) instead of device GPS.

Fixes applied:
- Added `enableHighAccuracy: true` — forces GPS chipset instead of network triangulation
- Added `maximumAge: 0` — never use a cached/stale position reading
- Increased `timeout` from 10 s to 15 s — GPS needs more time to acquire a fix, especially indoors
- Added `zoom=16` to the Nominatim reverse geocode request — returns neighbourhood-level address (was defaulting to city level)
- Added `addr.hamlet` to the candidate list (catches some Bangalore micro-areas not tagged as suburb/neighbourhood)
- If GPS accuracy is worse than 300 m, shows a note warning the result may be approximate
- Improved error messages: distinct text for "permission denied" vs "GPS timeout" vs "unavailable"

---

## [2026-06-21] — Design consistency fixes: ward cells and smart contacts

### What changed

**`dashboard/css/styles.css`**

Ward card cells (`.ward-dept-cell`):
- Changed to `display: flex; flex-direction: column` — consistent vertical stacking
- Set `min-height: 100px` so empty cells still match their row
- Added `margin-top: auto` on `.ward-dept-cell .ward-email-btn` — email button always anchors to the bottom of its cell regardless of how much content is above it
- `.ward-contact-name`: added `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` — names truncate to one line instead of wrapping unpredictably (still clickable; full name appears in the profile modal)
- `.ward-contact-detail` and `.ward-contact-phone`: same single-line truncation

Smart contacts panel (`.smart-contact-row`):
- Completely restructured from a single flat flex row (badge | role | name | phone | email | raise) to a two-line card layout:
  - **Line 1**: badge + official name (name is now the primary, prominent element)
  - **Line 2**: role/detail · phone · Email · Raise button
- This means phone, email, and "Raise to" always appear at the exact same vertical position regardless of name or role length — eliminates the misalignment
- `.smart-contacts` container now uses `gap: 0` with a single shared border + bottom separators per row (cleaner than individual bordered cards)
- `.sc-name`: promoted to `font-size: .84rem; font-weight: 600` (was `.72rem` muted) — name is the primary identifier
- `.sc-role`: demoted to `.71rem; color: muted` with ellipsis truncation
- Removed old `/* Design fixes */` band-aid block (now baked into the core styles)

**`dashboard/js/app.js`**

- `renderSmartContactsHTML`: updated contact row HTML to match the new two-line structure (`sc-top-row` + `sc-sub-row`)
- `renderWardCard` (MLA cell): `ward.mla_phones` now shows only the first phone number (first segment before `;`) — MLA phone strings contain 3–5 numbers separated by semicolons which caused extreme cell width
- `renderWardCard` (MP cell): same fix for `ward.mp_phones`

---

## [2026-06-21] — Officials Directory tab

### What changed

**`dashboard/js/app.js`**
- Added new **"Directory"** tab — a standalone searchable officials directory separate from the Officials tab
- `buildOfficialIndex()`: flattens all 7 officials data sources into a single searchable list (~800+ entries): SWM AEE, SWM SE, BESCOM AEE, BWSSB AEE, BWSSB AE, Traffic PIO, City Corp officers, MLAs, MPs, Ward Councillors, SWM JHI. Deduplicates entries within each category
- `initDirectory()`: async init — loads officials data if not yet loaded, then builds the index
- `wireDirectoryUI()`: attaches all event listeners once (guarded by `directoryWired` flag). Powers the search autocomplete and the cascading dept → zone → name dropdowns
- `showDirectoryProfile(entry)`: renders the selected official's full profile card inline — contact details, issues assigned to them (from localStorage), date each was raised, current status (editable), and Raised / Active / Resolved stats
- Refactored `initOfficials()` to use a stored `officialsLoadPromise` (replaces `officialsLoading` boolean). Multiple callers (Officials tab + Directory tab) can now safely `await` the same load without double-fetching or race conditions
- Added null guards on DOM access inside `initOfficials()` so it works even if the Officials tab is not currently visible
- `switchTab()` now calls `initDirectory()` when switching to the directory tab

**`dashboard/index.html`**
- Added "Directory" tab button in the nav (between Analytics and Officials)
- Added Directory tab content: search input with autocomplete, 3 cascading selects (department → zone/area → name), profile area

**`dashboard/css/styles.css`**
- Added all Directory tab styles: `.dir-search-wrap`, `.dir-suggestions`, `.dir-suggestion-item`, `.dir-sug-name`, `.dir-sug-meta`, `.dir-browse-label`, `.dir-cascade`, `.dir-profile`, `.dir-profile-card`, `.dir-stats`, `.dir-stat`, `.dir-issue-row`, `.dir-issue-meta`, `.dir-issue-text`, `.dir-issue-actions`, `.dir-assigned-date`

---

## [2026-06-20] — Custom domain + public web app hardening

### What changed

**`CNAME`** (NEW)
- Tells GitHub Pages to serve the site at `civicissue.in`
- After pushing: go to repo Settings → Pages → Custom domain → enter `civicissue.in` → Save → enable Enforce HTTPS
- Also add 4 DNS A records at your registrar pointing `@` to `185.199.108.153`, `.109`, `.110`, `.111`

**`index.html`** (root, NEW)
- Instant redirect from `civicissue.in/` → `civicissue.in/dashboard/`
- Uses both `<meta http-equiv="refresh">` and `window.location.replace` for maximum compatibility

**`404.html`** (NEW)
- Custom 404 page that auto-redirects back to the dashboard after 3 seconds

**`dashboard/index.html`**
- Improved `<title>` for SEO
- Full Open Graph meta tags (og:title, og:description, og:image, og:url) for WhatsApp/Twitter/LinkedIn previews
- Twitter card meta tags
- `X-Content-Type-Options: nosniff` meta header
- `Content-Security-Policy` meta tag: restricts scripts/styles/images/fonts/connections to known safe origins; blocks framing (`frame-ancestors 'none'`)
- Public disclaimer bar at top: "independent civic monitoring platform, not an official government portal" with dismiss button

**`dashboard/css/styles.css`**
- `.disclaimer-bar`, `.disclaimer-close` styles (amber info strip, dismissible)

---

## [2026-06-20] — Analytics raised-to tracker + Officials area auto-populate + Full ward hierarchy

### What changed

**`dashboard/index.html`**
- New analytics card: "Requests Raised to Officials" — tracks every issue raised to a specific person

**`dashboard/css/styles.css`**
- `.raised-to-list`, `.raised-to-row`: analytics card styles for raised-to breakdown
- `.ward-hierarchy`, `.ward-hier-*`: full escalation chain section below every ward card; ward-level official highlighted in green

**`dashboard/js/app.js`**
- **Analytics — Raised to Officials**: `renderRaisedToBreakdown()` scans all issues for localStorage assignments, groups by person name, shows ranked list with clickable names (opens their profile)
- **Area filter → auto-populate ward**: `autoShowWardFromFilter()` — when an area filter is active (e.g. "Bellandur") and you open the Officials tab, the ward card for that area auto-renders; clears when filter is reset
- **`applyFilters()` and `initOfficials()` updated** to call `autoShowWardFromFilter()` so the ward card is always in sync with the active filter
- **Full ward hierarchy**: `buildWardHierarchyHTML(ward)` builds a 3-column escalation grid below every ward card:
  - **Waste/SWM**: Ward JHI → AEE → Zonal SE (looked up from `swm_aee.json`/`swm_se.json`) → Commissioner SWM
  - **BESCOM**: Ward AEE → Division EE → Circle → Zone → BESCOM CEO
  - **BWSSB**: Ward AE → AEE → Division EE (looked up from `bwssb_stations.json`) → BWSSB Chairman
  - **Traffic**: Police Station → PIO → DCP Traffic
  - **Roads/City Corp**: City Commissioner → Zonal Commissioner → BBMP Commissioner
  - **Political**: Councillor → MLA → MP
- All names in hierarchy are clickable (`official-name-link`) to open the official's profile
- Helper lookups: `findSwmSeForWard()`, `findBwssbEeForWard()`, `findBescomChainForWard()`

---

## [2026-06-20] — Rebrand to Civic Issue India + Assignment system + Official profiles + Resolve flow + Design fixes

### What changed

**`dashboard/index.html`**
- Rebranded: title, brand name, brand context, and footer now say "Civic Issue India"
- New SVG logo: government building (pediment + 3 columns + base) with red alert circle
- Added Official Profile modal overlay (click any official name to open)
- Added Resolve Tweet modal overlay (appears when marking an issue resolved)

**`dashboard/css/styles.css`**
- `.official-name-link`: clickable official names across the whole app (dotted underline)
- `.sc-raise-btn` / `.sc-raise-btn.active`: "Raise to" assignment buttons, green when assigned
- `.q-assigned-badge`: small green badge in queue rows showing who an issue is assigned to
- Full Official Profile modal styles: avatar, name, role, profile sections, per-issue status dropdowns
- Resolve Tweet modal styles
- `.routing-ward-context`, `.routing-contact-person`: filter-aware routing guide styles
- Design fixes: `min-height` on smart contact rows and ward dept cells to prevent layout thrash

**`dashboard/js/app.js`**
- **Rebrand**: all email subjects, tweet hashtag, CSV filename, and email footers updated to "Civic Issue India" (removed dashboard link from emails)
- **Copy change**: "Assign" → "Raise to", "Assign to BESCOM" → "Raise Issue" throughout
- **Assignment system**: `getAssignment(id)` / `setAssignment(id, contact)` using localStorage; "Raise to" button in detail panel assigns an issue to a specific contact; shows green when assigned
- **Official profiles**: `openOfficialProfile(official)` — modal showing avatar, role, all issues assigned to that person; status can be changed from the profile
- **Resolve flow**: `showResolveModal(issue)` — when marking resolved from any status dropdown or button, shows a pre-drafted tweet reply the user can copy to post on the original complaint
- **Clickable names everywhere**: `renderSmartContactsHTML`, `renderWardCard` (SWM JHI, BESCOM AEE, BWSSB AE, City Commissioner, Councillor, MLA, MP) all wrap names in `.official-name-link` spans
- **Filter-aware routing guide**: `renderRoutingGuide()` now looks up the ward matching the active area filter and shows actual people's names (clickable) for each routing category
- **Filter-aware Officials dept chips**: switching to Officials tab or changing filters auto-selects the matching dept chip (BBMP/BESCOM/BWSSB/Traffic Police)

**`.gitignore`**
- Added `.claude/` to prevent committing Claude session files

---

## [2026-06-20] — Fix Bangalore fallback showing wrong ward; LLM-retry geocoder

### What changed

**Root cause**: `area_ward_lookup.json` contained `"Bangalore": {"ward_name": "Bagalagunte"}` — a bad trigram match that caused every issue with `area: "Bangalore"` to resolve to Bagalagunte ward (BBMP West Zone) and show its ward councillor/BESCOM/SWM officers instead of city-level contacts.

**`data/officials/area_ward_lookup.json`**
- Removed the `"Bangalore" → Bagalagunte` entry entirely

**`dashboard/js/app.js`**
- `getSmartContacts()`: added early-exit for generic area strings (`"bangalore"`, `"bengaluru"`, `"blr"`, etc.) — immediately returns `CITY_LEVEL_CONTACTS` without any ward lookup
- `findWardByArea()`: added explicit null-return for `"bangalore"` / `"bengaluru"` / `"blr"` as a second layer of defence

**`scripts/retry_geocode.py`** (NEW — run locally)
- Reads all 66 failed geocodes from `data/geo_cache.json`
- Skips known-garbage entries (out-of-city places, LLM prompt fragments)
- For each real failure: first tries a direct retry with a tighter query (`"name, Bangalore Karnataka India"`), then asks Claude Haiku to generate 4 alternative spellings/transliterations, and tries each until Nominatim succeeds
- Saves successful results back into `geo_cache.json` under the original key
- After running, re-run `enrich_bescom_bwssb.py` to pick up the corrected geocodes
- Run: `python scripts/retry_geocode.py`

---

## [2026-06-20] — Fix MP assignments for all 369 wards + geo-based BESCOM/BWSSB enrichment script

### What changed

**`data/officials/mps.json`**
- Converted `assemblies` from semicolon-delimited string to proper JSON array — the old string format caused all MP assignment code to iterate characters instead of assembly names, leaving 138 wards with no MP
- Corrected assembly list for each MP to match exact constituency spellings used in `wards.json`
- Added missing assemblies: Yelahanka + Ganganagar (North), Rajarajeshwarinagar + Anekal (South)
- Fixed wrong entry: Pulakeshinagar was listed under North (wrong — it's Central); Yelahanka was missing

**`data/officials/wards.json`**
- Fixed MP assignment for all 369 wards (was missing for 138 wards — 37% of all wards)
- Root cause: `mps.json` assemblies was a string, not array; plus spelling mismatches between ward constituency field and MP assembly names (e.g. "Chamrajapet" vs "Chamarajpet", "Gandhinagara" vs "Gandhi Nagar", "Rajajinagar" vs "Rajaji Nagar", "Vijayanagar" vs "Vijay Nagar")
- Final coverage: 155 wards → South MP (Tejasvi Surya), 111 wards → North MP (Shobha Karandlaje), 103 wards → Central MP (P.C. Mohan)

**`scripts/fix_mp_assignments.py`** (NEW)
- One-time utility script — already run; no need to run again unless wards.json is reset
- Builds an ECI-verified mapping of every ward constituency spelling variant → correct Lok Sabha constituency
- Updates all wards in wards.json with correct `mp`, `mp_phones`, `mp_email`
- Also fixes `mps.json` in the same run

**`scripts/enrich_bescom_bwssb.py`** (NEW — run locally when needed)
- Geo-proximity script to verify and correct BESCOM/BWSSB assignments across all 369 wards
- Geocodes ward centroids + all BESCOM `om_unit` names + all BWSSB `service_station` names via Nominatim (OpenStreetMap, free)
- Assigns each ward to the nearest BESCOM unit and BWSSB station using Haversine distance
- Caches all geocodes in `data/geo_cache.json` so it can be interrupted and restarted
- Expected runtime: ~25–35 minutes (rate-limited to 1 req/sec per Nominatim policy)
- Run from project root: `python scripts/enrich_bescom_bwssb.py`

---

## [2026-06-20] — Fix Bangalore fallback contacts + smarter area extraction + analytics breakdowns

### What changed

**`dashboard/js/app.js`**
- **Bangalore fallback fix**: When an issue has no specific ward (`area: "Bangalore"`), the "Who to Contact" panel now shows city-level department heads (BBMP Commissioner, BESCOM CEO, BWSSB Chairman, DCP Traffic) instead of a random ward's officials. Added `CITY_LEVEL_CONTACTS` constant keyed by category.
- **Analytics — Top Areas**: New horizontal bar chart showing top 20 areas by issue count (only issues with a specific location, not "Bangalore")
- **Analytics — MLA Constituencies**: Breakdown list showing which MLA constituencies have the most issues
- **Analytics — MP Constituencies**: Breakdown list showing which MP constituencies have the most issues
- **Analytics — Corporation Zones**: Chip-style breakdown of issues by BBMP zone/corporation area
- Analytics breakdown charts re-render when officials data loads (was missing before)

**`scripts/filter_issues.py`** (major update)
- LLM call now returns **both verdict AND extracted area** in one JSON response — no extra API call needed
- New `SYSTEM_PROMPT` asks Claude Haiku to: (1) classify the tweet and (2) extract the specific locality
- Response format: `[{"verdict": "yes", "area": "K.Channasandra"}, ...]` — JSON array, one object per tweet
- Backward compatible: old `filter_verdicts.json` entries (plain "yes"/"no" strings) still work
- Newly classified issues get `area`, `ward_name`, `ward_no` set in-place before saving
- Back-fills area/ward for already-yes tweets when area data is now present in verdicts
- `BATCH_SIZE` reduced from 20 → 10 (JSON responses use more tokens)
- `filter_verdicts.json` now stores `{"verdict": "yes/no", "area": "locality or null"}` per tweet

**`dashboard/index.html`** — added 4 new analytics card sections

**`dashboard/css/styles.css`** — added `.chart-wrap-tall`, `.breakdown-list`, `.breakdown-row`, `.breakdown-chip`, and related styles for new analytics cards

---

## [2026-06-20] — Fix location mapping: correct ward → correct officials hierarchy

### Root cause
78% of issues (620/790) were tagged `area: "Bangalore"` because the keyword extractor only matched 44 hardcoded area names. The dashboard then mapped "Bangalore" → Bagalagunte ward → showed Bagalagunte BESCOM/SWM officials for every complaint with no specific area.

### What changed

**`scripts/enrich_locations.py`** (NEW — backfill + forward pipeline step)
- Uses Claude Haiku to extract the specific Bangalore locality from each tweet text
- Geocodes the locality → lat/lon via Nominatim (OpenStreetMap, free, rate-limited 1/sec)
- Reverse-geocodes to get neighbourhood/suburb candidates, then fuzzy-matches to the correct BBMP ward using trigram similarity
- Caches geocoding results in `data/geo_cache.json` so re-runs never pay twice
- Stores `area`, `lat`, `lon`, `ward_name`, `ward_no` on each issue
- Usage: `python enrich_locations.py --days 15` (backfill) or `python enrich_locations.py` (all Bangalore-tagged)

**`scripts/process_issues.py`** (updated)
- Now stores `ward_name` and `ward_no` on every new issue using a static area→ward lookup
- Only uses high-confidence mappings (match_score ≥ 0.8) from `area_ward_lookup.json`
- Skips the generic "Bangalore" → Bagalagunte mapping (match_score 0.6) — those need LLM enrichment
- New pipeline step for every fresh data run: `fetch → process → filter → enrich_locations`

**`scripts/requirements.txt`** — added `requests>=2.28.0` for Nominatim geocoding

**`data/issues.json`** (static backfill applied)
- 65 issues with high-confidence area names (Whitefield, Koramangala, HSR Layout, etc.) now have correct `ward_name` and `ward_no`
- Remaining ~725 issues still need `enrich_locations.py --all` to be run with API keys

**`dashboard/js/app.js`** — full escalation hierarchy in "Who to Contact"
- `getSmartContacts` now prefers `issue.ward_name` directly (from enrichment script) over fuzzy area lookup — much more accurate
- **Full hierarchy always shown**: dept-specific official → Ward Councillor → MLA → MP (Highest Authority)
- Previously only showed MLA when `mla_email` was set (most wards don't have this) — now shows MLA and MP always if the ward has them, with phone numbers
- New `highest` badge type (pink) for MP
- `badge-highest` CSS class added

---

## [2026-06-20] — Copy Tweet Reply button in complaint detail panel

### Added

**`dashboard/js/app.js`**

- New `buildTweetReply(issue)` function drafts a Twitter reply using the smart contact's name, role, and department — e.g. *"@citizen Hi! We've raised your roads concern in Koramangala with Rajesh Kumar, Ward Councillor (BBMP) and requested resolution within 72h. 🙏 #GovWatch #Bengaluru"*
- Falls back to generic department name if officials data isn't loaded yet
- Auto-trims to 280 characters if needed
- "Copy Tweet Reply" button in the detail panel copies text to clipboard and shows the draft inline so you can review before pasting
- Button flashes "✓ Copied!" for 2.5 seconds, then resets

**`dashboard/css/styles.css`**

- `.btn-copy-tweet` — Twitter-blue outlined button, green on copy success
- `.tweet-preview` — light blue card showing the drafted text inline

---

## [2026-06-20] — Fix: "Officials data loading" shown in complaint detail panel

### Fixed

**`dashboard/js/app.js`**

- Officials data now loads in the background at app startup (not just when the Officials tab is clicked), so smart contacts are ready when any complaint is opened
- If an issue detail panel is already open when officials finish loading, it automatically re-renders to show the real contacts instead of the placeholder
- The stale "Officials data loading..." message is replaced with a subtle "Loading contact info…" that self-resolves

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
