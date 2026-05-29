import { defineConfig } from 'vite';

// GitHub Pages serves this repo below the repository name.
// If this repo is renamed to "track-planet", set VITE_BASE_PATH="/track-planet/".
const githubPagesBasePath = process.env.VITE_BASE_PATH ?? '/gravity-games/';

export default defineConfig({
  base: githubPagesBasePath,
});
