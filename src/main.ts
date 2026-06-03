import './styles.css';
import trackPlanetBannerUrl from './games/track-planet/assets/track_planet.png';
import { trackPlanetGame } from './games/track-planet';
import { BeanstalkConductorGame } from './games/beanstalk-conductor/BeanstalkConductorGame';
import {
  TRACK_PLANET_ACHIEVEMENTS,
  type TrackPlanetAchievementId,
} from './games/track-planet/achievements';
import {
  BEANSTALK_ACHIEVEMENTS,
  type BeanstalkAchievementId,
} from './games/beanstalk-conductor/achievements';

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
let pageKeyController: AbortController | null = null;
const TRACK_PLANET_ACHIEVEMENT_COOKIE = 'gravity_games_track_planet_achievements';
const BEANSTALK_ACHIEVEMENT_COOKIE = 'gravity_games_beanstalk_conductor_achievements';
const BEANSTALK_GENERATED_IMAGE_URLS = import.meta.glob<string>(
  './games/beanstalk-conductor/assets/generated/*.png',
  { eager: true, query: '?url', import: 'default' },
);

const BEANSTALK_BACKSTORY_PANELS = [
  {
    title: 'The Promise',
    image: 'backstory-01-promise.png',
    paragraphs: [
      'The Deputy Undersecretary for Orbital Uplift announced the Strategic Space Elevator Initiative.',
      'Civic Prime would build a proper space elevator. The speeches were confident. The diagrams were vertical. The borrowing was already underway.',
    ],
  },
  {
    title: 'The Engineering Meeting',
    image: 'backstory-02-engineering-meeting.png',
    paragraphs: [
      'The engineers explained that the promised elevator was not physically practical on the promised schedule.',
      'This was received as a communications problem.',
    ],
  },
  {
    title: 'The Compromise',
    image: 'backstory-03-compromise.png',
    paragraphs: [
      'The Office of Extraterrestrial Conveyance introduced the Emergency Vertical Access Compromise.',
      'It was not the space elevator anyone had promised. It was, however, close enough for the press release if nobody asked too many follow-up questions.',
    ],
  },
  {
    title: 'The Clean Beanstalk',
    image: 'backstory-04-clean-beanstalk.png',
    paragraphs: [
      'The public version looked elegant.',
      'Launch upmass from Civic Prime. Catch it with a barbell stage. Move it outward. Send downmass back. Keep the ladder balanced. Build the fleet.',
    ],
  },
  {
    title: 'Fleet Central',
    image: 'backstory-05-fleet-central.png',
    paragraphs: [
      'Starward Logistics Command needed mass delivered upward.',
      'Fleet Central would accept useful cargo and provide downmass for the return flow. This sounded balanced, which is a dangerous thing for an orbital system to sound.',
    ],
  },
  {
    title: 'Admiral Voss',
    image: 'backstory-06-admiral-voss.png',
    paragraphs: [
      'Admiral Voss was assigned to observe operations.',
      'Space congress was angry. The money was borrowed. The compromise beanstalk had better work perfectly.',
    ],
  },
  {
    title: 'Your Console',
    image: 'backstory-07-console.png',
    paragraphs: [
      'You do not steer the payloads.',
      'You choose when to commit each transfer. The solver computes the shot. The bill arrives afterward.',
    ],
  },
];

function stopCurrentGame(): void {
  pageKeyController?.abort();
  pageKeyController = null;
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
              <article class="index-link game-entry">
                <a class="index-entry-main" href="#${game.id}">
                  <strong>${game.title} <span class="game-status game-status-complete">Feature complete</span></strong>
                  <span>${game.description}</span>
                </a>
                ${game.id === 'track-planet' ? '<a class="entry-about-link" href="#track-planet-background">About Track Planet</a>' : ''}
              </article>
            `,
          )
          .join('')}
        <article class="index-link game-entry">
          <a class="index-entry-main" href="#beanstalk-conductor">
            <strong>Beanstalk Conductor <span class="game-status game-status-development">Early development</span></strong>
            <span>Run a public beanstalk system until orbital operations get messy.</span>
          </a>
          <a class="entry-about-link" href="#beanstalk-conductor-about">About Beanstalk Conductor</a>
        </article>
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

function renderBeanstalkConductorAbout(): void {
  stopCurrentGame();
  appElement.innerHTML = `
    <section class="static-page">
      <header class="static-hero">
        <p class="eyebrow">Beanstalk Conductor background</p>
        <h1>Beanstalk Conductor</h1>
        <a class="go-to-game-link" href="#beanstalk-conductor">Go to game</a>
      </header>

      <article class="story-section" aria-labelledby="beanstalkAboutHeading">
        <h2 id="beanstalkAboutHeading">About</h2>
        <p>I'm a fan of Hop David's blog; his beanstalk concepts have always stuck with me as a good illustration.</p>
        <p>However, these systems are usually described in their clean theoretical form.</p>
        <p>To actually run this, I have a feeling you'll have an operational mess.</p>
        <p>You catch and now your barbell has some wobble... when does that wobble get resolved? By the downmass, right? Umm, no, the downmass is to recover orbital losses. But the downmass can just do this too, right? I don't know if you have the numerical degrees of freedom to do that!</p>
        <p>I really don't know!</p>
        <p>Beanstalk Conductor is my attempt to formalize this academic question into a playable form. The off-kilter complications of the system are, in fact, the point.</p>
        <p>The goal is not to dunk on the idea. I like the idea. But do I like the idea as a daydream? Or do I like it as something that could actually be used?</p>
        <p>I don't have enough information to say either way. To be direct, that makes me trend bearish on the idea. But you know what they say, only one way to find out.</p>
      </article>

      <nav class="index-links static-nav" aria-label="Beanstalk Conductor navigation">
        <a class="index-link" href="#beanstalk-conductor">
          <strong>Go to game</strong>
          <span>Open the Beanstalk Conductor page.</span>
        </a>
        <a class="index-link secondary-link" href="/gravity-games/">
          <strong>Gravity Games</strong>
          <span>Return to the game index.</span>
        </a>
      </nav>
    </section>
  `;
}

function renderBeanstalkConductorMenu(): void {
  stopCurrentGame();
  const unlocked = getBeanstalkAchievements();
  const backstoryDone = unlocked.has('backstory-complete');
  const tutorialDone = unlocked.has('tutorial-complete');
  appElement.innerHTML = `
    <section class="beanstalk-page">
      <div class="achievement-toast" id="achievementToast" aria-live="polite" aria-atomic="true"></div>
      <div class="beanstalk-shell">
        <div class="beanstalk-game-stage beanstalk-screen-stage">
          <canvas id="beanstalkMenuArt" class="beanstalk-menu-art" width="1280" height="720" aria-hidden="true"></canvas>
          <aside class="beanstalk-menu-title" aria-label="Beanstalk Conductor menu">
            <h1><a class="game-title-link" href="#beanstalk-conductor-about">Beanstalk Conductor</a></h1>
            <p class="page-copy">Use arrow keys and space/enter to navigate.</p>
          </aside>
          <aside class="beanstalk-menu-choices" aria-label="Beanstalk Conductor choices">
            <nav class="beanstalk-menu-actions" aria-label="Beanstalk Conductor choices">
              <a class="index-link beanstalk-menu-choice" href="#beanstalk-conductor-backstory">
                <strong>Back story ${backstoryDone ? '<span class="completion-mark">Done</span>' : ''}</strong>
                <span>Read the public works briefing.</span>
              </a>
              <a class="index-link beanstalk-menu-choice" href="#beanstalk-conductor-tutorial">
                <strong>Tutorial ${tutorialDone ? '<span class="completion-mark">Done</span>' : '<span class="game-status game-status-development">TODO</span>'}</strong>
                <span>Operator training placeholder.</span>
              </a>
              <a class="index-link beanstalk-menu-choice" href="#beanstalk-conductor-play">
                <strong>Play</strong>
                <span>Jump straight into live operations.</span>
              </a>
              <a class="index-link beanstalk-menu-choice" href="#beanstalk-conductor-about">
                <strong>About</strong>
                <span>Exit the game menu and open the about page.</span>
              </a>
            </nav>
          </aside>
        </div>
      </div>
    </section>
  `;
  drawBeanstalkMenuArt();
  bindBeanstalkMenuNavigation();
}

function renderBeanstalkBackstory(): void {
  stopCurrentGame();
  appElement.innerHTML = `
    <section class="beanstalk-page">
      <div class="achievement-toast" id="achievementToast" aria-live="polite" aria-atomic="true"></div>
      <div class="beanstalk-shell">
        <div class="beanstalk-game-stage beanstalk-screen-stage">
          <article class="beanstalk-story-panel" id="beanstalkStoryPanel" tabindex="0" aria-live="polite"></article>
        </div>
      </div>
    </section>
  `;
  bindBeanstalkBackstory();
}

function renderBeanstalkTutorial(): void {
  stopCurrentGame();
  appElement.innerHTML = `
    <section class="beanstalk-page">
      <div class="achievement-toast" id="achievementToast" aria-live="polite" aria-atomic="true"></div>
      <div class="beanstalk-shell">
        <div class="beanstalk-game-stage beanstalk-screen-stage">
          <article class="beanstalk-tutorial-panel">
            <p class="eyebrow">Beanstalk Conductor</p>
            <h1>Tutorial</h1>
            <p>The final tutorial needs guided timing, clean theoretical transfers, and an explanation of why your choices later make the system wobble. For now this page proves the menu and achievement wiring.</p>
            <button class="page-action-button story-advance-button" id="completeBeanstalkTutorial" type="button">Return to menu</button>
          </article>
        </div>
      </div>
    </section>
  `;
  document.querySelector<HTMLButtonElement>('#completeBeanstalkTutorial')?.addEventListener('click', () => {
    completeBeanstalkTutorial();
  });
  bindEnterOrSpace('#completeBeanstalkTutorial', completeBeanstalkTutorial);
}

function renderBeanstalkConductorPlay(): void {
  stopCurrentGame();
  appElement.innerHTML = `
    <section class="beanstalk-page">
      <div class="achievement-toast" id="achievementToast" aria-live="polite" aria-atomic="true"></div>
      <div class="beanstalk-shell">
        <div class="beanstalk-game-stage">
          <div id="beanstalkGameContainer" class="beanstalk-game-container" tabindex="0"></div>
          <aside class="beanstalk-overlay beanstalk-overlay-left" aria-label="Beanstalk Conductor status">
            <div class="beanstalk-status" id="beanstalkStats">Money: 5000 vBucks
Time: t=0.0 s</div>
            <div class="beanstalk-status" id="beanstalkSelection">Selection: loading transfer options</div>
            <div class="beanstalk-status beanstalk-timing" id="beanstalkTiming">Timing: --</div>
          </aside>
          <aside class="beanstalk-overlay beanstalk-transfer-banner" id="beanstalkTransferBanner" aria-live="polite" hidden>
            Hold tight, transfer in progress.
          </aside>
          <aside class="beanstalk-overlay beanstalk-run-controls" aria-label="Run controls">
            <button type="button" class="beanstalk-run-button" id="beanstalkResetButton">Reset</button>
            <button type="button" class="beanstalk-run-button" id="beanstalkGiveUpButton">Give up</button>
          </aside>
          <aside class="beanstalk-overlay beanstalk-speed-controls" aria-label="Simulation speed">
            <button type="button" class="beanstalk-speed-button" data-beanstalk-speed="1">1x</button>
            <button type="button" class="beanstalk-speed-button" data-beanstalk-speed="2">2x</button>
            <button type="button" class="beanstalk-speed-button" data-beanstalk-speed="4">4x</button>
            <button type="button" class="beanstalk-speed-button" data-beanstalk-speed="8">8x</button>
            <button type="button" class="beanstalk-speed-button" data-beanstalk-speed="16">16x</button>
            <button type="button" class="beanstalk-speed-button" data-beanstalk-speed="32">32x</button>
          </aside>
          <aside class="beanstalk-overlay beanstalk-overlay-right" aria-label="Admiral Voss">
            <img class="beanstalk-admiral-portrait" id="beanstalkAdmiralPortrait" alt="" aria-hidden="true">
            <p id="beanstalkAdmiral">Awaiting first transfer.</p>
          </aside>
          <aside class="beanstalk-confirm" id="beanstalkGiveUpDialog" role="dialog" aria-modal="true" aria-labelledby="beanstalkGiveUpTitle" hidden>
            <div class="beanstalk-confirm-panel">
              <h2 id="beanstalkGiveUpTitle">Abandon run?</h2>
              <p>This returns to the Beanstalk Conductor menu and abandons the current operating schedule.</p>
              <div class="beanstalk-confirm-actions">
                <button type="button" id="beanstalkConfirmGiveUp">Give up</button>
                <button type="button" id="beanstalkCancelGiveUp">Continue</button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <section class="controls-panel beanstalk-controls" aria-labelledby="beanstalkControlsHeading">
        <h2 id="beanstalkControlsHeading">Controls</h2>
        <dl class="controls-list">
          <div>
            <dt>Up / Down</dt>
            <dd>Cycle available upmass and downmass timing opportunities</dd>
          </div>
          <div>
            <dt>Enter / Space</dt>
            <dd>Launch the selected transfer at the current time</dd>
          </div>
          <div>
            <dt>W / S</dt>
            <dd>Increase or decrease simulation speed</dd>
          </div>
          <div>
            <dt>Esc</dt>
            <dd>Open the abandon-run confirmation</dd>
          </div>
        </dl>
      </section>
    </section>
  `;
  const container = document.querySelector<HTMLElement>('#beanstalkGameContainer');
  if (!container) {
    throw new Error('Beanstalk Conductor markup is missing.');
  }
  currentGame = new BeanstalkConductorGame({
    container,
    statsDisplay: document.querySelector<HTMLElement>('#beanstalkStats'),
    selectionDisplay: document.querySelector<HTMLElement>('#beanstalkSelection'),
    timingDisplay: document.querySelector<HTMLElement>('#beanstalkTiming'),
    admiralDisplay: document.querySelector<HTMLElement>('#beanstalkAdmiral'),
    admiralPortraitDisplay: document.querySelector<HTMLImageElement>('#beanstalkAdmiralPortrait'),
    transferBannerDisplay: document.querySelector<HTMLElement>('#beanstalkTransferBanner'),
    resetButton: document.querySelector<HTMLButtonElement>('#beanstalkResetButton'),
    giveUpButton: document.querySelector<HTMLButtonElement>('#beanstalkGiveUpButton'),
    giveUpDialog: document.querySelector<HTMLElement>('#beanstalkGiveUpDialog'),
    confirmGiveUpButton: document.querySelector<HTMLButtonElement>('#beanstalkConfirmGiveUp'),
    cancelGiveUpButton: document.querySelector<HTMLButtonElement>('#beanstalkCancelGiveUp'),
    speedButtons: [...document.querySelectorAll<HTMLButtonElement>('[data-beanstalk-speed]')],
    achievementNotifier: flashAchievement,
    achievementUnlocker: unlockBeanstalkAchievement,
  });
  currentGame.start();
  container.focus();
}

function renderAchievements(): void {
  stopCurrentGame();
  const unlockedTrackPlanet = getTrackPlanetAchievements();
  const unlockedBeanstalk = getBeanstalkAchievements();
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
          <p class="achievement-progress">${unlockedTrackPlanet.size} / ${TRACK_PLANET_ACHIEVEMENTS.length} unlocked</p>
          <ul class="achievement-list">
            ${TRACK_PLANET_ACHIEVEMENTS
              .map(achievement => {
                const isUnlocked = unlockedTrackPlanet.has(achievement.id);
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
          <div class="achievement-card-header">
            <h2>Beanstalk Conductor</h2>
            <button class="small-button" id="resetBeanstalkAchievements" type="button">Reset</button>
          </div>
          <p class="achievement-progress">${unlockedBeanstalk.size} / ${BEANSTALK_ACHIEVEMENTS.length} unlocked</p>
          <ul class="achievement-list">
            ${BEANSTALK_ACHIEVEMENTS
              .map(achievement => {
                const isUnlocked = unlockedBeanstalk.has(achievement.id);
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
        <a class="index-link secondary-link" href="#beanstalk-conductor">
          <strong>Beanstalk Conductor</strong>
          <span>Open the current prototype.</span>
        </a>
      </nav>
    </section>
  `;

  document.querySelector<HTMLButtonElement>('#resetTrackPlanetAchievements')?.addEventListener('click', () => {
    resetTrackPlanetAchievements();
    renderAchievements();
  });
  document.querySelector<HTMLButtonElement>('#resetBeanstalkAchievements')?.addEventListener('click', () => {
    resetBeanstalkAchievements();
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

function drawBeanstalkMenuArt(): void {
  const canvas = document.querySelector<HTMLCanvasElement>('#beanstalkMenuArt');
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) {
    return;
  }
  const civicPrimeUrl = getBeanstalkGeneratedImageUrl('civic-prime.png');
  const imageUrls = {
    civicPrime: civicPrimeUrl,
    surfaceLauncher: getBeanstalkGeneratedImageUrl('surface-launcher.png'),
    fleetCentral: getBeanstalkGeneratedImageUrl('fleet-central.png'),
    barbellStage: getBeanstalkGeneratedImageUrl('barbell-stage.png'),
  };
  const images: Partial<Record<keyof typeof imageUrls, HTMLImageElement>> = {};
  for (const [key, url] of Object.entries(imageUrls) as [keyof typeof imageUrls, string | null][]) {
    if (!url) {
      continue;
    }
    const image = new Image();
    image.addEventListener('load', () => {
      drawBeanstalkMenuArtScene(canvas, ctx, images);
    }, { once: true });
    image.src = url;
    images[key] = image;
  }
  drawBeanstalkMenuArtScene(canvas, ctx, images);
}

function drawBeanstalkMenuArtScene(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  images: Partial<Record<'civicPrime' | 'surfaceLauncher' | 'fleetCentral' | 'barbellStage', HTMLImageElement>>,
): void {
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#050709';
  ctx.fillRect(0, 0, width, height);

  const centerX = width * 0.2;
  const centerY = height * 0.36;
  const planetRadius = 112;
  if (images.barbellStage && imageIsReady(images.barbellStage)) {
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.drawImage(images.barbellStage, width * 0.36, height * 0.66, width * 0.28, height * 0.24);
    ctx.restore();
  }

  if (images.civicPrime && imageIsReady(images.civicPrime)) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, planetRadius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(
      images.civicPrime,
      centerX - planetRadius,
      centerY - planetRadius,
      planetRadius * 2,
      planetRadius * 2,
    );
    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.arc(centerX, centerY, planetRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#356faa';
    ctx.fill();
  }

  ctx.save();
  ctx.translate(centerX + planetRadius - 8, centerY - 18);
  ctx.rotate(-0.25);
  if (images.surfaceLauncher && imageIsReady(images.surfaceLauncher)) {
    ctx.drawImage(images.surfaceLauncher, -28, -28, 56, 56);
  } else {
    ctx.fillStyle = '#eac460';
    ctx.fillRect(-10, -8, 28, 16);
    ctx.fillStyle = '#d7e1de';
    ctx.fillRect(10, -4, 35, 8);
  }
  ctx.restore();

  const stageXs = [420, 560, 710];
  const stageYs = [300, 230, 160];
  for (let i = 0; i < stageXs.length; i += 1) {
    const x = stageXs[i];
    const y = stageYs[i];
    ctx.strokeStyle = '#d7e1de';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x - 58, y);
    ctx.lineTo(x + 58, y);
    ctx.stroke();
    ctx.fillStyle = '#eef4f8';
    ctx.beginPath();
    ctx.arc(x - 58, y, 13, 0, Math.PI * 2);
    ctx.arc(x + 58, y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7dd3fc';
    ctx.beginPath();
    ctx.arc(x - 76, y - 18, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(x + 76, y + 18, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  const fleetX = 952;
  const fleetY = 308;
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#93c5fd';
  ctx.lineWidth = 4;
  if (images.fleetCentral && imageIsReady(images.fleetCentral)) {
    ctx.drawImage(images.fleetCentral, fleetX - 58, fleetY - 58, 116, 116);
  } else {
    ctx.beginPath();
    ctx.rect(fleetX - 46, fleetY - 26, 92, 52);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(fleetX - 84, fleetY);
    ctx.lineTo(fleetX - 46, fleetY);
    ctx.moveTo(fleetX + 46, fleetY);
    ctx.lineTo(fleetX + 84, fleetY);
    ctx.stroke();
  }
  ctx.fillStyle = '#dbeafe';
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Fleet Central', fleetX, fleetY - 64);

  ctx.strokeStyle = 'rgba(234, 196, 96, 0.45)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(centerX + planetRadius + 40, centerY - 20);
  ctx.bezierCurveTo(360, 300, 480, 270, 560, 250);
  ctx.bezierCurveTo(660, 250, 790, 300, fleetX - 20, fleetY);
  ctx.stroke();
  ctx.setLineDash([]);
}

function getBeanstalkGeneratedImageUrl(filename: string): string | null {
  const match = Object.entries(BEANSTALK_GENERATED_IMAGE_URLS)
    .find(([path]) => path.endsWith(`/assets/generated/${filename}`));
  return match ? match[1] : null;
}

function imageIsReady(image: HTMLImageElement): boolean {
  return image.complete && image.naturalWidth > 0;
}

function completeBeanstalkBackstory(): void {
  unlockBeanstalkAchievement('backstory-complete');
  flashAchievement('Beanstalk Conductor: public works briefing complete');
  window.location.hash = '#beanstalk-conductor';
}

function completeBeanstalkTutorial(): void {
  unlockBeanstalkAchievement('tutorial-complete');
  flashAchievement('Beanstalk Conductor: operator training complete');
  window.location.hash = '#beanstalk-conductor';
}

function bindBeanstalkMenuNavigation(): void {
  const choices = [...document.querySelectorAll<HTMLAnchorElement>('.beanstalk-menu-choice')];
  if (choices.length === 0) {
    return;
  }
  pageKeyController?.abort();
  pageKeyController = new AbortController();
  let selected = 0;
  const updateSelection = (): void => {
    choices.forEach((choice, index) => {
      choice.classList.toggle('beanstalk-menu-choice-selected', index === selected);
      choice.setAttribute('aria-current', index === selected ? 'true' : 'false');
    });
  };
  updateSelection();
  document.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      selected = (selected + 1) % choices.length;
      updateSelection();
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      selected = (selected - 1 + choices.length) % choices.length;
      updateSelection();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choices[selected].click();
    }
  }, { signal: pageKeyController.signal });
}

function bindBeanstalkBackstory(): void {
  const panel = document.querySelector<HTMLElement>('#beanstalkStoryPanel');
  if (!panel) {
    return;
  }
  pageKeyController?.abort();
  pageKeyController = new AbortController();
  let panelIndex = 0;
  let visibleCharacterCount = 0;
  let fullText = '';
  let textDisplay: HTMLElement | null = null;
  let typewriterTimer: number | null = null;

  const stopTypewriter = (): void => {
    if (typewriterTimer !== null) {
      window.clearInterval(typewriterTimer);
      typewriterTimer = null;
    }
  };

  const updateText = (): void => {
    if (textDisplay) {
      textDisplay.textContent = fullText.slice(0, visibleCharacterCount);
    }
  };

  const completeText = (): void => {
    stopTypewriter();
    visibleCharacterCount = fullText.length;
    updateText();
  };

  const startTypewriter = (): void => {
    stopTypewriter();
    typewriterTimer = window.setInterval(() => {
      visibleCharacterCount = Math.min(fullText.length, visibleCharacterCount + 1);
      updateText();
      if (visibleCharacterCount >= fullText.length) {
        stopTypewriter();
      }
    }, 22);
  };

  const renderPanel = (): void => {
    const item = BEANSTALK_BACKSTORY_PANELS[panelIndex];
    const imageUrl = getBeanstalkGeneratedImageUrl(item.image);
    fullText = `${item.title}\n\n${item.paragraphs.join('\n\n')}`;
    visibleCharacterCount = 0;
    panel.innerHTML = `
      ${imageUrl
        ? `<img class="beanstalk-story-image" src="${imageUrl}" alt="${escapeHtml(item.title)}">`
        : `<div class="story-image-placeholder" role="img" aria-label="${escapeHtml(item.title)} illustration placeholder">
            <span>${escapeHtml(item.image)}</span>
          </div>`}
      <pre class="beanstalk-story-copy" id="beanstalkStoryText" aria-label="Back story panel ${panelIndex + 1} text"></pre>
    `;
    textDisplay = panel.querySelector<HTMLElement>('#beanstalkStoryText');
    updateText();
    startTypewriter();
  };
  const advance = (): void => {
    if (visibleCharacterCount < fullText.length) {
      completeText();
      return;
    }
    if (panelIndex >= BEANSTALK_BACKSTORY_PANELS.length - 1) {
      completeBeanstalkBackstory();
      return;
    }
    panelIndex += 1;
    renderPanel();
  };
  renderPanel();
  panel.focus();
  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    advance();
  }, { signal: pageKeyController.signal });
  pageKeyController.signal.addEventListener('abort', stopTypewriter, { once: true });
}

function bindEnterOrSpace(selector: string, handler: () => void): void {
  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    if (!document.querySelector(selector)) {
      return;
    }
    event.preventDefault();
    handler();
  }, { once: true });
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

  if (window.location.hash === '#beanstalk-conductor-about') {
    renderBeanstalkConductorAbout();
    return;
  }

  if (window.location.hash === '#beanstalk-conductor') {
    renderBeanstalkConductorMenu();
    return;
  }

  if (window.location.hash === '#beanstalk-conductor-backstory') {
    renderBeanstalkBackstory();
    return;
  }

  if (window.location.hash === '#beanstalk-conductor-tutorial') {
    renderBeanstalkTutorial();
    return;
  }

  if (window.location.hash === '#beanstalk-conductor-play') {
    renderBeanstalkConductorPlay();
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

function unlockBeanstalkAchievement(id: BeanstalkAchievementId): void {
  const unlocked = getBeanstalkAchievements();
  if (unlocked.has(id)) {
    return;
  }
  unlocked.add(id);
  setCookie(BEANSTALK_ACHIEVEMENT_COOKIE, JSON.stringify([...unlocked]), 60 * 60 * 24 * 365);
}

function getBeanstalkAchievements(): Set<BeanstalkAchievementId> {
  const raw = getCookie(BEANSTALK_ACHIEVEMENT_COOKIE);
  if (!raw) {
    return new Set();
  }
  try {
    const ids = JSON.parse(raw);
    if (!Array.isArray(ids)) {
      return new Set();
    }
    const validIds = new Set(BEANSTALK_ACHIEVEMENTS.map(achievement => achievement.id));
    return new Set(ids.filter((id): id is BeanstalkAchievementId => validIds.has(id)));
  } catch {
    return new Set();
  }
}

function resetBeanstalkAchievements(): void {
  setCookie(BEANSTALK_ACHIEVEMENT_COOKIE, '', 0);
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
