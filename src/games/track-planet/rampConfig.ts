import { latitudeOffsetToDegrees } from '../../engine/planetPlacement';

export const RAMP_CONFIG = {
  longitudeDeg: 38,
  radialOffset: 9.6,
  headingDeg: 0,
  width: 30,
  rampLength: 25,
  topLength: 15,
  height: 9,
  segmentLength: 5,
  surfaceLift: 0.08,
};

export type RampSegmentSpan = {
  startDistance: number;
  endDistance: number;
  centerDistance: number;
  startHeight: number;
  endHeight: number;
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

export function getRampSegmentSpans(): RampSegmentSpan[] {
  const totalLength = getRampTotalLength();
  const segmentCount = Math.ceil(totalLength / RAMP_CONFIG.segmentLength);
  const halfLength = totalLength / 2;

  return Array.from({ length: segmentCount }, (_, index) => {
    const startDistance = -halfLength + index * RAMP_CONFIG.segmentLength;
    const endDistance = Math.min(startDistance + RAMP_CONFIG.segmentLength, halfLength);
    const centerDistance = (startDistance + endDistance) / 2;
    return {
      startDistance,
      endDistance,
      centerDistance,
      startHeight: getRampHeightAtDistance(startDistance),
      endHeight: getRampHeightAtDistance(endDistance),
    };
  });
}
