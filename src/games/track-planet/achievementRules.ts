import type { PlayerPhysicsSnapshot } from './physics/playerPhysics';

export function shouldAwardPlayerOrbit(snapshot: PlayerPhysicsSnapshot): boolean {
  return !snapshot.grounded && snapshot.orbitPerigeeAltitude > 0;
}

export function shouldAwardPlayerEscape(snapshot: PlayerPhysicsSnapshot): boolean {
  return !snapshot.grounded && snapshot.altitude > 0 && snapshot.speed >= snapshot.escapeSpeed;
}

export function shouldAwardShotPutOrbit(options: {
  boundOrbit: boolean;
  perigeeAltitude: number;
  hasTouchedSurface: boolean;
}): boolean {
  return options.boundOrbit && options.perigeeAltitude > 0 && !options.hasTouchedSurface;
}

export function shouldAwardShotPutEscape(options: {
  boundOrbit: boolean;
  hasTouchedSurface: boolean;
}): boolean {
  return !options.boundOrbit && !options.hasTouchedSurface;
}
