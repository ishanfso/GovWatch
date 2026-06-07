# GovWatch Dashboard Redesign

Sources reviewed:

- README: https://github.com/ishanfso/GovWatch
- Live dashboard: https://ishanfso.github.io/GovWatch/dashboard/
- Architecture, roadmap, build log, setup guide
- Theme/design system: `outputs/govwatch-wireframes/govwatch-design-system.md`
- Theme options: `outputs/govwatch-wireframes/theme-options.html`
- Current dashboard screenshots:
  - `outputs/govwatch-wireframes/dashboard-desktop.png`
  - `outputs/govwatch-wireframes/dashboard-mobile.png`

## Current Design Goal

This pass is focused on the platform's look, feel, and core UX.

The immediate question is not "what advanced data model should GovWatch have?" It is:

```text
Does this feel like a credible, attractive civic intelligence platform that officials and stakeholders can understand quickly?
```

## Product Read

GovWatch is a Bangalore civic intelligence dashboard that turns public civic complaints into an operational view for government officials.

The dashboard should optimize for:

1. What is urgent?
2. Who owns it?
3. What action should be taken?
4. What progress has been made?

## What Works Today

- The MVP is easy to run and demo.
- The current dashboard already has real functionality: filters, cards, charts, map, department view, status, CSV export.
- The system has useful ideas such as SLA, department ownership, and assignment.
- The data source and refresh model are clear enough for an MVP.

## Main UX Problems

### 1. The first screen feels analysis-first

The current dashboard starts with stats, a large chart, and a large filter panel. That makes it feel like a reporting dashboard.

GovWatch should feel more like a civic operations platform. The main object should be the work queue.

### 2. The issue cards become a long wall

The current card grid works for 20 sample issues, but the live dashboard becomes hard to scan. Cards are visually pleasant, but they make comparison difficult.

A queue/list layout is better for repeated official use because users can compare priority, department, SLA, status, and action quickly.

### 3. Filters are too prominent

Filters matter, but they should not dominate the page.

The design should lead with saved views:

- Urgent.
- Overdue.
- My department.
- Unassigned.
- Resolved.

Advanced filters can sit after that.

### 4. Status needs more credibility

Status is currently stored locally in the browser. That is fine for a demo, but the UI should avoid implying that this is shared official state until a backend exists.

Recommendation:

- Keep status in the wireframe.
- Make the visual design strong.
- In product notes, flag that real shared status requires backend/auth later.

### 5. The visual identity is too generic

The current white dashboard is formal and clean, but it could be more memorable. GovWatch has an opportunity to feel like a modern civic-tech product, not just a static admin page.

The new direction should keep credibility while adding more visual character through:

- A more intentional palette.
- Better type choices.
- Stronger active states.
- A clearer queue/detail composition.
- Better spacing and hierarchy.

## Recommended Information Architecture

Primary navigation:

- Queue
- Map
- Departments
- Analytics
- Reports

Remove "Coming Soon" from the main product nav. It is useful for demos, but it weakens the product surface.

## Proposed Desktop Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ GovWatch Bangalore             Live Data | Manual refresh | Export report     │
│ Civic intelligence queue for department action                                │
└──────────────────────────────────────────────────────────────────────────────┘

┌────────────┬────────────┬────────────┬────────────┬────────────────┐
│ 18 Overdue │ 7 High risk│ 24 New today│ 31 Unassigned│ 42 Resolved wk │
└────────────┴────────────┴────────────┴────────────┴────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ Saved views: [Urgent] [Overdue] [My Dept] [Unassigned] [Resolved]             │
│ Search...   Department v   Category v   SLA v                                 │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────┬───────────────────────────────┐
│ PRIORITY QUEUE                               │ SELECTED ISSUE                │
│ Sorted by SLA risk, urgency, recency          │                               │
│                                              │ Waste issue | BBMP            │
│ OVERDUE  Garbage not picked up for 2 weeks   │ "Garbage has not been..."     │
│ Waste | Bangalore | 2 related reports         │                               │
│ Owner: BBMP SWM | 15d old | Open             │ Impact: public health risk     │
│ [Assign]                                      │ Source: tweet + media          │
│                                              │ Related complaints: 2          │
│ HIGH     Stormwater drain flooding            │ Timeline: detected/classified  │
│ Flooding | Nayandahalli | media on source     │                               │
│ Owner: BBMP SWD | 4h SLA | Open              │ [Assign] [Add note]            │
│ [Acknowledge]                                 │ [Mark progress] [Open source]  │
└──────────────────────────────────────────────┴───────────────────────────────┘
```

## Proposed Mobile Wireframe

```text
GovWatch
Bangalore civic queue

[18 Overdue] [7 High risk]
[24 New]    [31 Unassigned]

[Urgent] [Overdue] [My Dept] [More]
Search complaint, area, source...

OVERDUE
Garbage not picked up for 2 weeks
Waste | Bangalore | BBMP SWM
15d old | 2 related reports
[Assign] [Open]

HIGH
Stormwater drain flooding
Flooding | Nayandahalli | BBMP SWD
[Acknowledge] [Open]

Selected issue opens as detail panel/drawer.
```

## Theme Options

See `theme-options.html` for side-by-side previews.

### Option 1: Civic Mint

Clean, official, and low-risk. Best for government adoption.

### Option 2: Bengaluru Sky

More attractive and demo-ready. Blue plus aqua gives trust without looking dull.

### Option 3: Public Ledger

Serious, warmer, and editorial. Best if GovWatch evolves into reports or public accountability.

Recommendation for the design phase: **Bengaluru Sky**.

## Component Direction

### Header

Keep compact. Show brand, city/context, data freshness, and export/report action.

### KPI Cards

Use five operational KPIs:

- Overdue SLA.
- High-risk open.
- New today.
- Unassigned.
- Resolved this week.

### Queue Rows

Rows should show:

- Priority.
- Complaint summary.
- Category and area.
- Department owner.
- SLA/age.
- Status.
- Primary action.

### Detail Panel

The detail panel should show:

- Full complaint text.
- Routing/department.
- Impact.
- SLA.
- Source/media.
- Related complaints.
- Timeline.
- Actions.

### Reports

Reports can later replace the current CSV-only export with cleaner one-page summaries for meetings.

## Suggestion For Ishan: Location Layer

The original dashboard already has basic location support: area extraction, area filter, approximate map coordinates, and a map tab.

Do not include a complex location-confidence or ward system in the current visual design.

However, this is worth Ishan reviewing as a future product/data roadmap item:

- Many live issues fall back to `"Bangalore"`, which reduces routing precision.
- Later, GovWatch could add area confidence, ward mapping, and a data-quality view.
- This should come after the core queue UX and visual identity are strong.

In short: location is important later, but it should not drive the current look-and-feel pass.

## Immediate Next Design Steps

1. Pick one of the three theme directions.
2. Apply it to the full dashboard wireframe.
3. Design the main Queue, Detail, Department, Map, and Analytics views in the same system.
4. Then decide which data/product additions belong in the next build phase.
