import './styles.css';
import trackPlanetBannerUrl from './games/track-planet/assets/track_planet.png';
import { trackPlanetGame } from './games/track-planet';
import {
  TRACK_PLANET_ACHIEVEMENTS,
  type TrackPlanetAchievementId,
} from './games/track-planet/achievements';

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
const TRACK_PLANET_ACHIEVEMENT_COOKIE = 'gravity_games_track_planet_achievements';

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
    achievementUnlocker: unlockTrackPlanetAchievement,
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
              <a class="index-link" href="${game.id === 'track-planet' ? '#track-planet-background' : `#${game.id}`}">
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
  const unlocked = getTrackPlanetAchievements();
  appElement.innerHTML = `
    <section class="index-shell">
      <header class="index-header">
        <p class="eyebrow">Gravity Games</p>
        <h1>Achievements</h1>
        <p class="page-copy">Unlocked achievements are saved in this browser. Use the game reset if you want to start a new run, or reset achievements here for a clean slate.</p>
      </header>

      <section class="achievement-catalog" aria-label="Achievement list">
        <article class="achievement-card">
          <div class="achievement-card-header">
            <h2>Track Planet</h2>
            <button class="small-button" id="resetTrackPlanetAchievements" type="button">Reset</button>
          </div>
          <p class="achievement-progress">${unlocked.size} / ${TRACK_PLANET_ACHIEVEMENTS.length} unlocked</p>
          <ul class="achievement-list">
            ${TRACK_PLANET_ACHIEVEMENTS
              .map(achievement => {
                const isUnlocked = unlocked.has(achievement.id);
                return `
                  <li class="${isUnlocked ? 'achievement-unlocked' : 'achievement-locked'}">
                    <span class="achievement-status">${isUnlocked ? 'Unlocked' : 'Locked'}</span>
                    <span>${escapeHtml(achievement.title)}</span>
                  </li>
                `;
              })
              .join('')}
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

  document.querySelector<HTMLButtonElement>('#resetTrackPlanetAchievements')?.addEventListener('click', () => {
    resetTrackPlanetAchievements();
    renderAchievements();
  });
}

function renderTrackPlanetBackground(): void {
  stopCurrentGame();
  appElement.innerHTML = `
    <section class="static-page">
      <header class="static-hero">
        <p class="eyebrow">Track Planet background</p>
        <h1>Track Planet</h1>
        <a class="go-to-game-link" href="#track-planet">Go to game</a>
      </header>

      <article class="story-section" aria-labelledby="trackPlanetMotivationHeading">
        <h2 id="trackPlanetMotivationHeading">Motivation</h2>
        <p>In high school I ran cross-country and track all 4 years. Senior year, I remember daydreaming constantly about the numbers from the 400 meter track. What if, I wondered, you could have a track with no turns at all? This isn't totally possible, but you could have it curve vertically instead of horizontally. But this would require having an entire planet dedicated to the track, where it has 1 Earth gravity at the surface and a circumference of 400 meters. This planet would have all kinds of absurd physics, like how the faster you ran the easier it would be to continue running because your weight decreases. Then if you threw the shot put fast enough it could potentially reach orbit.</p>
        <p>I told a person or two about my daydreams but they mostly ignored me. Now, with AI, I can have the game for the daydream I had. To be clear, I know the physics of the situation, and it demands a planet with an absurdly high density that no ordinary atomic matter can provide. So we have to imagine that it has a black hole in the center. There's also no clear way to hold atmosphere in, but in this game, I didn't even bother with air resistance anyway. That would just make it less fun to orbit.</p>
      </article>

      <article class="story-section" aria-labelledby="trackPlanetAiHeading">
        <h2 id="trackPlanetAiHeading">AI use</h2>
        <p>I made this game with AI in one long back-and-forth. Most of the conversation was not glamorous: the player flew into space by accident, the shot puts refused to bounce, bleachers faced the wrong way, billboards faced the wrong way, and the rocket pack did not even listen to the R key at first.</p>
        <p>But the basic thing I wanted is here now. There is a tiny track planet, a runner, shot puts, pole vaulting, powerups, achievements, and enough orbital nonsense to make the original daydream playable. From here, the work is mostly tuning and fixing whatever still feels wrong.</p>
        <dl class="metrics-list">
          <div>
            <dt>User prompts</dt>
            <dd>About 100 in this thread. Almost all of them were about this game.</dd>
          </div>
          <div>
            <dt>Context windows</dt>
            <dd>At least 1 compaction and 1 model transition happened while building it.</dd>
          </div>
          <div>
            <dt>Conversation length</dt>
            <dd>Well over 1,000 lines once the compacted history and summaries are counted.</dd>
          </div>
          <div>
            <dt>Context used</dt>
            <dd>Tens of thousands of tokens in the active thread, and more than that across the whole conversation.</dd>
          </div>
          <div>
            <dt>Validation loop</dt>
            <dd>Most changes were checked with npm test, npm run build, or both.</dd>
          </div>
        </dl>
      </article>

      <nav class="index-links static-nav" aria-label="Track Planet navigation">
        <a class="index-link" href="#track-planet">
          <strong>Go to game</strong>
          <span>Open the playable Track Planet page.</span>
        </a>
        <a class="index-link secondary-link" href="/gravity-games/">
          <strong>Gravity Games</strong>
          <span>Return to the game index.</span>
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
              <h1><a class="game-title-link" href="#track-planet-background">Track Planet</a></h1>
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

  if (window.location.hash === '#track-planet-background') {
    renderTrackPlanetBackground();
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

function unlockTrackPlanetAchievement(id: TrackPlanetAchievementId): void {
  const unlocked = getTrackPlanetAchievements();
  if (unlocked.has(id)) {
    return;
  }
  unlocked.add(id);
  setCookie(TRACK_PLANET_ACHIEVEMENT_COOKIE, JSON.stringify([...unlocked]), 60 * 60 * 24 * 365);
}

function getTrackPlanetAchievements(): Set<TrackPlanetAchievementId> {
  const raw = getCookie(TRACK_PLANET_ACHIEVEMENT_COOKIE);
  if (!raw) {
    return new Set();
  }
  try {
    const ids = JSON.parse(raw);
    if (!Array.isArray(ids)) {
      return new Set();
    }
    const validIds = new Set(TRACK_PLANET_ACHIEVEMENTS.map(achievement => achievement.id));
    return new Set(ids.filter((id): id is TrackPlanetAchievementId => validIds.has(id)));
  } catch {
    return new Set();
  }
}

function resetTrackPlanetAchievements(): void {
  setCookie(TRACK_PLANET_ACHIEVEMENT_COOKIE, '', 0);
}

function getCookie(name: string): string | null {
  const prefix = `${encodeURIComponent(name)}=`;
  const match = document.cookie
    .split(';')
    .map(cookie => cookie.trim())
    .find(cookie => cookie.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

function setCookie(name: string, value: string, maxAgeSeconds: number): void {
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; max-age=${maxAgeSeconds}; path=/; samesite=lax`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
