# Gravity Games

Gravity Games is a Vite + TypeScript + Three.js browser game repo for experiments that need npm build tooling. The first game is Track Planet, a small custom-physics prototype about running and jumping around a tiny spherical track world.

## Source Layout

- `src/engine/` contains reusable browser/game primitives.
- `src/games/track-planet/` contains Track Planet-specific code and notes.
- `src/main.ts` wires the game index and routes to individual games.

## Local Development

```sh
npm ci
npm run dev
```

## Production Build

```sh
npm run build && npm run preview
```

Then open <http://127.0.0.1:4173/gravity-games/> while the preview server is running.

## GitHub Pages

In the repository settings, use:

Settings -> Pages -> Source: GitHub Actions

GitHub Pages serves the built `dist` artifact uploaded by CI. It does not serve the repo root, and `dist` should not be committed.

The Vite base path is configured in [vite.config.ts](./vite.config.ts). By default this repo deploys at `/gravity-games/`. If the repo is renamed, set `VITE_BASE_PATH` to match the Pages path. For example, if the repo is named `track-planet`, use:

```sh
VITE_BASE_PATH=/track-planet/ npm run build
```

The main personal website can link to this app at `/gravity-games/`. Individual games can use hash routes such as `/gravity-games/#track-planet` so GitHub Pages does not need extra rewrite rules.
