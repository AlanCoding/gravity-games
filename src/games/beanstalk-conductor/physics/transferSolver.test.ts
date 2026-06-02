import { describe, expect, it } from 'vitest';
import {
  type BarbellState,
  type BeanstalkSystemState,
  add,
  fromAngle,
  getEndpointState,
  length,
  rotate90,
  scale,
  sub,
  vec,
} from './model';
import {
  applyCorrectionMomentumToEndpoint,
  computePerigeeRadius,
  solvePlanetDisposalCorrection,
  solveTransferCorrection,
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

function makeStraightAngularFixture(targetCenter = vec(10, 10)): BeanstalkSystemState {
  return {
    timeSeconds: 0,
    planetRadius: 1,
    gravitationalParameter: 0,
    barbells: [
      makeBarbell({
        id: 'source',
        center: vec(10, 0),
        velocity: vec(0, 1),
        length: 0,
        outer: { upmassTons: 12, downmassTons: 0 },
      }),
      makeBarbell({
        id: 'target',
        center: targetCenter,
        velocity: vec(0, 0),
        length: 0,
        inner: { upmassTons: 0, downmassTons: 12 },
      }),
    ],
    payloads: [],
  };
}

describe('transfer solver', () => {
  it('uses a scalar correction along the source endpoint tangent', () => {
    const state = makeStraightAngularFixture();
    const target = makeTarget();
    const source = state.barbells.find(barbell => barbell.id === 'source');
    expect(source).toBeDefined();
    const endpoint = getEndpointState(source!, 'outer');
    const radialVelocity = scale(endpoint.position, (endpoint.velocity.x * endpoint.position.x + endpoint.velocity.y * endpoint.position.y) / (length(endpoint.position) ** 2));
    const tangentVelocity = sub(endpoint.velocity, radialVelocity);
    const solved = solveTransferCorrection(state, target);

    expect(solved.converged).toBe(true);
    expect(solved.missDistance).toBeLessThanOrEqual(0.001);
    expect(Math.abs(solved.scalarCorrection)).toBeCloseTo(solved.correctionMagnitude, 8);
    expect(Math.abs(solved.deltaVelocity.x * tangentVelocity.y - solved.deltaVelocity.y * tangentVelocity.x)).toBeLessThan(0.0001);
  });

  it('reports blackout when no scalar root is bracketed inside the search limit', () => {
    const state = makeStraightAngularFixture(vec(20, 20));
    const target: TransferTarget = {
      sourceBarbellId: 'source',
      sourceEndpoint: 'outer',
      targetBarbellId: 'target',
      targetEndpoint: 'inner',
      kind: 'upmass',
      massTons: 12,
      durationSeconds: 10,
    };
    const solved = solveTransferCorrection(state, target);

    expect(solved.converged).toBe(false);
    expect(solved.failureReason).toBe('no-scalar-root');
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

  it('computes perigee from orbital state', () => {
    const radius = 100;
    const mu = 12000;
    const position = vec(radius, 0);
    const circularVelocity = vec(0, Math.sqrt(mu / radius));

    expect(computePerigeeRadius(position, circularVelocity, mu)).toBeCloseTo(radius, 8);
  });

  it('solves downmass disposal by pushing perigee to the planet surface', () => {
    const radius = 100;
    const mu = 12000;
    const radial = fromAngle(0);
    const tangent = rotate90(radial);
    const state: BeanstalkSystemState = {
      timeSeconds: 0,
      planetRadius: 48,
      gravitationalParameter: mu,
      barbells: [
        makeBarbell({
          id: 'source',
          center: scale(radial, radius),
          velocity: scale(tangent, Math.sqrt(mu / radius)),
          angleRad: 0,
          length: 0,
          inner: { upmassTons: 0, downmassTons: 12 },
        }),
      ],
      payloads: [],
    };
    const target: TransferTarget = {
      sourceBarbellId: 'source',
      sourceEndpoint: 'inner',
      targetBarbellId: 'civic-prime-disposal',
      targetEndpoint: 'outer',
      destinationKind: 'planet-disposal',
      kind: 'downmass',
      massTons: 12,
      durationSeconds: 10,
    };

    const solved = solvePlanetDisposalCorrection(state, target, { tolerance: 0.00001 });
    const sourceEndpoint = getEndpointState(state.barbells[0], 'inner');
    const perigee = computePerigeeRadius(sourceEndpoint.position, add(sourceEndpoint.velocity, solved.deltaVelocity), mu);

    expect(solved.converged).toBe(true);
    expect(perigee).toBeCloseTo(state.planetRadius, 4);
  });
});
