import { describe, expect, it } from 'vitest';
import { fromAngle, scale } from './model';
import { estimateCircularTransferTiming, wrapRadians } from './transferTiming';

const MU = 12000;

function idealDelta(sourceRadius: number, targetRadius: number): number {
  const targetMeanMotion = Math.sqrt(MU / (targetRadius ** 3));
  const transferSemiMajorAxis = (sourceRadius + targetRadius) / 2;
  const transferTime = Math.PI * Math.sqrt((transferSemiMajorAxis ** 3) / MU);
  return wrapRadians(Math.PI - targetMeanMotion * transferTime);
}

describe('circular transfer timing estimate', () => {
  it('peaks at the ideal upward endpoint-to-endpoint phase', () => {
    const sourceRadius = 100;
    const targetRadius = 180;
    const estimate = estimateCircularTransferTiming({
      gravitationalParameter: MU,
      sourcePosition: scale(fromAngle(0), sourceRadius),
      targetPosition: scale(fromAngle(idealDelta(sourceRadius, targetRadius)), targetRadius),
    });

    expect(estimate.supported).toBe(true);
    if (!estimate.supported) {
      return;
    }
    expect(estimate.phaseErrorRad).toBeCloseTo(0, 10);
    expect(estimate.quality).toBeCloseTo(1, 10);
    expect(estimate.nextIdealReleaseSeconds).toBeCloseTo(0, 10);
  });

  it('peaks at the ideal downward endpoint-to-endpoint phase', () => {
    const sourceRadius = 180;
    const targetRadius = 100;
    const estimate = estimateCircularTransferTiming({
      gravitationalParameter: MU,
      sourcePosition: scale(fromAngle(0), sourceRadius),
      targetPosition: scale(fromAngle(idealDelta(sourceRadius, targetRadius)), targetRadius),
    });

    expect(estimate.supported).toBe(true);
    if (!estimate.supported) {
      return;
    }
    expect(estimate.phaseErrorRad).toBeCloseTo(0, 10);
    expect(estimate.quality).toBeCloseTo(1, 10);
    expect(estimate.nextIdealReleaseSeconds).toBeCloseTo(0, 10);
  });

  it('returns zero quality outside the fixed angular fudge window', () => {
    const sourceRadius = 100;
    const targetRadius = 180;
    const estimate = estimateCircularTransferTiming({
      gravitationalParameter: MU,
      sourcePosition: scale(fromAngle(0), sourceRadius),
      targetPosition: scale(fromAngle(idealDelta(sourceRadius, targetRadius) + 0.8), targetRadius),
      windowHalfWidthRad: 0.35,
    });

    expect(estimate.supported).toBe(true);
    if (!estimate.supported) {
      return;
    }
    expect(estimate.quality).toBe(0);
  });

  it('wraps the ideal phase error across the pi boundary', () => {
    const sourceRadius = 100;
    const targetRadius = 180;
    const sourceAngle = Math.PI - 0.05;
    const targetAngle = wrapRadians(sourceAngle + idealDelta(sourceRadius, targetRadius) + 0.02);
    const estimate = estimateCircularTransferTiming({
      gravitationalParameter: MU,
      sourcePosition: scale(fromAngle(sourceAngle), sourceRadius),
      targetPosition: scale(fromAngle(targetAngle), targetRadius),
    });

    expect(estimate.supported).toBe(true);
    if (!estimate.supported) {
      return;
    }
    expect(estimate.phaseErrorRad).toBeCloseTo(0.02, 10);
    expect(estimate.quality).toBeGreaterThan(0.9);
  });

  it('reports the smallest future ideal release time', () => {
    const sourceRadius = 100;
    const targetRadius = 180;
    const sourceMeanMotion = Math.sqrt(MU / (sourceRadius ** 3));
    const targetMeanMotion = Math.sqrt(MU / (targetRadius ** 3));
    const leadTimeSeconds = 4;
    const phaseBeforeIdeal = idealDelta(sourceRadius, targetRadius)
      - (targetMeanMotion - sourceMeanMotion) * leadTimeSeconds;
    const estimate = estimateCircularTransferTiming({
      gravitationalParameter: MU,
      sourcePosition: scale(fromAngle(0), sourceRadius),
      targetPosition: scale(fromAngle(phaseBeforeIdeal), targetRadius),
    });

    expect(estimate.supported).toBe(true);
    if (!estimate.supported) {
      return;
    }
    expect(estimate.nextIdealReleaseSeconds).toBeCloseTo(leadTimeSeconds, 10);
  });
});
