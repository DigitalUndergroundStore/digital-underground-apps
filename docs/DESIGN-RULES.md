# Digital Underground design rules

All values live in `assets/design-tokens.css`. Use the variables; don't type raw colours or sizes.

**Scope:** Digital Underground pages only (store, free book, product pages `/p/*`, Developer Marketplace). Kerzy Labs games keep their own look and must not use DU branding or this file.

## Colour
- One palette: near-black background (`--du-bg`), dark cards (`--du-surface`), off-white text (`--du-text`), soft lilac-grey for secondary text (`--du-muted`).
- The brand gradient (`--du-gradient`, purple #6d28d9 to blue #1e3a8a) is for the **one** main action on a screen. Don't use it for decoration.
- Light blue (`--du-accent`) is for links, focus rings and "selected" states.
- Green (`--du-success`) only means "done / worked".
- Text must stay readable: light text on dark only. Muted text is for small print, never for buttons.

## Fonts
- Two fonts, nothing downloaded: **display** (`--du-font-display`, Inter if the device has it, otherwise the system font) for headings, and **body** (`--du-font-body`, system font) for everything else.

## Sizes
- Text uses the fixed scale only: 12, 14, 16, 18, 22, 30, and two large heading sizes (`--du-fs-3xl`, `--du-fs-4xl`) that grow with the screen.
- Body text is 16px. Nothing important below 14px.
- Spacing uses steps of 4, 8, 12, 16, 24, 32, 48, 64px.
- Corners: 10 / 14 / 20px, or fully round (pill) for buttons and chips.

## Buttons
- **Primary** (`.du-btn--primary`): gradient pill. One per section, for the main action (e.g. "Browse the store", "Buy").
- **Secondary** (`.du-btn--secondary`): dark pill with a light outline, for other actions (e.g. "Developer Marketplace").
- **Small** (`.du-btn--small`): smaller text, but still 48px tall.
- Every tap target is at least 48px tall. Every button shows a light-blue focus ring when you tab to it.

## Honesty
- Only real facts in trust signals (pay once, instant download, counted products). No made-up numbers, reviews or ratings.

## Accessibility
- Every page has one `<main>`, a heading, and labelled form controls (filters use a real `<select>` with a `<label>`).
