# Roadmap

Features planned for GovWatch, in priority order.
Each item moves to CHANGELOG.md when completed.

---

## Phase 1 — MVP (Current Sprint)

Goal: A working dashboard with sample data and the ability to pull real tweets.

- [x] Project structure and documentation setup
- [x] Sample data (20 mock Bangalore civic issues)
- [x] Static dashboard — category cards, filters, chart
- [x] Twitter fetch script (Tweepy, free tier)
- [x] Issue categorization script
- [ ] **GitHub Pages deployment** — host dashboard publicly so officials can open a URL
- [ ] **Twitter API key setup walkthrough** — guided setup in SETUP_GUIDE.md

---

## Phase 2 — Live Data (Next Sprint)

Goal: Dashboard auto-refreshes with real tweets, no manual running of scripts.

- [ ] **GitHub Actions workflow** — runs fetch_tweets.py every 6 hours, commits new issues.json
- [ ] **Data deduplication** — prevent same tweet showing twice across runs
- [ ] **Issue aging** — mark issues as "old" after 7 days without resolution
- [ ] **Ward/pin code mapping** — map areas to Bangalore's 198 wards for precise location
- [ ] **Google Maps embed** — show issue hotspot map (free tier, no API key needed for embed)

---

## Phase 3 — Official Dashboard Features

Goal: Features that make it genuinely useful for government officials.

- [ ] **Status tracking** — officials can mark issues as "Acknowledged", "In Progress", "Resolved"
- [ ] **Email digest** — daily summary email of top issues (use free tier of Resend or SendGrid)
- [ ] **Issue clustering** — group similar complaints from the same area (same pothole, multiple tweets)
- [ ] **Trend analysis** — "Roads complaints up 40% this week in Whitefield"
- [ ] **Export to PDF/CSV** — for offline reports and presentations
- [ ] **WhatsApp integration** — send issue alerts via WhatsApp Business API (low cost)

---

## Phase 4 — Scale to Other Cities

Goal: Expand beyond Bangalore.

- [ ] **City selector** — configurable keywords and areas for any Indian city
- [ ] **Multi-source data** — add Reddit (r/bangalore), Citizen app, 311-style portals
- [ ] **Department routing** — auto-route Roads issues to BBMP, Power to BESCOM, etc.
- [ ] **Official response tracking** — detect when govt accounts reply to complaints
- [ ] **Public portal** — citizens can verify if their issue was seen

---

## Parking Lot (Good Ideas, Not Prioritized Yet)

- AI-generated weekly brief (using Claude API)
- SMS alerts for ward councillors
- Sentiment analysis on issue urgency
- Integration with BBMP's existing complaint portal
- Mobile-optimized view for officials on the go
- Historical trend charts (month-over-month)
- Budget vs complaint heatmap (areas with high complaints, low budget allocation)

---

*Last updated: 2026-05-17*
