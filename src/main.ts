import './styles.css';
import trackPlanetBannerUrl from './games/track-planet/assets/track_planet.png';
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
    throwChargeDisplay: document.querySelector<HTMLElement>('#throwChargeDisplay'),
    longitudeDisplay: document.querySelector<HTMLElement>('#longitudeDisplay'),
    latitudeDisplay: document.querySelector<HTMLElement>('#latitudeDisplay'),
    altitudeDisplay: document.querySelector<HTMLElement>('#altitudeDisplay'),
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
      <button class="banner-toggle" id="bannerToggle" type="button" aria-expanded="true">Minimize banner</button>
      <header class="game-banner">
        <div class="game-banner-art" aria-hidden="true" style="--banner-image: url('${trackPlanetBannerUrl}')"></div>
        <div class="game-banner-copy">
          <div class="game-banner-title">
            <a class="eyebrow game-home-link" href="https://alancoding.github.io/">Gravity Games</a>
            <h1>Track Planet</h1>
            <p class="page-copy">Run a track wrapped around a small planet and push things into orbit.</p>
          </div>
          <div class="readout" aria-live="polite">
            <span id="velocityDisplay">0.0 m/s</span>
            <span id="orbitalDisplay">orbital 0.0 m/s</span>
            <span id="throwChargeDisplay">throw charge 0%</span>
            <span id="longitudeDisplay">lon 0.0</span>
            <span id="latitudeDisplay">lat 0.0</span>
            <span id="altitudeDisplay">alt 0.0 m</span>
          </div>
        </div>
      </header>

      <div id="gameContainer" class="game-container" tabindex="0"></div>

      <section class="controls-panel" aria-labelledby="controlsHeading">
        <h2 id="controlsHeading">Controls</h2>
        <dl class="controls-list">
          <div>
            <dt>W / A / S / D</dt>
            <dd>Move</dd>
          </div>
          <div>
            <dt>Arrow keys</dt>
            <dd>Turn and adjust camera pitch</dd>
          </div>
          <div>
            <dt>Space</dt>
            <dd>Jump</dd>
          </div>
          <div>
            <dt>Hold F</dt>
            <dd>Charge a shot put throw, then release to throw</dd>
          </div>
          <div>
            <dt>P</dt>
            <dd>Spawn a pole</dd>
          </div>
        </dl>
        <div class="throw-panel">
          <h2>Throw Stats</h2>
          <p id="throwDisplay">throw charge 0%</p>
        </div>
      </section>
    </section>
  `;
  startTrackPlanet();

  const bannerToggle = document.querySelector<HTMLButtonElement>('#bannerToggle');
  const gamePage = document.querySelector<HTMLElement>('.game-page');
  if (bannerToggle && gamePage) {
    bannerToggle.addEventListener('click', () => {
      const collapsed = gamePage.classList.toggle('banner-collapsed');
      bannerToggle.textContent = collapsed ? 'Expand banner' : 'Minimize banner';
      bannerToggle.setAttribute('aria-expanded', String(!collapsed));
    });
  }
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
