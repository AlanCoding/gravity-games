import { describe, expect, it } from 'vitest';
import { createInitialBeanstalkSystem } from './initialState';
import {
  type BarbellState,
  computeBarbellDerivative,
  getEndpointState,
  length,
  moveFillAcrossBarbell,
  stepSystem,
  sub,
  vec,
} from './model';

function makeBarbell(overrides: Partial<BarbellState> = {}): BarbellState {
  return {
    id: 'test-barbell',
    center: vec(100, 0),
    velocity: vec(0, 10),
    angleRad: 0,
    angularVelocityRadPerSecond: 0.1,
    length: 20,
    dryMassTons: 80,
    inner: { upmassTons: 0, downmassTons: 0 },
    outer: { upmassTons: 0, downmassTons: 0 },
    ...overrides,
  };
}

describe('barbell rigid-body model', () => {
  it('applies endpoint gravity instead of center-of-mass gravity', () => {
    const radial = makeBarbell({ angleRad: 0, angularVelocityRadPerSecond: 0 });
    const tilted = makeBarbell({ angleRad: Math.PI / 4, angularVelocityRadPerSecond: 0 });

    expect(Math.abs(computeBarbellDerivative(radial, 12000).angularAcceleration)).toBeLessThan(1e-10);
    expect(Math.abs(computeBarbellDerivative(tilted, 12000).angularAcceleration)).toBeGreaterThan(0.0001);
  });

  it('keeps the tether length fixed while integrating', () => {
    const system = {
      timeSeconds: 0,
      planetRadius: 48,
      gravitationalParameter: 12000,
      barbells: [makeBarbell()],
      payloads: [],
    };

    const next = stepSystem(system, 0.05);
    const inner = getEndpointState(next.barbells[0], 'inner');
    const outer = getEndpointState(next.barbells[0], 'outer');

    expect(length(sub(outer.position, inner.position))).toBeCloseTo(20, 10);
  });

  it('moves fill across a barbell without moving the center of mass', () => {
    const original = makeBarbell({
      inner: { upmassTons: 12, downmassTons: 0 },
      outer: { upmassTons: 0, downmassTons: 0 },
    });
    const beforeInner = getEndpointState(original, 'inner');
    const beforeOuter = getEndpointState(original, 'outer');
    const moved = moveFillAcrossBarbell({
      barbell: original,
      kind: 'upmass',
      from: 'inner',
      to: 'outer',
      massTons: 12,
    });
    const afterInner = getEndpointState(moved, 'inner');
    const afterOuter = getEndpointState(moved, 'outer');

    expect(moved.center).toEqual(original.center);
    expect(moved.inner.upmassTons).toBe(0);
    expect(moved.outer.upmassTons).toBe(12);
    expect(length(sub(beforeOuter.position, beforeInner.position))).toBeCloseTo(20, 10);
    expect(length(sub(afterOuter.position, afterInner.position))).toBeCloseTo(20, 10);
    expect(length(sub(beforeInner.position, original.center))).not.toBeCloseTo(
      length(sub(afterInner.position, moved.center)),
      4,
    );
  });

  it('creates three visually separated initial beanstalk stages', () => {
    const state = createInitialBeanstalkSystem();

    expect(state.barbells).toHaveLength(3);
    for (const barbell of state.barbells) {
      const inner = getEndpointState(barbell, 'inner');
      const outer = getEndpointState(barbell, 'outer');
      expect(length(inner.position)).toBeGreaterThan(state.planetRadius);
      expect(length(outer.position)).toBeGreaterThan(state.planetRadius);
      expect(length(sub(outer.position, inner.position))).toBeCloseTo(barbell.length, 10);
    }
  });
});
