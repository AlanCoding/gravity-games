export type AchievementPayload = {
  speed: number;
  altitude: number;
  elapsed: number;
};

export type AchievementHooks = {
  onJump?: (payload: AchievementPayload) => void;
  onOrbitSpeedReached?: (payload: AchievementPayload) => void;
  onEscapeSpeedReached?: (payload: AchievementPayload) => void;
};

export function createAchievementHooks(): AchievementHooks {
  return {
    onJump: payload => console.debug('achievement hook: jump', payload),
    onOrbitSpeedReached: payload => console.debug('achievement hook: orbital speed', payload),
    onEscapeSpeedReached: payload => console.debug('achievement hook: escape speed', payload),
  };
}
