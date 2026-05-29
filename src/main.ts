import './styles.css';
import { trackPlanetGame } from './games/track-planet';

type RunningGame = {
  start: () => void;
  stop: () => void;
};

const games = [trackPlanetGame];

const app = document.querySelector<HTMLElement>('#app');

if (!app) {
  throw new Error('Gravity Games needs a #app mount point.');
}

const appElement = app;
let currentGame: RunningGame | null = null;

function stopCurrentGame(): void {
  if (currentGame) {
    currentGame.stop();
    currentGame = null;
  }
}

function startTrackPlanet(): void {
  const container = document.querySelector<HTMLElement>('#gameContainer');

  if (!container) {
    throw new Error('Track Planet markup is missing.');
  }

  container.replaceChildren();
  currentGame = trackPlanetGame.create({
    container,
    velocityDisplay: document.querySelector<HTMLElement>('#velocityDisplay'),
    orbitalDisplay: document.querySelector<HTMLElement>('#orbitalDisplay'),
    escapeDisplay: document.querySelector<HTMLElement>('#escapeDisplay'),
    coordinateDisplay: document.querySelector<HTMLElement>('#coordinateDisplay'),
    throwDisplay: document.querySelector<HTMLElement>('#throwDisplay'),
  });
  currentGame.start();
}

function renderIndex(): void {
  stopCurrentGame();
  appElement.innerHTML = `
    <section class="index-shell">
      <header class="index-header">
        <p class="eyebrow">Gravity Games</p>
        <h1>Gravity Games</h1>
        <p class="page-copy">Small browser games built around custom gravity and simple primitives.</p>
      </header>

      <nav class="index-links" aria-label="Game index">
        ${games
          .map(
            game => `
              <a class="index-link" href="#${game.id}">
                <strong>${game.title}</strong>
                <span>${game.description}</span>
              </a>
            `,
          )
          .join('')}
        <a class="index-link secondary-link" href="https://alancoding.github.io/">
          <strong>Main Page</strong>
          <span>Return to alancoding.github.io.</span>
        </a>
      </nav>
    </section>
  `;
}

function renderTrackPlanet(): void {
  stopCurrentGame();
  appElement.innerHTML = `
    <section class="game-page">
      <header class="game-topbar">
        <a href="./">Gravity Games</a>
        <div class="readout" aria-live="polite">
          <span id="velocityDisplay">0.0 m/s</span>
          <span id="orbitalDisplay">orbital 0.0 m/s</span>
          <span id="escapeDisplay">escape 0.0 m/s</span>
          <span id="coordinateDisplay">lon 0.0 lat 0.0 alt 0.0 m</span>
          <span id="throwDisplay">throw charge 0%</span>
        </div>
      </header>

      <div id="gameContainer" class="game-container" tabindex="0"></div>
    </section>
  `;
  startTrackPlanet();
}

function renderRoute(): void {
  if (window.location.hash === '#track-planet') {
    renderTrackPlanet();
    return;
  }

  renderIndex();
}

window.addEventListener('hashchange', renderRoute);
renderRoute();
