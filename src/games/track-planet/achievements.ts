export type AchievementPayload = {
  speed: number;
  altitude: number;
  elapsed: number;
  orbitPerigeeAltitude?: number;
};

export type AchievementHooks = {
  onJump?: (payload: AchievementPayload) => void;
  onPlayerOrbitReached?: (payload: AchievementPayload) => void;
  onPlayerEscapeReached?: (payload: AchievementPayload) => void;
  onShotPutOrbitReached?: (payload: AchievementPayload) => void;
  onShotPutEscapeReached?: (payload: AchievementPayload) => void;
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
    onShotPutOrbitReached: payload => {
      console.debug('achievement hook: shot put orbit', payload);
      notify?.('Shot put reached orbit');
    },
    onShotPutEscapeReached: payload => {
      console.debug('achievement hook: shot put escape', payload);
      notify?.('Shot put escaped');
    },
  };
}
