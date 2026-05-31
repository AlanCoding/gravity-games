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
let achievementTimeout: number | null = null;

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
    powerupDisplay: document.querySelector<HTMLElement>('#powerupDisplay'),
    timeDisplay: document.querySelector<HTMLElement>('#timeDisplay'),
    achievementNotifier: flashAchievement,
  });
  currentGame.start();
}

function flashAchievement(message: string): void {
  const toast = document.querySelector<HTMLElement>('#achievementToast');
  if (!toast) {
    return;
  }

  toast.textContent = message;
  toast.classList.remove('achievement-toast--hide');
  toast.classList.add('achievement-toast--show');

  if (achievementTimeout !== null) {
    window.clearTimeout(achievementTimeout);
  }

  achievementTimeout = window.setTimeout(() => {
    toast.classList.remove('achievement-toast--show');
    toast.classList.add('achievement-toast--hide');
  }, 1700);
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
        <a class="index-link secondary-link" href="#achievements">
          <strong>Achievements</strong>
          <span>View the current goals and milestone list.</span>
        </a>
        <a class="index-link secondary-link" href="https://alancoding.github.io/">
          <strong>Main Page</strong>
          <span>Return to alancoding.github.io.</span>
        </a>
      </nav>
    </section>
  `;
}

function renderAchievements(): void {
  stopCurrentGame();
  appElement.innerHTML = `
    <section class="index-shell">
      <header class="index-header">
        <p class="eyebrow">Gravity Games</p>
        <h1>Achievements</h1>
        <p class="page-copy">These are the current milestones we’re tracking for Track Planet and the wider Gravity Games set.</p>
      </header>

      <section class="achievement-catalog" aria-label="Achievement list">
        <article class="achievement-card">
          <h2>Track Planet</h2>
          <ul class="achievement-list">
            <li>Jump</li>
            <li>Reach orbit as the player when perigee altitude stays above the planet</li>
            <li>Coming in for landing</li>
            <li>Escape as the player</li>
            <li>Throw a shot put</li>
            <li>Shot put reaches orbit</li>
            <li>Shot put escapes</li>
            <li>Complete one orbit throw</li>
            <li>Ten second airtime throw</li>
            <li>Bounce a shot put five times</li>
            <li>Run 100 m in under 9.9 s</li>
            <li>"Your father ran the 100m in ten flat"</li>
            <li>"Well, I&#39;ll run it in 9.9"</li>
            <li>Record a 100 m time</li>
            <li>Record a 400 m time</li>
          </ul>
        </article>

        <article class="achievement-card">
          <h2>Future Games</h2>
          <ul class="achievement-list">
            <li>Reserved for game-specific milestones from later projects</li>
            <li>Shared Gravity Games achievements page will grow with each new title</li>
          </ul>
        </article>
      </section>

      <nav class="index-links" aria-label="Achievement navigation">
        <a class="index-link" href="/gravity-games/">
          <strong>Home</strong>
          <span>Return to the Gravity Games index.</span>
        </a>
        <a class="index-link secondary-link" href="#track-planet">
          <strong>Track Planet</strong>
          <span>Open the game directly.</span>
        </a>
      </nav>
    </section>
  `;
}

function renderTrackPlanet(): void {
  stopCurrentGame();
  appElement.innerHTML = `
    <section class="game-page">
      <div class="page-actions">
        <button class="page-action-button" id="resetGameButton" type="button">Reset game</button>
        <button class="page-action-button banner-toggle" id="bannerToggle" type="button" aria-expanded="true">Minimize banner</button>
      </div>
      <div class="achievement-toast" id="achievementToast" aria-live="polite" aria-atomic="true"></div>
      <div class="game-main">
        <header class="game-banner">
          <div class="game-banner-art" aria-hidden="true" style="--banner-image: url('${trackPlanetBannerUrl}')"></div>
          <div class="game-banner-copy">
            <div class="game-banner-title">
              <a class="eyebrow game-home-link" href="/gravity-games/">Gravity Games</a>
              <h1>Track Planet</h1>
              <p class="page-copy">Pole vault, throw shot put balls into orbit, rocket into oblivion.</p>
            </div>
            <div class="readout" aria-live="polite">
              <span id="velocityDisplay">0.0 m/s</span>
              <span id="orbitalDisplay">orbital 0.0 m/s</span>
              <span id="throwChargeDisplay">throw charge 0%</span>
              <span id="longitudeDisplay">normal 150 lbf</span>
              <span id="latitudeDisplay">rocket fuel N/A</span>
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
              <dd>Turn on the ground; orbit the camera in the air and adjust pitch</dd>
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
              <dd>Hold to pole vault</dd>
            </div>
            <div>
              <dt>R</dt>
              <dd>Use rocket pack in air, if collected</dd>
            </div>
          </dl>
          <div class="throw-panel">
            <h2>Throw Stats</h2>
            <p id="throwDisplay">throw charge 0%</p>
          </div>
          <div class="powerup-panel">
            <h2>Powerups</h2>
            <p id="powerupDisplay">runner baseline | shot put 100% | rocket fuel N/A</p>
          </div>
          <div class="time-panel">
            <h2>Time Trials</h2>
            <p id="timeDisplay">100m -- | 400m --</p>
          </div>
        </section>
      </div>
    </section>
  `;
  startTrackPlanet();

  const bannerToggle = document.querySelector<HTMLButtonElement>('#bannerToggle');
  const resetGameButton = document.querySelector<HTMLButtonElement>('#resetGameButton');
  const gamePage = document.querySelector<HTMLElement>('.game-page');
  if (bannerToggle && gamePage) {
    bannerToggle.addEventListener('click', () => {
      const collapsed = gamePage.classList.toggle('banner-collapsed');
      bannerToggle.textContent = collapsed ? 'Expand banner' : 'Minimize banner';
      bannerToggle.setAttribute('aria-expanded', String(!collapsed));
    });
  }
  if (resetGameButton) {
    resetGameButton.addEventListener('click', () => {
      renderTrackPlanet();
    });
  }
}

function renderRoute(): void {
  if (window.location.hash === '#track-planet') {
    renderTrackPlanet();
    return;
  }

  if (window.location.hash === '#achievements') {
    renderAchievements();
    return;
  }

  renderIndex();
}

window.addEventListener('hashchange', renderRoute);
renderRoute();
