# AGENTS.md

Vue 3 + Vite + Tailwind SPA: `/` (`HomeView`, still a TODO), `/:slug` (`SlugView`, plays a card either from the `evilspins-player` demo or from a torrent infohash — see the POC below), and a dev-only `/seed` helper. There is no backend, store, or test suite yet.

## Commands

- `pnpm dev` — Vite on port **3000** (falls back to the next free port if busy).
- `pnpm build` — `vue-tsc -b && vite build`; the only verification step (no test runner, linter, or formatter configured — don't invent commands).
- Typecheck alone: `pnpm exec vue-tsc -b`.
- `pnpm deploy` — local build + `gh-pages -d dist` (internally uses `npm run build`). Real deploys happen in CI on push to `main`.

## Routing

- `vue-router` 4 (`createWebHistory(import.meta.env.BASE_URL)`); routes in `src/router/index.ts`, pages in `src/pages/`.
- `/:slug` passes the segment as a `slug` prop. Vue Router already decodes route params — do not `decodeURIComponent` it again (throws on literal `%`).
- Slug → `CardData` resolution is not implemented yet. `SlugView` currently returns a demo card only for the slug `title-artist`; torrent infohashes take the POC path below, everything else shows the raw slug. Replace `DEMO_CARD` when the rules are defined.
- `/seed` is a **dev-only** route (registered under `import.meta.env.DEV`, before `/:slug`) that seeds a picked file over WebRTC via the browser and prints its hash/magnet. It does not exist in the production build. `client.seed()` returns before the file is hashed, so `infoHash`/`magnetURI` must be read inside its seed callback (the third argument), not from the returned torrent.
- Stay on `vue-router` 4.x on purpose; v5 (`latest`) is a different setup and has not been evaluated here.

## Torrent POC (slug = infohash)

- `src/utils/torrent.ts` recognizes 40-char hex or 32-char base32 hashes, builds a magnet with **WSS** trackers, and uses WebTorrent to fetch metadata, then the first audio file (audio MIME or audio extension) — the whole file is downloaded and exposed as a blob URL.
- The downloaded audio is parsed with `music-metadata` (`parseBlob`, lazily imported): the first embedded picture (ID3 APIC, FLAC picture, MP4 `covr`, etc.) becomes the card's `imageUrl` as a blob URL. Missing/unreadable tags are ignored, never fatal.
- Import `webtorrent/dist/webtorrent.min.js`, never the `webtorrent` root: the root pulls Node built-ins and needs polyfills, while the prebuilt browser bundle is self-contained. It ships no types; minimal ambient typings live in `src/types/webtorrent.d.ts`.
- The bundle is lazy-loaded (own ~220 kB chunk), so the home route stays light. Keep the dynamic import.
- Browser WebTorrent only reaches **WebRTC** peers: plain TCP/UDP seeders are invisible, so a hash without an accessible WebRTC peer or WSS tracker will time out after 45 s with "Métadonnées du torrent indisponibles".
- `SlugView` cancels in-flight downloads on navigation via a run counter and always calls `destroy()` (stops the torrent, revokes the audio **and cover** blob URLs). Preserve that cleanup when editing.
- To test locally you need a WebRTC-capable seeder (WebTorrent in a browser tab); a normal BitTorrent client seeding over TCP/UDP (qBittorrent, Transmission…) will never be reached by the browser client. Use `/seed` in a second tab for this.

## evilspins-player integration

- `evilspins-player` is not published: `package.json` depends on `link:../evilspins.player` (sibling checkout).
- Its entry points are the **built** `dist/` files (`evilspins-player.es.js`, `index.d.ts`, `style.css`). After changing the player, run `pnpm build:lib` in `../evilspins.player` (wipes its gitignored `dist/`) or the app will keep importing stale code/types.
- Because the link points outside this repo, `pnpm install --frozen-lockfile` — and therefore the GitHub Pages CI job — fails unless `../evilspins.player` exists. CI will break until the package is published or the workflow checks out the player repo.
- Import the component as `import { Card } from 'evilspins-player'` and load its stylesheet **once**, in `src/main.ts` (`import 'evilspins-player/style.css'`).
- `Card` sizes itself by default (`40vmin`, expands to `80vmin` when open) and accepts `size`/`openSize` props; wrap it in the `.screen-centered` utility instead of adding layout CSS.
- `Card` takes a `CardData` object (camelCase `audioUrl`/`imageUrl`/`title`/`artist`/`year`); the old snake_case `Card` type is deprecated upstream. `src/types/types.ts` only re-exports `CardData`/`Suit`/`Rank` — edit the model in the player repo, not here.

## GitHub Pages deep links

- `public/404.html` redirects unknown paths to `/?p=<path>`, and `src/main.ts` restores the path before the router mounts. Both halves are required: without them every `/slug` URL 404s in production.
- `vite.config.ts` uses `base: '/'`; keep asset paths root-relative or use `import.meta.env.BASE_URL`.

## Toolchain quirks

- **Tailwind is v3** (`tailwind.config.js` + `postcss.config.js`). Do not switch to v4 CSS-first syntax; keep `@tailwind base/components/utilities` in `src/style.css`.
- Custom utilities/tokens defined in the Tailwind plugin: `screen-centered`, `full-screen`, `size-100vmin`, `debug`; `esyellow`/`primary`, `text-xxs`, `xsm` (340px), `shadow-2xl-custom`, `duration-2000`.
- `vite.config.ts` aliases `@`, `~`, `~~`, and `#app` all to `src/`. These Nuxt-style aliases are intentional shims — this is **not** Nuxt; use `@/`.
- `vite.config.ts` hardcodes `process.client`/`process.server`/`import.meta.env.SSR` to `false`, so SSR branches never run.
- `pnpm-workspace.yaml` has the root as the only workspace member; install from the repo root. Its `allowBuilds` map whitelists/denies install scripts: pnpm 12 aborts the install when a new dependency wants to run one (WebTorrent's native optional deps are denied there). CI pins Node 22 + pnpm 9 with `--frozen-lockfile`, so commit `pnpm-lock.yaml` changes (local tooling is newer).
