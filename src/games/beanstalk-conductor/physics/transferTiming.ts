import { cross, dot, length, type Vec2 } from './model';

export type TransferTimingEstimate = {
  supported: true;
  sourceRadius: number;
  targetRadius: number;
  sourceMeanMotionRadPerSecond: number;
  targetMeanMotionRadPerSecond: number;
  transferTimeSeconds: number;
  idealPhaseDeltaRad: number;
  phaseErrorRad: number;
  nextIdealReleaseSeconds: number;
  quality: number;
  windowHalfWidthRad: number;
};

export type UnsupportedTransferTimingEstimate = {
  supported: false;
  reason: 'degenerate-radius' | 'invalid-gravity' | 'no-future-release-time';
};

export type TransferTimingResult = TransferTimingEstimate | UnsupportedTransferTimingEstimate;

const TWO_PI = Math.PI * 2;
const DEFAULT_WINDOW_HALF_WIDTH_RAD = 0.35;
const MIN_RADIUS_DELTA = 0.000001;

export function estimateCircularTransferTiming(options: {
  gravitationalParameter: number;
  sourcePosition: Vec2;
  targetPosition: Vec2;
  windowHalfWidthRad?: number;
}): TransferTimingResult {
  const mu = options.gravitationalParameter;
  const sourceRadius = length(options.sourcePosition);
  const targetRadius = length(options.targetPosition);
  if (mu <= 0 || sourceRadius <= 0 || targetRadius <= 0) {
    return { supported: false, reason: 'invalid-gravity' };
  }
  if (Math.abs(sourceRadius - targetRadius) < MIN_RADIUS_DELTA) {
    return { supported: false, reason: 'degenerate-radius' };
  }

  const sourceMeanMotion = Math.sqrt(mu / (sourceRadius ** 3));
  const targetMeanMotion = Math.sqrt(mu / (targetRadius ** 3));
  const relativeMeanMotion = targetMeanMotion - sourceMeanMotion;
  if (Math.abs(relativeMeanMotion) < 1e-12) {
    return { supported: false, reason: 'degenerate-radius' };
  }

  const transferSemiMajorAxis = (sourceRadius + targetRadius) / 2;
  const transferTimeSeconds = Math.PI * Math.sqrt((transferSemiMajorAxis ** 3) / mu);
  const idealPhaseDeltaRad = wrapRadians(Math.PI - targetMeanMotion * transferTimeSeconds);
  const sourcePhase = Math.atan2(options.sourcePosition.y, options.sourcePosition.x);
  const targetPhase = Math.atan2(options.targetPosition.y, options.targetPosition.x);
  const currentPhaseDelta = wrapRadians(targetPhase - sourcePhase);
  const phaseErrorRad = wrapRadians(currentPhaseDelta - idealPhaseDeltaRad);
  const nextIdealReleaseSeconds = findNextIdealReleaseSeconds({
    currentPhaseDelta,
    idealPhaseDeltaRad,
    relativeMeanMotion,
  });
  if (nextIdealReleaseSeconds === null) {
    return { supported: false, reason: 'no-future-release-time' };
  }

  const windowHalfWidthRad = options.windowHalfWidthRad ?? DEFAULT_WINDOW_HALF_WIDTH_RAD;
  const quality = Math.max(0, 1 - Math.abs(phaseErrorRad) / windowHalfWidthRad);
  return {
    supported: true,
    sourceRadius,
    targetRadius,
    sourceMeanMotionRadPerSecond: sourceMeanMotion,
    targetMeanMotionRadPerSecond: targetMeanMotion,
    transferTimeSeconds,
    idealPhaseDeltaRad,
    phaseErrorRad,
    nextIdealReleaseSeconds,
    quality,
    windowHalfWidthRad,
  };
}

export function wrapRadians(angleRad: number): number {
  let wrapped = angleRad;
  while (wrapped > Math.PI) {
    wrapped -= TWO_PI;
  }
  while (wrapped <= -Math.PI) {
    wrapped += TWO_PI;
  }
  return wrapped;
}

function findNextIdealReleaseSeconds(options: {
  currentPhaseDelta: number;
  idealPhaseDeltaRad: number;
  relativeMeanMotion: number;
}): number | null {
  let best: number | null = null;
  for (let k = -4; k <= 4; k += 1) {
    const candidate = (
      options.idealPhaseDeltaRad
      - options.currentPhaseDelta
      + TWO_PI * k
    ) / options.relativeMeanMotion;
    if (candidate >= -1e-9 && (best === null || candidate < best)) {
      best = Math.max(0, candidate);
    }
  }
  return best;
}

export function angularSeparation(from: Vec2, to: Vec2): number {
  return Math.atan2(cross(from, to), dot(from, to));
}
