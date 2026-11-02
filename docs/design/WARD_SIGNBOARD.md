# Ward Signboard — design direction

Status: **proposed, awaiting approval** (2026-11-02). Not live yet.

![[ward-signboard-vision-board.png]]

## Idea
Borrow from what Bengaluru's civic world actually looks like: blue street-name boards with Kannada above English, BMTC amber bus displays, and yellow road markings. Made with the frontend-design skill to avoid the generic "AI-designed" look.

## Colour (each has one job)
| Name | Hex | Job |
|---|---|---|
| Chalk | `#EEF0EC` | Page background |
| Paper | `#FAFBF9` | Panels and lists |
| Asphalt | `#1B1F22` | Text and borders |
| Signboard blue | `#1D4F9C` (dark mode `#5B8DE0` for charts) | Brand, anything clickable, charts |
| Marking yellow | `#F4C400` | Past deadline only |
| Signal red | `#C8321E` | High severity only |

## Type
- Archivo at three widths: wide and heavy for headlines, normal for reading, narrow for numbers and data.
- Noto Sans Kannada for Kannada text.

## Rules
1. Square corners: no pills, no rounded cards, 2 px borders.
2. Colour is a signal, never decoration.
3. Plain sentences: sentence case, no slogans, no small uppercase labels above headings.
4. One loud thing per page (the signboard). No fade-in on every section.

## To check before launch
- Kannada text confirmed by a native reader: "ಬೆಂಗಳೂರು ನಾಗರಿಕ ದೂರುಗಳು" (Bengaluru civic complaints), "ಇಂದಿರಾನಗರ" (Indiranagar).
- Evokes official signage without copying any government logo; the "not an official portal" disclaimer stays.
