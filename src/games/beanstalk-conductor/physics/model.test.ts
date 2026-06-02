import { describe, expect, it } from 'vitest';
import { createInitialBeanstalkSystem } from './initialState';
import {
  type BarbellState,
  add,
  attachPayloadToEndpoint,
  computeBarbellDerivative,
  detachEndpointMassAsPayload,
  getBarbellAngularMomentumAbout,
  getEndpointState,
  getPayloadAngularMomentumAbout,
  getSystemAngularMomentumAbout,
  length,
  moveFillAcrossBarbell,
  scale,
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
    const beforeAngularMomentum = getSystemAngularMomentumAbout({
      timeSeconds: 0,
      planetRadius: 48,
      gravitationalParameter: 12000,
      barbells: [original],
      payloads: [],
    });
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
    expect(getSystemAngularMomentumAbout({
      timeSeconds: 0,
      planetRadius: 48,
      gravitationalParameter: 12000,
      barbells: [moved],
      payloads: [],
    })).toBeCloseTo(beforeAngularMomentum, 8);
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

  it('detaches endpoint mass as a payload while conserving momentum', () => {
    const original = makeBarbell({
      outer: { upmassTons: 12, downmassTons: 0 },
    });
    const oldMomentum = scale(original.velocity, 172);
    const oldAngularMomentum = getBarbellAngularMomentumAbout(original, original.center);
    const detached = detachEndpointMassAsPayload({
      barbell: original,
      endpoint: 'outer',
      kind: 'upmass',
      massTons: 12,
      payloadId: 'payload',
      deltaVelocity: vec(0, 2),
    });
    const newMomentum = add(scale(detached.barbell.velocity, 160), scale(detached.payload.velocity, 12));
    const newAngularMomentum = (
      getBarbellAngularMomentumAbout(detached.barbell, original.center)
      + getPayloadAngularMomentumAbout(detached.payload, original.center)
    );

    expect(detached.barbell.outer.upmassTons).toBe(0);
    expect(length(sub(newMomentum, oldMomentum))).toBeLessThan(0.0001);
    expect(Math.abs(newAngularMomentum - oldAngularMomentum)).toBeLessThan(0.0001);
  });

  it('attaches a payload at its grab position while conserving momentum', () => {
    const original = makeBarbell();
    const payload = {
      id: 'payload',
      kind: 'upmass' as const,
      massTons: 12,
      position: vec(115, 4),
      velocity: vec(2, 13),
    };
    const finalCenter = scale(add(scale(original.center, 160), scale(payload.position, 12)), 1 / 172);
    const oldMomentum = add(scale(original.velocity, 160), scale(payload.velocity, 12));
    const oldAngularMomentum = (
      getBarbellAngularMomentumAbout(original, finalCenter)
      + getPayloadAngularMomentumAbout(payload, finalCenter)
    );
    const attached = attachPayloadToEndpoint({
      barbell: original,
      endpoint: 'outer',
      payload,
    });
    const newMomentum = scale(attached.velocity, 172);
    const newAngularMomentum = getBarbellAngularMomentumAbout(attached, attached.center);

    expect(attached.outer.upmassTons).toBe(12);
    expect(length(sub(attached.center, finalCenter))).toBeLessThan(0.0001);
    expect(length(sub(newMomentum, oldMomentum))).toBeLessThan(0.0001);
    expect(Math.abs(newAngularMomentum - oldAngularMomentum)).toBeLessThan(0.0001);
  });
});
