import { createAchievementHooks } from './achievements';
import { TrackPlanetGame } from './TrackPlanetGame';

export const trackPlanetGame = {
  id: 'track-planet',
  title: 'Track Planet',
  description: 'Run, strafe, and jump around a 400 m circumference track planet.',
  create: (options: {
    container: HTMLElement;
    velocityDisplay: HTMLElement | null;
    orbitalDisplay: HTMLElement | null;
    throwChargeDisplay: HTMLElement | null;
    longitudeDisplay: HTMLElement | null;
    latitudeDisplay: HTMLElement | null;
    altitudeDisplay: HTMLElement | null;
    throwDisplay: HTMLElement | null;
    achievementNotifier?: (message: string) => void;
  }): TrackPlanetGame =>
    new TrackPlanetGame({
      ...options,
      achievements: createAchievementHooks(options.achievementNotifier),
    }),
};
