import { latitudeOffsetToDegrees } from '../../engine/planetPlacement';

export const RAMP_CONFIG = {
  longitudeDeg: 38,
  radialOffset: 8,
  headingDeg: 90,
  width: 6,
  rampLength: 5,
  topLength: 3,
  height: 1.8,
};

export function getRampTotalLength(): number {
  return RAMP_CONFIG.rampLength * 2 + RAMP_CONFIG.topLength;
}

export function getRampHeightAtDistance(distance: number): number {
  const half = getRampTotalLength() / 2;
  const absDistance = Math.abs(distance);
  if (absDistance > half) {
    return 0;
  }

  const rampStart = half - RAMP_CONFIG.rampLength;
  if (absDistance <= rampStart) {
    return RAMP_CONFIG.height;
  }

  const t = (absDistance - rampStart) / RAMP_CONFIG.rampLength;
  return RAMP_CONFIG.height * (1 - t);
}

export function getRampLatitudeDegAtDistance(planetRadius: number, distance: number): number {
  return latitudeOffsetToDegrees(distance, planetRadius);
}

export function getRampLongitudeDeg(): number {
  return RAMP_CONFIG.longitudeDeg;
}

export function getRampCenterHeadingDeg(): number {
  return RAMP_CONFIG.headingDeg;
}

export function getRampLatitudeDeg(distance: number, planetRadius: number): number {
  return getRampLatitudeDegAtDistance(planetRadius, distance);
}
