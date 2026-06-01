export type AchievementPayload = {
  speed: number;
  altitude: number;
  elapsed: number;
  orbitPerigeeAltitude?: number;
  timeSeconds?: number;
};

export type TrackPlanetAchievementId =
  | 'jump'
  | 'player-orbit'
  | 'player-landing-from-orbit'
  | 'player-escape'
  | 'first-shot-put'
  | 'shot-put-orbit'
  | 'shot-put-escape'
  | 'shot-put-one-orbit'
  | 'shot-put-ten-second-airtime'
  | 'shot-put-five-bounces'
  | 'time-100m'
  | 'time-400m'
  | 'time-100m-under-9-9';

export type TrackPlanetAchievement = {
  id: TrackPlanetAchievementId;
  title: string;
};

export const TRACK_PLANET_ACHIEVEMENTS: TrackPlanetAchievement[] = [
  { id: 'jump', title: 'Jump' },
  { id: 'player-orbit', title: 'Reach orbit as the player when perigee altitude stays above the planet' },
  { id: 'player-landing-from-orbit', title: 'Coming in for landing' },
  { id: 'player-escape', title: 'Escape as the player' },
  { id: 'first-shot-put', title: 'Throw a shot put' },
  { id: 'shot-put-orbit', title: 'Shot put reaches orbit' },
  { id: 'shot-put-escape', title: 'Shot put escapes' },
  { id: 'shot-put-one-orbit', title: 'Complete one orbit throw' },
  { id: 'shot-put-ten-second-airtime', title: 'Ten second airtime throw' },
  { id: 'shot-put-five-bounces', title: 'Bounce a shot put five times' },
  { id: 'time-100m', title: '"Your father ran the 100m in ten flat"' },
  { id: 'time-100m-under-9-9', title: '"Well, I\'ll run it in 9.9"' },
  { id: 'time-400m', title: 'Record a 400 m time' },
];

export type AchievementHooks = {
  onJump?: (payload: AchievementPayload) => void;
  onPlayerOrbitReached?: (payload: AchievementPayload) => void;
  onPlayerEscapeReached?: (payload: AchievementPayload) => void;
  onPlayerLandingFromOrbit?: (payload: AchievementPayload) => void;
  onFirstShotPut?: (payload: AchievementPayload) => void;
  onShotPutOrbitReached?: (payload: AchievementPayload) => void;
  onShotPutEscapeReached?: (payload: AchievementPayload) => void;
  onShotPutOneOrbit?: (payload: AchievementPayload) => void;
  onShotPutTenSecondAirtime?: (payload: AchievementPayload) => void;
  onShotPutFiveBounces?: (payload: AchievementPayload) => void;
  on100mTimeRecorded?: (payload: AchievementPayload) => void;
  on400mTimeRecorded?: (payload: AchievementPayload) => void;
  onFast100m?: (payload: AchievementPayload) => void;
};

export function createAchievementHooks(
  notify?: (message: string) => void,
  unlock?: (id: TrackPlanetAchievementId) => void,
): AchievementHooks {
  const award = (id: TrackPlanetAchievementId, message?: string): void => {
    unlock?.(id);
    if (message) {
      notify?.(message);
    }
  };

  return {
    onJump: payload => {
      console.debug('achievement hook: jump', payload);
      award('jump');
    },
    onPlayerOrbitReached: payload => {
      console.debug('achievement hook: player orbit', payload);
      award('player-orbit', 'Player reached orbit');
    },
    onPlayerEscapeReached: payload => {
      console.debug('achievement hook: player escape', payload);
      award('player-escape', 'Player escaped');
    },
    onPlayerLandingFromOrbit: payload => {
      console.debug('achievement hook: player landing from orbit', payload);
      award('player-landing-from-orbit', 'Coming in for landing');
    },
    onFirstShotPut: payload => {
      console.debug('achievement hook: first shot put', payload);
      award('first-shot-put');
    },
    onShotPutOrbitReached: payload => {
      console.debug('achievement hook: shot put orbit', payload);
      award('shot-put-orbit', 'Shot put reached orbit');
    },
    onShotPutEscapeReached: payload => {
      console.debug('achievement hook: shot put escape', payload);
      award('shot-put-escape', 'Shot put escaped');
    },
    onShotPutOneOrbit: payload => {
      console.debug('achievement hook: shot put one orbit', payload);
      award('shot-put-one-orbit');
    },
    onShotPutTenSecondAirtime: payload => {
      console.debug('achievement hook: shot put ten second airtime', payload);
      award('shot-put-ten-second-airtime');
    },
    onShotPutFiveBounces: payload => {
      console.debug('achievement hook: shot put five bounces', payload);
      award('shot-put-five-bounces');
    },
    on100mTimeRecorded: payload => {
      console.debug('achievement hook: 100m time recorded', payload);
      award('time-100m', 'Your father ran the 100m in ten flat');
    },
    on400mTimeRecorded: payload => {
      console.debug('achievement hook: 400m time recorded', payload);
      unlock?.('time-400m');
      if (payload.timeSeconds !== undefined) {
        notify?.(`400m ${payload.timeSeconds.toFixed(2)}s`);
      }
    },
    onFast100m: payload => {
      console.debug('achievement hook: fast 100m', payload);
      award('time-100m-under-9-9', "Well, I'll run it in 9.9");
    },
  };
}
