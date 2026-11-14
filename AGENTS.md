# AGENTS.md

Vue 3 + Vite + Tailwind SPA with two routes: `/` (`HomeView`, still a TODO) and `/:slug` (`SlugView`, renders the `evilspins-player` card). There is no backend, store, or test suite yet.

## Commands

- `pnpm dev` — Vite on port **3000** (falls back to the next free port if busy).
- `pnpm build` — `vue-tsc -b && vite build`; the only verification step (no test runner, linter, or formatter configured — don't invent commands).
- Typecheck alone: `pnpm exec vue-tsc -b`.
- `pnpm deploy` — local build + `gh-pages -d dist` (internally uses `npm run build`). Real deploys happen in CI on push to `main`.

## Routing

- `vue-router` 4 (`createWebHistory(import.meta.env.BASE_URL)`); routes in `src/router/index.ts`, pages in `src/pages/`.
- `/:slug` passes the segment as a `slug` prop. Vue Router already decodes route params — do not `decodeURIComponent` it again (throws on literal `%`).
- Slug → `Card` resolution is not implemented yet. `SlugView` currently returns a demo card only for the slug `title-artist`; everything else shows the raw slug. Replace `DEMO_CARD` when the rules are defined.
- Stay on `vue-router` 4.x on purpose; v5 (`latest`) is a different setup and has not been evaluated here.

## evilspins-player integration

- `evilspins-player` is not published: `package.json` depends on `link:../evilspins.player` (sibling checkout).
- Its entry points are the **built** `dist/` files (`evilspins-player.es.js`, `index.d.ts`, `style.css`). After changing the player, run `pnpm build:lib` in `../evilspins.player` (wipes its gitignored `dist/`) or the app will keep importing stale code/types.
- Because the link points outside this repo, `pnpm install --frozen-lockfile` — and therefore the GitHub Pages CI job — fails unless `../evilspins.player` exists. CI will break until the package is published or the workflow checks out the player repo.
- Import the component as `import { Card } from 'evilspins-player'` and load its stylesheet **once**, in `src/main.ts` (`import 'evilspins-player/style.css'`).
- `Card` sizes itself (`40vmin`, expands to `80vmin` when open); wrap it in the `.screen-centered` utility instead of adding layout CSS.
- `src/types/types.ts` only re-exports `Card`/`Suit`/`Rank` from the package — edit the model in the player repo, not here.

## GitHub Pages deep links

- `public/404.html` redirects unknown paths to `/?p=<path>`, and `src/main.ts` restores the path before the router mounts. Both halves are required: without them every `/slug` URL 404s in production.
- `vite.config.ts` uses `base: '/'`; keep asset paths root-relative or use `import.meta.env.BASE_URL`.

## Toolchain quirks

- **Tailwind is v3** (`tailwind.config.js` + `postcss.config.js`). Do not switch to v4 CSS-first syntax; keep `@tailwind base/components/utilities` in `src/style.css`.
- Custom utilities/tokens defined in the Tailwind plugin: `screen-centered`, `full-screen`, `size-100vmin`, `debug`; `esyellow`/`primary`, `text-xxs`, `xsm` (340px), `shadow-2xl-custom`, `duration-2000`.
- `vite.config.ts` aliases `@`, `~`, `~~`, and `#app` all to `src/`. These Nuxt-style aliases are intentional shims — this is **not** Nuxt; use `@/`.
- `vite.config.ts` hardcodes `process.client`/`process.server`/`import.meta.env.SSR` to `false`, so SSR branches never run.
- `pnpm-workspace.yaml` has the root as the only workspace member; install from the repo root. CI pins Node 22 + pnpm 9 with `--frozen-lockfile`, so commit `pnpm-lock.yaml` changes (local tooling is newer).
