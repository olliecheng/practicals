# Recall Drill

History-taking recall game, a React single-page app served under `/recall-drill/` (React Router, `basename="/recall-drill"`). Questions live in `conditions.json` and `presentations.json`, imported by `lib/data.js` and bundled by Vite.

Routes: `/recall-drill` (pick a drill), `/recall-drill/login`, `/recall-drill/q/<id>` (the drill). `<id>` is the base64url of `"<system>.<name>"` (e.g. `Cardio.Heart failure`); the single system `Presentation` marks a presentations drill, anything else is a condition. Encode/decode in `lib/drillId.js`; an unknown id shows "Drill not found". Saved-record keys are unchanged (`cond|Cardio|Heart failure`).

Registered in `/vite.config.js` as `recallDrill` -> `recall-drill/index.html`, a thin shell that loads `src/recall-drill/main.jsx`. The Worker serves that shell for every `/recall-drill/*` path that isn't a real file (see Deployment).

Layout: `routes/` (Home, Drill, Login), `components/` (Layout, DrillActions), `state/` (`AccountContext` user record + saving, `FilterContext` home selection used by Random/Next/New, `useDrillGame` the round logic), `lib/` (`data.js` flatten + modes, `match.js` keyword matching, `drillId.js`, `storage.js`, `confetti.js`), `recall-drill.css` (plain CSS, not Tailwind).

## How the game works

1. The player picks a mode (Conditions / Presentations), then systems (chips, Conditions only) and an item (random or from a list).
2. The prompt is shown, and the items appear as numbered face-down tiles. Conditions have five sections: Presentation, Risk factors / etiology, Examination findings, Investigations (tests for diagnosis and monitoring only, with the key finding: specific and high-yield), Medications, treatment, and management (drugs plus the essential non-drug management, e.g. podiatry/offloading, CPAP, pulmonary rehab). Presentations have three: Differentials, Associated features (history), Investigations.
3. The player types one item at a time. Each input is tested against every item's `keywords` regex; a match flips that tile. Matching is live (on input) and on Enter. "New" jumps to another random item.
4. One button (first row; Back and New are in the second) reads "Reveal <next section>" (e.g. "Reveal differentials"); each click reveals that section's missed tiles, and revealing the last one ends the round. Naming every tile in a section by typing fires confetti and moves the button on to the next section. The player can tap a revealed missed tile to credit it. Score is found+credited / total items. The sliding Collapse | Expand toggle by the counter (the highlighted segment is the current state; remembered in localStorage `recallDrillCollapsed`). Expanded (default): every section is open, typing is matched against all tiles, and Reveal goes through the sections in order. Collapsed: one section is open at a time (initially the one Reveal names); typing is matched only against it and Reveal reveals just its missed tiles and leaves it open, but the counter, section counts and score always cover every section. Clicking a collapsed heading switches to it; clicking the open one does nothing. Completing a section never ends the round; it ends when every tile has been named or revealed, and then all sections are shown.

## JSON format

`conditions.json`:

```json
{
  "<system>": {
    "<condition>": {
      "prompt": "Symptoms to ask about",
      "presentation":   [ { "label": "...", "keywords": "a|b|c" } ],
      "risks":          [ ... ],
      "examination":    [ ... ],
      "investigations": [ ... ],
      "medications":    [ ... ]
    }
  }
}
```

`presentations.json` has the same shape with a single system (`Presentation`) and the keys `differentials`, `associated`, `investigations`. For broad presentations the Differentials section holds conditions to screen for, risks, complications or injuries (see the `prompt`).

- **Top-level key = system / category** (e.g. `Cardio`, `Resp`, `Renal`, `GI`, `Endo`, `Rheum`, `Neuro`, `Vasc`, `ID`, `Breast`, `Ortho`, `Derm`, `Eye`, `ENT`, `Cross`). Each becomes a filter chip. Chip order = key order in the file. `Cross` holds cross-cutting histories (e.g. "Smoking history"). Systems apply to `conditions.json` only.
- **Second-level key = condition name**, shown as the title and in the "Or pick one" list. Must be unique within a system. List order is by system (in file order), then condition (in file order).
- **`prompt`**: required string (usually "Symptoms to ask about" or "History to ask about"). Shown under the title; may be empty ("").
- **`examination`**: signs a clinician would look for or elicit on examination (general, system-specific, relevant special tests). Examination items often share terms with presentation items (e.g. "oedema"); a shared term ticks both, which is accepted.
- **Sections**: every key for the file must be present, shown in the order above; an empty one renders "None listed for this condition." A section is either a plain array of items (one unnamed category) or an object `{"Category": [items]}` whose key order is the category order (`lib/data.js` accepts both). Items are flattened in category order, and tiles are numbered 1..n within each section in that order. Empty categories are omitted. Every item sits in exactly one category.
- **Item `label`**: text revealed on the tile (and the answer shown on reveal). Rendered as HTML via `innerHTML`, so escape `<`/`&` if ever needed.
- **Item `keywords`**: a single string of `|`-separated alternatives, compiled by `rx()` in `lib/match.js` into a case-insensitive regex. Each alternative is a regex fragment (so `.`, `.*`, `.?` work, e.g. `"ex.?smok"`, `"wake.*breath"`), and is prefixed with `\b`.
  - Alternatives of 3 chars or fewer (after trimming trailing spaces) are matched as whole words (optional plural `s`), and during live typing must be followed by a delimiter, so `ed` doesn't fire while typing `edema`. Alternatives longer than 3 chars are prefix matches (`orthop` matches `orthopnoea`), so use stems.
  - A leading `~` matches anywhere instead of at a word start (drug suffixes, e.g. `~pril`). Alternatives starting with a non-word character are used as raw regex.
  - Don't use `(`, `)`, `[`, `]` or `\` unless you intend regex syntax; never put a literal `|` inside an alternative.
  - If several tiles match, the one whose match starts earliest, then is longest, wins (ties credit all). If the typed text is still a proper prefix of a longer literal keyword of another tile, found or not (e.g. `sputum` vs `sputum culture`), nothing fires while typing; after a 0.7s pause it credits a new tile, but never flashes yellow for an already-named one (Enter still does).
  - Abbreviations: `ABBR` in `lib/match.js` maps common abbreviations (htn, af, ckd, ...) to full terms. It is only tried when the typed text matches no tile, and while typing only after the 0.7s idle pause (so `ra` can't fire mid-`radiotherapy`). A keyword that already contains the abbreviation takes precedence. Add new entries to `ABBR`; avoid ambiguous ones (pe, mr, pd, ca, ed, us, cf).
  - Synonyms: `lib/synonyms.js` lists groups of interchangeable terms (erythema / redness, fever / pyrexia, kidney / renal, ...). Same fallback rules as `ABBR`: tried only when the typed text matches no tile, and while typing only after the idle pause. Whole words / phrases only; keep groups specific. Add a group there rather than widening individual tiles' keywords when the equivalence is general.
  - Where one word could name both a diagnosis and its test (iron, B12, electrolytes, urate), the diagnosis tile needs a qualifier (e.g. `iron deficiency`).

## Hint

Off by default; a "Hint" button beside Reveal (a checkbox toggle button, aria-pressed) toggles category boxes (`fieldset.cat` with a `legend`, wrapping flex, `.cats` in `recall-drill.css`) around the tiles of the current section only: the one Reveal names, or the open one when collapsed (`hintCode` from `useDrillGame`). Other sections stay flat. The button is disabled when that section has no named categories and hidden once the round is over. `hint` lives in the round state (`s.hint`) as the code of the section it was switched on for; it only applies while `hintCode` still equals it, so completing that section (by typing or Reveal) or moving to the next hides it again and the next section isn't spoiled. It resets on every round/restart and is never saved. Tile index, number, matching, scoring, ignore and saved keys are unaffected.

## Editing guidelines

- Keep the JSON valid (no trailing commas, double quotes). The file uses one-space indent.
- When adding a condition, append inside the right system object; add a new system as a new top-level key (it gets a chip automatically).
- Items have no ids or ordering requirement beyond position; there is no `section` field, the section (and category) it sits in is its identity.
- No code change is needed to add or edit content.

## Code notes

- `lib/data.js` flattens the imported JSON into `DATA` (conditions) and `PRES` (presentations): drills `{key, mode, system, name, prompt, items:[{label, keywords, code, cat, key, re, lits}]}`, codes P/R/E/M/T (presentation, risks, examination, investigations, medications / treatment) or D/A/I (differentials, associated, investigations). `cat` is the category name or `null`. A `re` regex and literal keyword list (`lits`, for deferral) are attached to each item; `judge()` picks the tile(s). The rest of the code works on that array.
- Section header icons are 16x16 pixel-art SVGs in `assets/` (`presentation.svg` thermometer, `risks.svg` warning triangle, `examination.svg` magnifying glass, `investigations.svg` flask, `medications.svg` pill), imported as URLs and drawn as a CSS `mask` filled with `--teal`, so they follow the theme. Each is one `currentColor` path of 1px rects with `shape-rendering="crispEdges"`; they render at 24px (1.5x the 16px heading text), which is sharp on 2x/3x screens but slightly uneven at 1x; 32px is the next exact integer scale.
- Typography uses Apple system fonts with Inter as a fallback; no external requests.
- Colour variables are in `:root`, with light/dark via `prefers-color-scheme`.

## Accounts

Optional, username-only (no password), so the username is effectively the secret; any non-empty name of `a-z0-9_-` (capped at 100 characters server-side). The drill defaults to "Guest: nothing is saved" (ignoring a tile still works within the round). The header "Log in" link opens `/recall-drill/login` (`routes/Login.jsx`), a form with Log in (user must exist) and Create account (name must be free); on success it stores the name and returns to the list.

- `worker/app.js`: the host-agnostic API (Hono, with a `get(name)`/`put(name, text)` storage interface); `worker/d1-store.js` is the Cloudflare D1 adapter and `worker/index.js` the Worker entry. Only `/api/*` and `/recall-drill/*` run the Worker (`run_worker_first` in `wrangler.jsonc`); everything else is static assets. To host elsewhere, mount `createApp(getStore)` with another store adapter and serve `recall-drill/index.html` for unmatched `/recall-drill/*` paths. `GET /api/user` returns the user's JSON (404 `{"error":"not found"}` if missing); `PUT /api/user` replaces it (this also creates the user). The username is the `X-Username` header. Storage is the D1 database bound as `DB`, table `users(name, data, updated)`, created on first request (no migration step). There is no list endpoint.
- `lib/storage.js`: fetch helpers and the remembered username (localStorage `recallDrillUser`); `AccountProvider` restores it silently on load (the drill route waits for that, as it needs the saved record).
- Record shape: `{v:1, stars:["mode|system|name"], drills:{"mode|system|name":{runs,last,score,found:["code:label"],credited:[...],ignored:[...]}}}`. Items are keyed by `sectionCode:label`, so renaming a label in the JSON orphans its saved state.
- `AccountContext` saves with a debounced whole-record `PUT` (`mutate()` then `save()`/`flush()`): on finishing a round, on credit toggles after finishing, on star and ignore toggles, and on Menu/Back.
- Ignored tiles (missed tiles offer the `−` bubble on hover or tap, and so do correct (typed or credited) tiles once their section is complete, i.e. every tile in it is named, credited, ignored or revealed; press it again to restore) stay visible but greyed, count as already named when typed, and are excluded from the score and counters. They are always prefilled on the next attempt.
- A drill with history shows a popover (on hover, or on tap) with "Start from scratch" (light green), "Redo incorrect" (light red) and "Reset progress" (plain). Redo incorrect navigates to the drill with route state `{inc:true}`: found and credited tiles from the saved record are prefilled, so only the blanks remain. Both options record the result: a redo round carries the saved found and credited forward, so the saved score is the combined score, and it counts as a run and updates `last`. Start from scratch begins blank (ignored tiles are still prefilled). On the done screen, logged-in users get an "Add to history" checkbox (ticked by default, unticked after Redo / Retry incorrect, so those rounds are not recorded unless the user ticks it; a ticked round is saved and `flush()`ed immediately). Unticking restores the drill's record to how it was before the round (`prevRec`: runs, last, score, found, credited) and re-ticking saves the round again, each flushed at once; while unticked, credit toggles don't touch the record (ignored tiles still save). The done screen also has "Retry incorrect" (hidden when nothing was missed): it restarts the drill with the tiles found or credited in the round just played prefilled, via `restart({found, credited})` (a new `useDrillGame` round), so it works for guests too and, for accounts, records like Redo incorrect. A drill with no history starts immediately when clicked. Logged-in users get a ★ button on each list row, shown on hover (always, dimmed, on touch devices) and kept visible when starred; it toggles the star without opening the drill. Logged-in users also get a History panel to the right of the list (below it on narrow screens): drills with `runs>0`, most recent first, showing score, system and date. Hover or tap a row for Restart / Redo incorrect / Delete (the same actions as the popover, via `DrillActions`; Delete is the same as Reset progress). "Reset progress" (confirm first) clears runs, score, found and credited for that drill; ignored items and the star are kept.

Local dev: `npm run dev` only; `@cloudflare/vite-plugin` runs the Worker and a local D1 (`.wrangler/`) inside the Vite dev server. Production uses the D1 database whose id is in `wrangler.jsonc`; keep the Worker name `practicals` to match the Workers Builds project.

## Deployment

Cloudflare Worker with static assets (plus the `/api` Worker above); Vite builds `recall-drill/index.html` as an entry and bundles the JSON files, so nothing extra needs registering when the data changes.
