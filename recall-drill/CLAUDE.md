# Recall Drill

Standalone, dependency-free history-taking recall game, served at `/recall-drill/`. Not React; `index.html` contains all HTML, CSS and JS. Questions live in `data.json`, imported by the page's `<script type="module">` (`import QUESTIONS from './data.json'`). Vite bundles it, so the page must be served through Vite (dev server or build), not opened via `file://`.

Registered in `/vite.config.js` as `recallDrill` -> `recall-drill/index.html`. `data.json` sits next to the page and is bundled into the page's JS at build time.

## How the game works

1. The player picks systems (chips) and a condition (random or from a list).
2. The prompt (e.g. "Symptoms to ask about") is shown, and the condition's items appear as numbered face-down tiles, grouped into three sections: Presentation, Risk factors / etiology, Investigations / management.
3. The player types one item at a time. Each input is tested against every item's `keywords` regex; a match flips that tile. Matching is live (on input) and on Enter.
4. "I'm done" reveals missed items; the player can tap a missed tile to credit it. Score is found+credited / total items.

## `data.json` format

```json
{
  "<system>": {
    "<condition>": {
      "prompt": "Symptoms to ask about",
      "presentation":   [ { "label": "...", "keywords": "a|b|c" } ],
      "risks":          [ { "label": "...", "keywords": "a|b|c" } ],
      "investigations": [ { "label": "...", "keywords": "a|b|c" } ]
    }
  }
}
```

- **Top-level key = system / category** (e.g. `Cardio`, `Resp`, `Renal`, `GI`, `Endo`, `Rheum`, `Neuro`, `Vasc`, `ID`, `Breast`, `Ortho`, `Derm`, `Eye`, `ENT`, `Cross`). Each becomes a filter chip. Chip order = key order in the file. `Cross` holds cross-cutting histories (e.g. "Smoking history").
- **Second-level key = condition name**, shown as the title and in the "Or pick one" list. Must be unique within a system. List order is by system (in file order), then condition (in file order).
- **`prompt`**: required string (usually "Symptoms to ask about" or "History to ask about"). Currently loaded but not displayed in the UI; keep it in the data.
- **`presentation` / `risks` / `investigations`**: the three sections, shown in that order and labelled "Presentation", "Risk factors / etiology" and "Investigations / management". All three keys must be present; an empty array renders "None listed for this condition." Tiles are numbered 1..n within each section in array order.
- **Item `label`**: text revealed on the tile (and the answer shown on reveal). Rendered as HTML via `innerHTML`, so escape `<`/`&` if ever needed.
- **Item `keywords`**: a single string of `|`-separated alternatives, compiled by `rx()` in `index.html` into a case-insensitive regex. Each alternative is a regex fragment (so `.`, `.*`, `.?` work, e.g. `"ex.?smok"`, `"wake.*breath"`), and is prefixed with `\b`.
  - Alternatives of 3 chars or fewer (after trimming trailing spaces) are matched as whole words (optional plural `s`), and during live typing must be followed by a delimiter, so `ed` doesn't fire while typing `edema`. Alternatives longer than 3 chars are prefix matches (`orthop` matches `orthopnoea`), so use stems.
  - Don't use `(`, `)`, `[`, `]` or `\` unless you intend regex syntax; never put a literal `|` inside an alternative.
  - Keep keywords specific enough not to match other items in the same condition: one input can tick several tiles.

## Editing guidelines

- Keep the JSON valid (no trailing commas, double quotes). The file uses one-space indent.
- When adding a condition, append inside the right system object; add a new system as a new top-level key (it gets a chip automatically).
- Items have no ids or ordering requirement beyond array position; there is no `section` field, the array it sits in is the section.
- No code change is needed to add or edit content.

## Code notes (`index.html`)

- At startup the imported JSON is flattened into `DATA = [[system, condition, prompt, [[label, keywords, 'P'|'R'|'M']]]]` (P presentation, R risks, M investigations), and a `re` regex is attached to each item. The rest of the code works on that array.
- Section header icons are 16x16 pixel-art SVGs in `assets/` (`presentation.svg` thermometer, `risks.svg` warning triangle, `investigations.svg` flask), imported as URLs and drawn as a CSS `mask` filled with `--teal`, so they follow the theme. Each is one `currentColor` path of 1px rects with `shape-rendering="crispEdges"`; they render at 24px (1.5x the 16px heading text), which is sharp on 2x/3x screens but slightly uneven at 1x; 32px is the next exact integer scale.
- Typography uses Apple system fonts with Inter as a fallback; no external requests.
- Colour variables are in `:root`, with light/dark via `prefers-color-scheme`.

## Deployment

Static site on Cloudflare Pages; Vite builds `recall-drill/index.html` as an entry and inlines `data.json` into the bundle, so nothing extra needs registering when the data changes.
