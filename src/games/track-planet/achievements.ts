export type AchievementPayload = {
  speed: number;
  altitude: number;
  elapsed: number;
  orbitPerigeeAltitude?: number;
  timeSeconds?: number;
};

export type AchievementHooks = {
  onJump?: (payload: AchievementPayload) => void;
  onPlayerOrbitReached?: (payload: AchievementPayload) => void;
  onPlayerEscapeReached?: (payload: AchievementPayload) => void;
  onPlayerLandingFromOrbit?: (payload: AchievementPayload) => void;
  onShotPutOrbitReached?: (payload: AchievementPayload) => void;
  onShotPutEscapeReached?: (payload: AchievementPayload) => void;
  on100mTimeRecorded?: (payload: AchievementPayload) => void;
  on400mTimeRecorded?: (payload: AchievementPayload) => void;
  onFast100m?: (payload: AchievementPayload) => void;
};

export function createAchievementHooks(notify?: (message: string) => void): AchievementHooks {
  return {
    onJump: payload => console.debug('achievement hook: jump', payload),
    onPlayerOrbitReached: payload => {
      console.debug('achievement hook: player orbit', payload);
      notify?.('Player reached orbit');
    },
    onPlayerEscapeReached: payload => {
      console.debug('achievement hook: player escape', payload);
      notify?.('Player escaped');
    },
    onPlayerLandingFromOrbit: payload => {
      console.debug('achievement hook: player landing from orbit', payload);
      notify?.('Coming in for landing');
    },
    onShotPutOrbitReached: payload => {
      console.debug('achievement hook: shot put orbit', payload);
      notify?.('Shot put reached orbit');
    },
    onShotPutEscapeReached: payload => {
      console.debug('achievement hook: shot put escape', payload);
      notify?.('Shot put escaped');
    },
    on100mTimeRecorded: payload => {
      console.debug('achievement hook: 100m time recorded', payload);
      notify?.('Your father ran the 100m in ten flat');
    },
    on400mTimeRecorded: payload => {
      console.debug('achievement hook: 400m time recorded', payload);
      if (payload.timeSeconds !== undefined) {
        notify?.(`400m ${payload.timeSeconds.toFixed(2)}s`);
      }
    },
    onFast100m: payload => {
      console.debug('achievement hook: fast 100m', payload);
      notify?.("Well, I'll run it in 9.9");
    },
  };
}
