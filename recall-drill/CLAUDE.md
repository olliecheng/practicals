# Recall Drill

Standalone, dependency-free history-taking recall game, served at `/recall-drill/`. Not React; `index.html` contains all HTML, CSS and JS. Questions live in `conditions.json` and `presentations.json`, imported by the page's `<script type="module">`. Vite bundles it, so the page must be served through Vite (dev server or build), not opened via `file://`.

Registered in `/vite.config.js` as `recallDrill` -> `recall-drill/index.html`. The JSON files sit next to the page and are bundled into the page's JS at build time.

## How the game works

1. The player picks a mode (Conditions / Presentations), then systems (chips, Conditions only) and an item (random or from a list).
2. The prompt is shown, and the items appear as numbered face-down tiles. Conditions have five sections: Presentation, Risk factors / etiology, Examination findings, Investigations / management, Medications / treatment. Presentations have three: Differentials, Associated features (history), Investigations.
3. The player types one item at a time. Each input is tested against every item's `keywords` regex; a match flips that tile. Matching is live (on input) and on Enter. "New" jumps to another random item.
4. One button (first row; Back and New are in the second) reads "Reveal <next section>" (e.g. "Reveal differentials"); each click reveals that section's missed tiles, and revealing the last one ends the round. Naming every tile in a section by typing fires confetti and moves the button on to the next section. The player can tap a revealed missed tile to credit it. Score is found+credited / total items.

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
- **Section arrays**: every key for the file must be present, shown in the order above; an empty array renders "None listed for this condition." Tiles are numbered 1..n within each section in array order.
- **Item `label`**: text revealed on the tile (and the answer shown on reveal). Rendered as HTML via `innerHTML`, so escape `<`/`&` if ever needed.
- **Item `keywords`**: a single string of `|`-separated alternatives, compiled by `rx()` in `index.html` into a case-insensitive regex. Each alternative is a regex fragment (so `.`, `.*`, `.?` work, e.g. `"ex.?smok"`, `"wake.*breath"`), and is prefixed with `\b`.
  - Alternatives of 3 chars or fewer (after trimming trailing spaces) are matched as whole words (optional plural `s`), and during live typing must be followed by a delimiter, so `ed` doesn't fire while typing `edema`. Alternatives longer than 3 chars are prefix matches (`orthop` matches `orthopnoea`), so use stems.
  - A leading `~` matches anywhere instead of at a word start (drug suffixes, e.g. `~pril`). Alternatives starting with a non-word character are used as raw regex.
  - Don't use `(`, `)`, `[`, `]` or `\` unless you intend regex syntax; never put a literal `|` inside an alternative.
  - If several tiles match, the one whose match starts earliest, then is longest, wins (ties credit all). If the typed text is still a proper prefix of a longer literal keyword of another tile, found or not (e.g. `sputum` vs `sputum culture`), nothing fires while typing; after a 0.7s pause it credits a new tile, but never flashes yellow for an already-named one (Enter still does).
  - Where one word could name both a diagnosis and its test (iron, B12, electrolytes, urate), the diagnosis tile needs a qualifier (e.g. `iron deficiency`).

## Editing guidelines

- Keep the JSON valid (no trailing commas, double quotes). The file uses one-space indent.
- When adding a condition, append inside the right system object; add a new system as a new top-level key (it gets a chip automatically).
- Items have no ids or ordering requirement beyond array position; there is no `section` field, the array it sits in is the section.
- No code change is needed to add or edit content.

## Code notes (`index.html`)

- At startup the imported JSON is flattened into `DATA` (conditions) and `PRES` (presentations) = `[[system, name, prompt, [[label, keywords, code]]]]`, codes P/R/E/M/T (presentation, risks, examination, investigations/management, medications) or D/A/I (differentials, associated, investigations). A `re` regex and literal keyword list (`lits`, for deferral) are attached to each item; `judge()` picks the tile(s). The rest of the code works on that array.
- Section header icons are 16x16 pixel-art SVGs in `assets/` (`presentation.svg` thermometer, `risks.svg` warning triangle, `examination.svg` magnifying glass, `investigations.svg` flask, `medications.svg` pill), imported as URLs and drawn as a CSS `mask` filled with `--teal`, so they follow the theme. Each is one `currentColor` path of 1px rects with `shape-rendering="crispEdges"`; they render at 24px (1.5x the 16px heading text), which is sharp on 2x/3x screens but slightly uneven at 1x; 32px is the next exact integer scale.
- Typography uses Apple system fonts with Inter as a fallback; no external requests.
- Colour variables are in `:root`, with light/dark via `prefers-color-scheme`.

## Deployment

Static site on Cloudflare Pages; Vite builds `recall-drill/index.html` as an entry and inlines the JSON files into the bundle, so nothing extra needs registering when the data changes.
