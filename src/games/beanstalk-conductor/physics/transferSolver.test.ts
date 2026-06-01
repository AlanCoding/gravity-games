import { describe, expect, it } from 'vitest';
import {
  type BarbellState,
  type BeanstalkSystemState,
  add,
  getEndpointState,
  length,
  scale,
  sub,
  vec,
} from './model';
import {
  applyCorrectionMomentumToEndpoint,
  simulateTransfer,
  solveTransferCorrection,
  vBuckCostFromCorrection,
  type TransferTarget,
} from './transferSolver';

function makeBarbell(overrides: Partial<BarbellState>): BarbellState {
  return {
    id: 'barbell',
    center: vec(0, 0),
    velocity: vec(0, 0),
    angleRad: 0,
    angularVelocityRadPerSecond: 0,
    length: 2,
    dryMassTons: 80,
    inner: { upmassTons: 0, downmassTons: 0 },
    outer: { upmassTons: 0, downmassTons: 0 },
    ...overrides,
  };
}

function makeLinearFixture(targetCenter = vec(101.86046511627907, 0)): BeanstalkSystemState {
  return {
    timeSeconds: 0,
    planetRadius: 10,
    gravitationalParameter: 0,
    barbells: [
      makeBarbell({
        id: 'source',
        center: vec(0, 0),
        velocity: vec(10, 0),
        outer: { upmassTons: 12, downmassTons: 0 },
      }),
      makeBarbell({
        id: 'target',
        center: targetCenter,
        velocity: vec(0, 0),
        inner: { upmassTons: 0, downmassTons: 12 },
      }),
    ],
    payloads: [],
  };
}

function makeTarget(durationSeconds = 10): TransferTarget {
  return {
    sourceBarbellId: 'source',
    sourceEndpoint: 'outer',
    targetBarbellId: 'target',
    targetEndpoint: 'inner',
    kind: 'upmass',
    massTons: 12,
    durationSeconds,
  };
}

describe('transfer solver', () => {
  it('uses zero relative release velocity as the nominal transfer', () => {
    const state = makeLinearFixture();
    const source = state.barbells.find(barbell => barbell.id === 'source');
    expect(source).toBeDefined();
    const endpoint = getEndpointState(source!, 'outer');
    const solved = solveTransferCorrection(state, makeTarget());

    expect(solved.converged).toBe(true);
    expect(solved.correctionMagnitude).toBeLessThan(0.0001);
    expect(endpoint.velocity).toEqual(vec(10, 0));
  });

  it('solves a badly timed transfer by adding correction velocity at a vBucks cost', () => {
    const goodState = makeLinearFixture();
    const badState = makeLinearFixture(vec(102, 60));
    const target = makeTarget();
    const good = solveTransferCorrection(goodState, target);
    const bad = solveTransferCorrection(badState, target);
    const resolvedBad = simulateTransfer(badState, target, bad.deltaVelocity);
    const payload = resolvedBad.payloads.find(candidate => candidate.id === 'solver-payload');
    const targetBarbell = resolvedBad.barbells.find(barbell => barbell.id === 'target');

    expect(good.converged).toBe(true);
    expect(bad.converged).toBe(true);
    expect(bad.correctionMagnitude).toBeGreaterThan(good.correctionMagnitude + 5);
    expect(vBuckCostFromCorrection(bad.deltaVelocity, target.massTons)).toBeGreaterThan(800);
    expect(payload).toBeDefined();
    expect(targetBarbell).toBeDefined();
    expect(length(sub(payload!.position, getEndpointState(targetBarbell!, 'inner').position))).toBeLessThan(0.1);
  });

  it('applies equal and opposite correction momentum to the source endpoint', () => {
    const state = makeLinearFixture();
    const before = state.barbells[0];
    const corrected = applyCorrectionMomentumToEndpoint({
      state,
      barbellId: 'source',
      endpoint: 'outer',
      deltaVelocity: vec(2, 3),
      payloadMassTons: 12,
    });
    const after = corrected.barbells[0];

    expect(after.velocity.x).toBeLessThan(before.velocity.x);
    expect(after.velocity.y).toBeLessThan(before.velocity.y);
    expect(after.angularVelocityRadPerSecond).toBeLessThan(before.angularVelocityRadPerSecond);
  });

  it('shows the correction impulse direction matches lost payload momentum', () => {
    const state = makeLinearFixture();
    const deltaVelocity = vec(3, 0);
    const corrected = applyCorrectionMomentumToEndpoint({
      state,
      barbellId: 'source',
      endpoint: 'outer',
      deltaVelocity,
      payloadMassTons: 12,
    });
    const sourceBefore = state.barbells[0];
    const sourceAfter = corrected.barbells[0];
    const barbellMomentumChange = scale(sub(sourceAfter.velocity, sourceBefore.velocity), 172);

    expect(length(add(barbellMomentumChange, scale(deltaVelocity, 12)))).toBeLessThan(0.0001);
  });
});
