# GovWatch Theme & Design System

This version focuses on look, feel, and UX for the platform. Location confidence, ward mapping, and deeper routing intelligence are kept as future product suggestions rather than part of the current interface direction.

## Product Feel

GovWatch should feel like a modern civic operations product: credible enough for officials, approachable enough for demos, and sharper than a generic government dashboard.

The desired impression:

- Calm, useful, and trustworthy.
- Civic-tech, not bureaucratic.
- Operational, not purely analytical.
- Clean and premium enough for stakeholder demos.
- Dense enough to scan real data without becoming visually exhausting.

## UX Principles

1. **Action-first**: make the work queue the hero, not charts.
2. **Fast scanning**: every row should answer what happened, where, who owns it, and what to do.
3. **Progressive detail**: show a compact queue first; reveal full context in a side panel.
4. **Attractive restraint**: use color, contrast, and typography to create character without making the tool playful or noisy.
5. **Mobile as review mode**: mobile should support quick review, assignment, and source opening.

## Recommended Layout System

Primary navigation:

- Queue
- Map
- Departments
- Analytics
- Reports

Suggested first screen:

```text
Header
Operational KPIs
Saved views + filters
Priority queue + selected issue detail
```

Avoid putting "Coming Soon" in the main product navigation. It can live in a demo notes page or pitch appendix.

## Core Components

### Header

Contains:

- GovWatch brand.
- Short city/context subtitle.
- Data freshness.
- Export/report action.

The header should be compact and persistent.

### KPI Cards

Use:

- Overdue SLA.
- High-risk open.
- New today.
- Unassigned.
- Resolved this week.

KPI cards should be readable at a glance. Color only the number or a subtle accent, not the whole card.

### Saved Views

Saved views are workflow shortcuts:

- Urgent.
- Overdue.
- My department.
- Unassigned.
- Resolved.

These should feel like tabs/chips, not a complex filter builder.

### Issue Queue

Use rows instead of cards for the primary queue.

Recommended columns:

```text
Priority | Issue | Department | SLA | Status | Action
```

Each issue row should include:

- Category.
- Area.
- Related report count.
- Media/source indicator.
- Department owner.
- Primary action.

### Detail Panel

The selected issue panel should include:

- Full complaint text.
- Department routing.
- Impact summary.
- SLA state.
- Source/media availability.
- Related complaints.
- Assignment/status actions.

## Theme Option 1: Civic Mint

Best if GovWatch should feel clean, modern, and civic-tech.

| Token | Hex | Use |
|---|---:|---|
| Background | `#f5f7f8` | App canvas |
| Panel | `#ffffff` | Surfaces |
| Text | `#1d2735` | Primary text |
| Muted | `#667085` | Metadata |
| Brand | `#0f766e` | Identity, active states |
| Action | `#2563eb` | Links, secondary buttons |
| Danger | `#b42318` | Overdue |
| Warning | `#b54708` | Due soon / review |
| Success | `#067647` | Resolved/live |

Typography:

- Primary: Inter.
- Alternative: Manrope.
- Tone: crisp, practical, familiar.

Why choose it:

- Safest option for officials.
- Still more attractive than a plain white admin UI.
- Works well for dashboards, reports, and mobile.

## Theme Option 2: Bengaluru Sky

Best if GovWatch should feel fresher, more public-facing, and more memorable.

| Token | Hex | Use |
|---|---:|---|
| Background | `#eef7fb` | Soft city-sky canvas |
| Panel | `#ffffff` | Main content |
| Text | `#132238` | Primary text |
| Muted | `#5c6b7a` | Metadata |
| Brand | `#0b5cad` | Identity, active states |
| Accent | `#00a3a3` | Fresh civic accent |
| Highlight | `#f59e0b` | Attention |
| Danger | `#c2410c` | Overdue |

Typography:

- Primary: Manrope.
- Alternative: IBM Plex Sans.
- Tone: confident, modern, slightly more vibrant.

Why choose it:

- More visually attractive for demos.
- Blue feels institutional, teal keeps it contemporary.
- Good bridge between government credibility and civic startup energy.

## Theme Option 3: Public Ledger

Best if GovWatch should feel serious, editorial, and policy-grade.

| Token | Hex | Use |
|---|---:|---|
| Background | `#f8f5ef` | Warm document canvas |
| Panel | `#fffdf8` | Content surfaces |
| Text | `#202124` | Primary text |
| Muted | `#6f675d` | Metadata |
| Brand | `#1f4d3a` | Identity |
| Action | `#31572c` | Primary action |
| Accent | `#9a3412` | Important highlights |
| Danger | `#991b1b` | Overdue |

Typography:

- Primary: Source Sans 3 or system sans.
- Accent/headlines: Source Serif 4 or Georgia.
- Tone: civic report, newsroom, accountability tracker.

Why choose it:

- Feels less like SaaS and more like a serious civic intelligence product.
- Good for reports and public accountability pages.
- More distinctive than the usual blue-white dashboard.

## Recommendation

Use **Bengaluru Sky** if the priority is attractiveness and demo energy.

Use **Civic Mint** if the priority is official adoption and low-risk execution.

Use **Public Ledger** if GovWatch may become partly public-facing or report-driven.

My current pick: **Bengaluru Sky** for the pitch/design phase, then tune it slightly more restrained before official pilots.

## State Colors

State colors should stay consistent across all themes:

- Overdue: red/rust.
- High risk: amber/orange.
- Open: neutral.
- Acknowledged: blue.
- In progress: amber.
- Resolved: green.

Do not use state colors decoratively.

## Accessibility

- Do not rely on color alone; every state needs text.
- Keep body text at `14px` minimum.
- Keep touch targets at `40px` minimum on mobile.
- Preserve strong contrast for red/amber state labels.

## Future Suggestion For Ishan

The current dashboard already has basic area extraction and a map. A deeper location layer could be valuable later, but it should not drive the current visual design.

Suggestion for Ishan to evaluate later:

- Add confidence to extracted areas.
- Treat `"Bangalore"` fallback as low precision.
- Add ward mapping only after the core queue UX is strong.
- Consider a separate data-quality view for missing/ambiguous locations.

This should be discussed as a product/data roadmap item, not included in the current visual direction.
