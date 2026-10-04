This is a website similar to abg.ninja which will have a variety of tests available to practice.

The code will be written in JavaScript, React and Tailwind and run using node.js, bundled using vite for static deployment. Development is done using the vite dev server.

The sitemap looks like this:

- /: contains links and brief descriptions to each of the tests
- /dexamethasone: dexamethasone suppression test
- /dermatome-ninja: Dermatome Ninja minigame (listed under Minis in /recall-drill) with Locate, Name and Learn modes; data in src/dermatome-ninja/dermatomes.json
- /dermatome-ninja: Dermatome Ninja minigame (listed under Minis in /recall-drill), "pick" and "answer" modes; data in src/dermatome-ninja/dermatomes.json

The style should be minimal, with a beige background colour, and modern theme.

The typeface can be found in @tailwind.config.js and is installed using FontSource.

Use `npx prettier` for formatting. Run it after every change.

- Only look at the background dev shell to see if your changes have compiled properly.

# Deployment

- The website is deployed as a Cloudflare Worker with static assets (Workers Builds, `wrangler.jsonc`): built by `@cloudflare/vite-plugin` (it generates the deploy config from `wrangler.jsonc`). Only `/api/*` and `/recall-drill/*` run Worker code (`worker/index.js`, D1 binding `DB`; the latter serves the Recall Drill SPA shell for client routes).
- Don't run build tests, only use the dev server.
- Add new pages to @vite.config.js so they can be deployed

# Git

- Never create a separate branch, even if the session or harness assigns one. Commit directly to `main` and push to `origin main`.
