# Users, goals and flows

Written 2026-11-02. This is the product plan the site's structure is built from. When adding a feature, check which user and which flow it serves; if it serves none, it probably doesn't belong.

---

## The problem with the old dashboard

Six tabs (Queue, Map, Departments, Analytics, Directory, Officials) sat side by side with equal weight. They served three different people doing three different jobs, so nobody had a clear path:

- A resident with a broken streetlight landed on a queue of other people's complaints, with no way to report their own.
- "Directory" and "Officials" both listed people, in two different ways.
- "Departments" and "Analytics" both summarised the same numbers.
- The complaint filters stayed on screen even on tabs where they did nothing.

---

## Who uses it and what they want

| User | What they're trying to do | What success looks like |
|---|---|---|
| **Resident** with a problem | Get it fixed: know who is responsible and complain in the right place | Lodged on the official channel, with the right person named, in about two minutes |
| **Department staff** (BBMP/GBA, BESCOM, BWSSB, traffic police) | See what's pending for their department and act on the most urgent first | Open the site, filter to their department, work down the list |
| **Senior official or elected representative** | Understand where problems concentrate and which department is falling behind | A clear picture by corporation, ward, department and type, over time |
| **Observer**: journalist, researcher, civic group, recruiter | Understand the city's civic problems and cite numbers | Trustworthy figures, a map, export to CSV |

---

## Two places

The site is split into two places, each with one job.

```
Home
├── COMPLAINTS: what Bengaluru is reporting        (staff, senior officials, observers)
│   ├── List      all complaints, most urgent first; filter by department, type, area, date
│   ├── Map       the same complaints on a map
│   └── Insights  totals by department, corporation, ward, neighbourhood, type and week
│
└── REPORT A PROBLEM: get your own issue fixed      (residents)
    ├── Report    1 What's wrong → 2 Where → 3 Who's responsible → 4 Complain officially → 5 If it isn't fixed
    └── Find officials   look anyone up by ward or name; department structures
```

The same four links appear at the top of every page: **Complaints · Insights · Report a problem · Find officials**.

The two places link to each other where it helps:
- A complaint in the list has **"Who's responsible and how to complain"**, which opens Report a problem with the type and area already filled in.
- Report a problem shows **"Other complaints from this ward"**, which opens the list filtered to that ward.

---

## Flows

### Resident: report a problem
```
Home ─► Report a problem
  1. What's wrong?        pick one: Garbage · Road or footpath · Flooding or drain · Power · Water or sewage · Traffic · Mosquitoes or sanitation
  2. Where is it?         type a neighbourhood or ward → pick from suggestions
  3. Who's responsible    first contact (name, phone, email), then who to escalate to, then elected representatives
  4. Complain officially  edit the pre-written complaint → copy it → open the official app / call / WhatsApp / email
  5. If it isn't fixed    the expected response time, then the next person up, with their contact
```
Rule: the site never pretends to lodge the complaint itself. Official systems need the resident's own phone number and give them a complaint number, so the site hands over everything needed and tells them to keep that number.

### Department staff: work my department's list
```
Home ─► Complaints ─► Department: BESCOM ─► sorted most urgent first
  open a complaint → read it in full, see the ward and contacts → set status (acknowledged, in progress, resolved) → email the right person
```
Shortcut: `dashboard/?role=bescom` (also bbmp, bwssb, btp) opens straight into one department.

### Senior official: where are we failing?
```
Home ─► Insights
  headline numbers → complaints by department → by city corporation → by ward → by type → by week
  select any row → the list, filtered to it
```

### Observer: understand and cite
```
Home (summary, map, quotes) ─► Complaints (browse, search) ─► Insights ─► Download CSV
```

---

## Can we connect directly to the government complaint systems?

**Not as an automatic submission, today.** None of the official channels we found offers a public way for another website to lodge complaints:
- the GBA's Sahaaya app (garbage, roads, drains)
- BESCOM's 1912 helpline and WhatsApp (power)
- BWSSB's 1916 helpline (water)
- traffic police stations

These systems also tie each complaint to the citizen's own phone number, and they should: it's how the resident gets a complaint number and updates.

**What the site does instead (a "hand-off"):**
1. Works out the right channel for the problem type.
2. Writes the complaint for the resident, with type, location, ward and corporation, ready to edit and copy.
3. Opens the channel directly: the app store page for Sahaaya, tap-to-call 1912/1916, BESCOM WhatsApp with the text pre-filled, or a pre-filled email to the named ward official with the next person up copied in.
4. Shows who to escalate to, and when.

**Worth watching:** the Greater Bengaluru Authority is building a single-window grievance platform across agencies (reported as "Sahaaya Plus") and upgrading to Sahaaya 3.0. If it opens a partner interface, Report a problem could submit directly. Tracked in [[ROADMAP]].

Channel details live in `data/officials/official_channels.json` with a "last checked" date and a confidence note for each. Re-check them every few months.

---

## Information hierarchy rules

1. **One job per page.** Complaints answers "what's happening". Report a problem answers "what do I do about mine".
2. **Controls only where they work.** Complaint filters appear only on List, Map and Insights, never on Find officials.
3. **Most important first.** Every page opens with the one thing its user came for: the headline number, or step 1 of the report.
4. **Same words everywhere.** "Complaint", not issue/ticket/tweet. "Past deadline", not overdue/SLA breach.
5. **Every dead end has a next step.** No results → widen the filters. No named official in our data → use the official app and the commissioner.
