# Design

The look of the site, so new screens and components match. The theme (colours, fonts) lives in `src/recall-drill/recall-drill.css` (variables on `:root`, with a dark theme) and the other pages reuse it; Tailwind (`tailwind.config.js`) is used by the older single-test pages.

## Principles

- Minimal and modern on a beige/neutral page background: white panels with a thin border and small radius, one accent (teal), lots of space.
- Always use the theme variables (`--bg --panel --ink --mute --line --teal --teal-soft --amber --bad --bad-soft --r --font-head --font-body`), never hard-coded colours, so dark mode works.
- Headings use the header font (`--font-head`); body text is Inter (`--font-body`); IBM Plex Mono (`@fontsource/ibm-plex-mono`) is for code-like values such as the keyword lists.
- Controls that aren't being used look like plain text. They only show they are editable on hover (a soft rounded tint or a thin outline) and open up on click or focus; they never look like a form until touched.
- No animations for showing and hiding things (expanding cards, hover reveals); they are instant.

## Tokens

All sizes are in `rem` (1rem = 16px) unless written in px. Pick from these; don't invent in-between values.

| Role                               | Value                                                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Radius                             | `--r` = 5px (inputs, buttons, cards, menus). Tab slider track 10px, its tabs 7px.                                  |
| Page text                          | Inter, 16px, line-height 1.5                                                                                       |
| Section title (`.qe-title`)        | header font, 1.25rem, weight 400, black                                                                            |
| Page heading (`header h1`)         | header font, 1.5rem, weight 600                                                                                    |
| Item text, text fields, error text | 0.9rem                                                                                                             |
| Default button                     | 0.9rem, padding 8px 14px; main action (`.big button`) 0.95rem, padding 10px 16px                                   |
| Secondary button and menu entry    | 0.8rem                                                                                                             |
| Small label ("Keywords")           | Inter, 0.7rem, `--mute`                                                                                            |
| Code-like values (keywords)        | IBM Plex Mono, 0.8rem, `--mute`                                                                                    |
| Spacing steps                      | 2, 4, 6, 8, 14px. Gap between icon and label 6px; gap between stacked fields 4px; gap between cards or groups 8px. |
| Popover shadow                     | `0 6px 18px rgba(0, 0, 0, 0.14)`                                                                                   |
| Border                             | 1px solid `--line`                                                                                                 |

## Components

### Menus

The pop-up lists: the right-click menu (`.tilemenu`: "I got this", Ignore, Teach new keyword, Edit), the quiz popover (`.menu .mi`: Start from scratch, Redo incorrect, Star, Reset progress, Edit) and the account menu (`.acctmenu`). The "I got this" menu is the reference; every menu uses these numbers.

- Container: `--panel` background, 1px `--line` border, `--r` radius, popover shadow, padding 4px, minimum width 170px (account menu 150px). Entries stack with no gap between them.
- Entry: a `.subbtn` button, full width, left-aligned, no border, no wrapping. A 16px icon, then a 6px gap, then the 0.8rem label. Padding `6px 8px 6px 4px`: the distance from the menu edge to the icon (4px container + 4px) is about the same as from the icon to the text.
- Text is `--ink` (menus are for choosing, so no muted grey). Hover and keyboard focus tint the entry `--teal-soft`.
- Colour-coded entries colour both icon and text, and tint on hover with the matching `-soft` variable: start `.ok` (green), redo/destructive `.bad` (red), star `.amber`. Use colour only where it carries meaning; neutral entries (Edit, Ignore) stay black.
- Inside a list, the more general rule `.condlist button` (0.85rem, 7px 10px padding) also matches menu buttons, so a menu rule must set `font-size`, `gap` and `padding` itself.
- A disabled entry is 50% opacity; a menu that has nothing to offer for an entry hides it instead.
- No open/close animation.

### Secondary buttons (`.subbtn`)

For secondary or insignificant actions (Delete, New category, Up / Down, ...). Inline flex, a 16px icon, 6px gap and a 0.8rem label; padding `4px 6px`; no border or background; `--mute` text turning `--ink` on a `--teal-soft` tint on hover. Destructive ones add `.danger` (red text, `--bad-soft` tint). Bordered buttons (`button.primary`, the default `button`) are only for a screen's main action, such as Save or Random. Hide a button that has nothing to do (e.g. Up on the first item) rather than disabling it.

### Tab slider (`.segmented`)

A slide switch between a few tabs or modes, such as Manual / Agentic in the quiz editor (two tabs of the editor) and Locate / Name / Learn in Dermatome Ninja. It is a tab control, so the markup is a `role="tablist"` of `button[role="tab"][aria-selected]`.

- Track: inline flex, `--tile` background with an inset 1px `--line` outline, padding 4px, 2px between tabs, radius 10px.
- Tab: padding `6px 22px`, radius 7px, 0.9rem, no border, transparent, `--mute` text.
- Selected tab: `--panel` background (a raised white panel), `--ink` text, weight 600, shadow `0 1px 3px rgb(0 0 0 / 0.18)`.
- Place it left-aligned above the content it switches, with 8px below it.

### Cards (`.qe-card`)

A screen with several groups puts each group in its own `--panel` card on the page background, with the group's title above the card in the header font (`.qe-title`: 1.25rem, weight 400, black, 8px below and 2px in from the left). Card padding `14px 14px 8px`, 1px `--line` border, `--r` radius; 22px between sections. Don't wrap the whole screen in one big panel.

### Editable item card (`components/ItemCard.jsx`)

Closed, an item is plain 0.9rem text (padding 6px, no border) in the list; hover tints it `--teal-soft` and clicking opens it. Open, it is a card: `--panel`, 1px `--line` border, `--r` radius, padding 8px, 4px between its parts:

1. The item text, bold (600) 0.9rem, as a line with only a 1px `--line` bottom border (teal while focused).
2. A "Keywords" label: Inter, 0.7rem, `--mute`, 4px above the box.
3. The keyword box: IBM Plex Mono, 0.8rem, `--mute`, padding `7px 10px`, 1px `--line` border, `--r` radius, line-height 1.35.
4. A red `.subbtn.danger` Delete (trash icon) right-aligned at the bottom.

Long text wraps (`components/AutoArea.jsx`), it is never cut off. Reuse the card wherever items are edited. An open item has no drag handle.

### Drag handles

A `⋮⋮` on the left of a row, muted, `cursor: grab`, with a large grab area (padding `0 9px 0 10px`, stretching the row's height). The hover tint covers only the text, not the handle.

### Errors (`.qe-error`)

A box with a 1px `--bad` outline, `--bad-soft` background, `--r` radius, padding `10px 14px`, 0.9rem `--bad` text, `role="alert"`: a bold "Errors" label and then the message, 2px apart.

### Icons

16px outline SVGs: `stroke="currentColor"`, stroke width 2, round caps and joins, no fill (a filled variant only for an on state, such as the amber star), e.g. `components/PencilIcon.jsx`. They take the colour of the text next to them.

### Edit entry

A pencil icon, not the word "Edit" (except inside menus, where every entry has an icon and a label). In a header next to other quiet icons (the star on a drill) it is a `.subbtn`; among bordered buttons (the playlist actions) it is a bordered `.iconbtn` (padding 8px).
