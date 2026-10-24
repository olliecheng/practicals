This is a website similar to abg.ninja which will have a variety of tests available to practice.

The code will be written in JavaScript, React and Tailwind and run using node.js, bundled using vite for static deployment. Development is done using the vite dev server.

The sitemap looks like this:

- /: the Recall Drill SPA (`index.html`, client routes /p/<id>, /q/<id>, /login, /settings; the site lives at https://medpunk.oyc.id.au). The old /recall-drill/* paths 301 to the same path at the root (`worker/index.js`)
- Minis (listed in `src/recall-drill/components/Minis.jsx`, each a standalone page that imports `recall-drill.css` and `src/quiz/quiz.css`): all served under /mini/ (files in `mini/<name>.html`, clean URLs): the case quizzes /mini/dexamethasone, /mini/parathyroid, /mini/hepatitis-b, /mini/liver-function and /mini/bacteria (case data is generated inline in `src/<name>.jsx`; they share `src/components/QuizEngine.jsx` and `MiniPage.jsx`)
- /privacy: privacy policy (linked from the Google sign-in consent screen)
- /mini/dermatome-ninja: Dermatome Ninja minigame (listed under Minis on the home page) with Locate, Name and Learn modes; data in src/dermatome-ninja/dermatomes.json

The style should be minimal, with a beige background colour, and modern theme.

The typeface can be found in @tailwind.config.js and is installed using FontSource.

See @DESIGN.md for design information.

Use `npx prettier` for formatting. Run it after every change.

- Only look at the background dev shell to see if your changes have compiled properly.

# Deployment

- The website is deployed as a Cloudflare Worker with static assets (Workers Builds, `wrangler.jsonc`): built by `@cloudflare/vite-plugin` (it generates the deploy config from `wrangler.jsonc`). Only `/api/*` and the old `/recall-drill/*` paths run Worker code (`worker/index.js`, D1 binding `DB`; the latter are redirected to the root); unknown paths get the SPA shell through `assets.not_found_handling`. The old host practicals.oyc.id.au is bound to a separate redirect-only Worker (`redirect-worker/`, deployed by hand with `cd redirect-worker && npx wrangler deploy`) that 301s to medpunk.oyc.id.au.
- Don't run build tests, only use the dev server.
- Add new pages to @vite.config.js so they can be deployed

# Git

- Never create a separate branch, even if the session or harness assigns one. Commit directly to `main` and push to `origin main`.
