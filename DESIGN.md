# Design

The look of the site, so new screens and components match. The theme (colours, fonts) lives in `src/recall-drill/recall-drill.css` (variables on `:root`, with a dark theme) and the other pages reuse it; Tailwind (`tailwind.config.js`) is used by the older single-test pages.

## Principles

- Minimal and modern on a beige/neutral page background: white panels with a thin border and small radius, one accent (teal), lots of space.
- Always use the theme variables (`--bg --panel --ink --mute --line --teal --teal-soft --amber --bad --bad-soft --r --font-head --font-body`), never hard-coded colours, so dark mode works.
- Headings use the header font (`--font-head`); body text is Inter (`--font-body`); IBM Plex Mono (`@fontsource/ibm-plex-mono`) is for code-like values such as the keyword lists.
- Controls that aren't being used look like plain text. They only show they are editable on hover (a soft rounded tint or a thin outline) and open up on click or focus; they never look like a form until touched.
- No animations for showing and hiding things (expanding cards, hover reveals); they are instant.

## Components

- **Secondary buttons** (`.subbtn`): for secondary or insignificant actions (Delete, New category, Up / Down, ...). A 16px icon plus a small (`0.8rem`) label, no border or background, a soft tint on hover. Destructive ones add `.danger` (red text, red tint). Bordered buttons (`button.primary`, the default `button`) are only for a screen's main action, such as Save or Random. Hide a button that has nothing to do (e.g. Up on the first item) rather than disabling it.
- **Segmented control** (`.segmented`, with `role="tablist"` and `button[role="tab"][aria-selected]`): a "slide" switch between a few modes: a tinted track with the selected option as a raised white panel. Used by Locate / Name / Learn in Dermatome Ninja and Manual / Agentic in the quiz editor.
- **Cards**: a screen with several groups puts each group in its own white card on the page background (`.qe-card`), with the group's title above the card in the header font, normal weight, black (`.qe-title`). Don't wrap the whole screen in one big panel.
- **Errors**: a red-outlined box (`.qe-error`) with an "Errors" label and the message, `role="alert"`.
- **Editable item card** (`components/ItemCard.jsx`): an item shows as plain text; hover tints it, clicking opens it into a white card with a bottom-bordered text line, a "Keywords" label (Inter, small) over a monospace box, and a red Delete at the bottom right. Long text wraps (`components/AutoArea.jsx`), it is never cut off. Reuse it when items are edited elsewhere.
- **Drag handles**: a `⋮⋮` on the left of a row with a large grab area; the hover tint covers only the text, not the handle. No handle while an item is open.
- **Icons**: 16px outline SVGs (`stroke="currentColor"`, width 2, round caps), e.g. `components/PencilIcon.jsx`.
- **Edit entry**: a pencil icon, not the word "Edit" (except inside menus). In a header next to other quiet icons (the star on a drill) it is a `.subbtn`; among bordered buttons (the playlist actions) it is a bordered `.iconbtn`.
