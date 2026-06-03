import { describe, expect, it } from 'vitest';
import {
  createInitialBeanstalkSystem,
  DYNAMIC_MASS_TONS,
  getFleetCentralState,
} from './physics/initialState';
import {
  type BeanstalkSystemState,
  dot,
  fromAngle,
  getEndpointState,
  getSystemAngularMomentumAbout,
  length,
  normalize,
  rotate90,
  scale,
  stepSystem,
  vec,
} from './physics/model';
import {
  createTransferLaunch,
  detectInfrastructureCollision,
  didPassCatchAngle,
  getAvailableTransfers,
  getTransferAvailabilityIssue,
  resolveCaughtTransfer,
  resolveTransfer,
  simulateToAngularCatch,
  stepTransferToCatch,
} from './gameLogic';
import { solveTransferCorrection } from './physics/transferSolver';

function expectAngularMomentumConserved(state: BeanstalkSystemState, expected: number): void {
  expect(getSystemAngularMomentumAbout(state)).toBeCloseTo(expected, 6);
}

function resolveNamedTransfer(
  state: BeanstalkSystemState,
  predicate: (label: string) => boolean,
): BeanstalkSystemState {
  const transfers = getAvailableTransfers(state);
  const transfer = transfers.find(candidate => predicate(candidate.label));
  expect(transfer, transfers.map(candidate => candidate.label).join(', ')).toBeDefined();
  return resolveTransfer(state, transfer!).state;
}

function findStateWithSolvedTransfer(options: {
  sourceBarbellId: string;
  kind: 'upmass' | 'downmass';
  maxSeconds?: number;
  stepSeconds?: number;
}): { state: BeanstalkSystemState; transfer: ReturnType<typeof getAvailableTransfers>[number] } {
  let state = options.sourceBarbellId === 'civic-prime-space-gun'
    ? stepStateForTest(createInitialBeanstalkSystem(), 60, 0.25)
    : createInitialBeanstalkSystem();
  const initialTransfer = getAvailableTransfers(state).find(candidate => (
    candidate.sourceBarbellId === options.sourceBarbellId
    && candidate.kind === options.kind
  ));
  if (initialTransfer && solveTransferCorrection(state, initialTransfer).converged) {
    return { state, transfer: initialTransfer };
  }
  const maxSeconds = options.maxSeconds ?? 300;
  const stepSeconds = options.stepSeconds ?? 1;
  for (let elapsed = 0; elapsed <= maxSeconds; elapsed += stepSeconds) {
    const transfer = getAvailableTransfers(state).find(candidate => (
      candidate.sourceBarbellId === options.sourceBarbellId
      && candidate.kind === options.kind
    ));
    if (transfer && solveTransferCorrection(state, transfer).converged) {
      return { state, transfer };
    }
    state = stepSystem(state, stepSeconds);
  }
  throw new Error(`No solved ${options.kind} transfer from ${options.sourceBarbellId} in ${maxSeconds}s.`);
}

function stepStateForTest(state: BeanstalkSystemState, seconds: number, stepSeconds: number): BeanstalkSystemState {
  let next = state;
  for (let elapsed = 0; elapsed < seconds; elapsed += stepSeconds) {
    next = stepSystem(next, Math.min(stepSeconds, seconds - elapsed));
  }
  return next;
}

function makePointBarbell(id: string, radius: number, angleRad: number): BeanstalkSystemState['barbells'][number] {
  return {
    id,
    center: scale(fromAngle(angleRad), radius),
    velocity: vec(0, 0),
    angleRad,
    angularVelocityRadPerSecond: 0,
    length: 0,
    dryMassTons: 80,
    inner: { upmassTons: 0, downmassTons: 0 },
    outer: { upmassTons: 0, downmassTons: 0 },
  };
}

describe('Beanstalk Conductor game logic', () => {
  it('finds adjacent upmass and downmass timing opportunities', () => {
    const state = createInitialBeanstalkSystem();
    const transfers = getAvailableTransfers(state);

    expect(transfers.map(transfer => transfer.kind)).toEqual(['upmass', 'downmass']);
    expect(transfers.every(transfer => transfer.mode === 'source-load')).toBe(true);
    expect(transfers.map(transfer => transfer.sourceBarbellId)).toEqual([
      'civic-prime-space-gun',
      'fleet-central-downmass-source',
    ]);
    expect(transfers[0].targetBarbellId).toBe('stage-1');
    expect(transfers[0].targetEndpoint).toBe('inner');
    expect(transfers[1].targetBarbellId).toBe('stage-3');
    expect(transfers[1].targetEndpoint).toBe('outer');
  });

  it('launches a fresh dynamic mass from Civic Prime as a simulated payload without endpoint fill or cost', () => {
    const { state, transfer } = findStateWithSolvedTransfer({
      sourceBarbellId: 'civic-prime-space-gun',
      kind: 'upmass',
    });
    const launch = createTransferLaunch(state, transfer);
    const targetAfterLaunch = launch.state.barbells.find(barbell => barbell.id === transfer.targetBarbellId);

    expect(transfer.massTons).toBe(DYNAMIC_MASS_TONS);
    expect(launch.state.payloads).toHaveLength(1);
    expect(launch.state.payloads[0].position).toEqual({ x: state.planetRadius, y: 0 });
    expect(targetAfterLaunch?.inner.upmassTons).toBe(0);
    expect(launch.releaseSpeed).toBeCloseTo(length(launch.state.payloads[0].velocity));

    const caught = simulateToAngularCatch(launch);
    const resolved = resolveCaughtTransfer(caught.state, transfer, caught.correctionMagnitude, caught.releaseSpeed);
    const targetAfterCatch = resolved.state.barbells.find(barbell => barbell.id === transfer.targetBarbellId);

    expect(targetAfterCatch?.inner.upmassTons).toBe(DYNAMIC_MASS_TONS);
    expect(resolved.costVBucks).toBe(0);
    expect(resolved.releaseSpeed).toBeCloseTo(launch.releaseSpeed);
    expect(Number.isFinite(resolved.altitudeError)).toBe(true);
    expect(resolved.message).toContain('Source transfer complete');
  });

  it('launches the initial Fleet Central downmass as a physical transfer-orbit payload', () => {
    const state = createInitialBeanstalkSystem();
    const downmass = getAvailableTransfers(state).find(transfer => transfer.kind === 'downmass');
    expect(downmass).toBeDefined();
    const target = state.barbells.find(barbell => barbell.id === downmass!.targetBarbellId);

    const launch = createTransferLaunch(state, downmass!);

    expect(launch.state.payloads).toHaveLength(1);
    expect(launch.releaseSpeed).toBeCloseTo(length(launch.state.payloads[0].velocity));
    expect(target?.outer.downmassTons).toBe(0);
    expect(launch.correctionMagnitude).toBeLessThan(1);
  });

  it('finds at least one Fleet Central downmass release window in the first station orbit', () => {
    let state = createInitialBeanstalkSystem();
    let usableWindow: {
      scalarCorrection: number;
      tangentialSpeed: number;
      stationSpeed: number;
    } | null = null;

    for (let elapsed = 0; elapsed <= 270; elapsed += 5) {
      const downmass = getAvailableTransfers(state).find(transfer => (
        transfer.sourceBarbellId === 'fleet-central-downmass-source'
        && transfer.kind === 'downmass'
      ));
      expect(downmass).toBeDefined();
      const solved = solveTransferCorrection(state, downmass!);
      if (solved.converged) {
        const station = getFleetCentralState({
          timeSeconds: state.timeSeconds,
          gravitationalParameter: state.gravitationalParameter,
        });
        const tangentialSpeed = length(station.velocity) + solved.scalarCorrection;
        usableWindow = {
          scalarCorrection: solved.scalarCorrection,
          tangentialSpeed,
          stationSpeed: length(station.velocity),
        };
        break;
      }
      state = stepSystem(state, 5);
    }

    expect(usableWindow).not.toBeNull();
    expect(usableWindow?.scalarCorrection).toBeLessThan(0);
    expect(usableWindow?.tangentialSpeed).toBeGreaterThan(0);
    expect(usableWindow?.tangentialSpeed).toBeGreaterThan(usableWindow!.stationSpeed * 0.85);
  });

  it('reports the best finite Fleet Central miss when angular crossings exist but no scalar root is available', () => {
    let state = createInitialBeanstalkSystem();
    for (let elapsed = 0; elapsed < 60; elapsed += 0.05) {
      state = stepSystem(state, 0.05);
    }
    const downmass = getAvailableTransfers(state).find(transfer => (
      transfer.sourceBarbellId === 'fleet-central-downmass-source'
      && transfer.kind === 'downmass'
    ));
    expect(downmass).toBeDefined();

    const solved = solveTransferCorrection(state, downmass!);

    expect(solved.converged).toBe(false);
    expect(solved.failureReason).toBe('no-scalar-root');
    expect(Number.isFinite(solved.missDistance)).toBe(true);
    expect(solved.correctionMagnitude).toBeGreaterThan(0);
  });

  it('finds a second Fleet Central downmass window after the first one clears the outer endpoint', () => {
    const { state, transfer } = findStateWithSolvedTransfer({
      sourceBarbellId: 'fleet-central-downmass-source',
      kind: 'downmass',
    });
    const launch = createTransferLaunch(state, transfer);
    const caught = simulateToAngularCatch(launch);
    const resolved = resolveCaughtTransfer(caught.state, transfer, caught.correctionMagnitude, caught.releaseSpeed);
    let secondState = resolveNamedTransfer(resolved.state, label => label === 'stage-3 downmass across tether');
    for (let elapsed = 0; elapsed < 10; elapsed += 5) {
      secondState = stepSystem(secondState, 5);
    }
    const secondTransfer = getAvailableTransfers(secondState).find(candidate => (
      candidate.sourceBarbellId === 'fleet-central-downmass-source'
      && candidate.kind === 'downmass'
    ));
    expect(secondTransfer).toBeDefined();
    const solved = solveTransferCorrection(secondState, secondTransfer!);

    expect(solved.converged).toBe(true);
    expect(solved.scalarCorrection).toBeLessThan(0);
    const station = getFleetCentralState({
      timeSeconds: secondState.timeSeconds,
      gravitationalParameter: secondState.gravitationalParameter,
    });
    expect(length(station.velocity) + solved.scalarCorrection).toBeGreaterThan(0);
  });

  it('hides Civic Prime when the lowest first-stage upmass endpoint is already filled', () => {
    const state = createInitialBeanstalkSystem();
    state.barbells[0].inner.upmassTons = DYNAMIC_MASS_TONS;
    const sourceLoad = getAvailableTransfers(state).find(transfer => transfer.sourceBarbellId === 'civic-prime-space-gun');

    expect(sourceLoad).toBeUndefined();
  });

  it('keeps Civic Prime selectable when only the higher first-stage upmass endpoint is filled', () => {
    const state = createInitialBeanstalkSystem();
    state.barbells[0].outer.upmassTons = DYNAMIC_MASS_TONS;
    const sourceLoad = getAvailableTransfers(state).find(transfer => transfer.sourceBarbellId === 'civic-prime-space-gun');

    expect(sourceLoad).toBeDefined();
    expect(sourceLoad?.targetEndpoint).toBe('inner');
  });

  it('loads Civic Prime upmass into the nearest radial endpoint when endpoint names are swapped', () => {
    const state = createInitialBeanstalkSystem();
    state.barbells[0].angleRad = Math.PI;
    const sourceLoad = getAvailableTransfers(state).find(transfer => transfer.sourceBarbellId === 'civic-prime-space-gun');
    const lowerEndpoint = length(getEndpointState(state.barbells[0], 'outer').position)
      < length(getEndpointState(state.barbells[0], 'inner').position)
      ? 'outer'
      : 'inner';

    expect(sourceLoad).toBeDefined();
    expect(sourceLoad?.targetEndpoint).toBe(lowerEndpoint);
  });

  it('loads Fleet Central downmass into the farthest radial endpoint when endpoint names are swapped', () => {
    const state = createInitialBeanstalkSystem();
    state.barbells[2].angleRad = Math.PI;
    const sourceLoad = getAvailableTransfers(state).find(transfer => transfer.sourceBarbellId === 'fleet-central-downmass-source');
    const higherEndpoint = length(getEndpointState(state.barbells[2], 'outer').position)
      > length(getEndpointState(state.barbells[2], 'inner').position)
      ? 'outer'
      : 'inner';

    expect(sourceLoad).toBeDefined();
    expect(sourceLoad?.targetEndpoint).toBe(higherEndpoint);
  });

  it('targets the nearest radial endpoint on the next barbell for upward transfers', () => {
    const state = createInitialBeanstalkSystem();
    state.barbells[0].outer.upmassTons = DYNAMIC_MASS_TONS;
    state.barbells[1].angleRad = -Math.PI / 2;
    const transfer = getAvailableTransfers(state).find(candidate => (
      candidate.mode === 'transfer'
      && candidate.kind === 'upmass'
      && candidate.targetBarbellId === 'stage-2'
    ));
    const lowerEndpoint = length(getEndpointState(state.barbells[1], 'outer').position)
      < length(getEndpointState(state.barbells[1], 'inner').position)
      ? 'outer'
      : 'inner';

    expect(transfer).toBeDefined();
    expect(transfer?.targetEndpoint).toBe(lowerEndpoint);
  });

  it('keeps the starting source selections available and radially ordered while the system idles', () => {
    let state = createInitialBeanstalkSystem();

    for (let step = 0; step < 20; step += 1) {
      const sourceIds = getAvailableTransfers(state)
        .filter(transfer => transfer.mode === 'source-load')
        .map(transfer => transfer.sourceBarbellId);

      expect(sourceIds).toEqual([
        'civic-prime-space-gun',
        'fleet-central-downmass-source',
      ]);
      state = stepSystem(state, 1);
    }
  });

  it('does not block Civic Prime source launch with obsolete line-of-sight checks', () => {
    const state = createInitialBeanstalkSystem();
    state.barbells[0].center = { x: -88, y: 0 };
    state.barbells[0].angleRad = Math.PI;
    const sourceLoad = getAvailableTransfers(state).find(transfer => transfer.sourceBarbellId === 'civic-prime-space-gun');

    expect(sourceLoad).toBeDefined();
    expect(getTransferAvailabilityIssue(state, sourceLoad!)).toBeNull();
  });

  it('keeps natural release inside barbell-to-barbell apsis search bounds', () => {
    const state = createInitialBeanstalkSystem();
    state.barbells[0].outer.upmassTons = DYNAMIC_MASS_TONS;
    const transfer = getAvailableTransfers(state).find(candidate => (
      candidate.mode === 'transfer'
      && candidate.kind === 'upmass'
      && candidate.sourceBarbellId === 'stage-1'
      && candidate.targetBarbellId === 'stage-2'
    ));
    expect(transfer).toBeDefined();

    const solved = solveTransferCorrection(state, transfer!);

    expect(solved.scalarBounds?.low).toBeLessThan(0);
    expect(solved.scalarBounds?.high).toBeGreaterThan(0);
    expect(solved.scalarBounds?.low).toBeLessThan(solved.scalarBounds!.high);
    expect(Math.abs(solved.scalarBounds!.low)).toBeCloseTo(Math.abs(solved.scalarBounds!.high));
    expect(solved.boundEvaluations?.low.scalarCorrection).toBeCloseTo(solved.scalarBounds!.low);
    expect(solved.boundEvaluations?.high.scalarCorrection).toBeCloseTo(solved.scalarBounds!.high);
  });

  it('uses circularizing the source barbell end as one barbell-to-barbell search bound', () => {
    const state = createInitialBeanstalkSystem();
    state.barbells[0].outer.upmassTons = DYNAMIC_MASS_TONS;
    const sourceEndpoint = getEndpointState(state.barbells[0], 'outer');
    const sourceRadius = length(sourceEndpoint.position);
    const tangent = rotate90(normalize(sourceEndpoint.position));
    const currentTangentialSpeed = dot(sourceEndpoint.velocity, tangent);
    const circularizationCorrection = Math.sqrt(state.gravitationalParameter / sourceRadius) - currentTangentialSpeed;
    const transfer = getAvailableTransfers(state).find(candidate => (
      candidate.mode === 'transfer'
      && candidate.kind === 'upmass'
      && candidate.sourceBarbellId === 'stage-1'
      && candidate.targetBarbellId === 'stage-2'
    ));
    expect(transfer).toBeDefined();

    const solved = solveTransferCorrection(state, transfer!);

    expect(circularizationCorrection).toBeLessThan(0);
    expect(solved.scalarBounds?.low).toBeCloseTo(circularizationCorrection);
    expect(solved.scalarBounds?.high).toBeGreaterThan(0);
  });

  it('does not bisect across a non-catching scalar gap even when physical bounds flip altitude sign', () => {
    const state = createInitialBeanstalkSystem();
    state.barbells[0].outer.upmassTons = DYNAMIC_MASS_TONS;
    const transfer = getAvailableTransfers(state).find(candidate => (
      candidate.mode === 'transfer'
      && candidate.kind === 'upmass'
      && candidate.sourceBarbellId === 'stage-1'
      && candidate.targetBarbellId === 'stage-2'
    ));
    expect(transfer).toBeDefined();

    const solved = solveTransferCorrection(state, transfer!, { collectTrace: true });
    const firstBisect = solved.trace?.find(event => event.phase === 'bisect');

    expect(solved.converged).toBe(false);
    expect(solved.failureReason).toBe('no-scalar-root');
    expect(solved.boundEvaluations?.low.crossedTargetAngle).toBe(true);
    expect(solved.boundEvaluations?.high.crossedTargetAngle).toBe(true);
    expect(Math.sign(solved.boundEvaluations!.low.altitudeError)).not.toBe(
      Math.sign(solved.boundEvaluations!.high.altitudeError),
    );
    expect(solved.boundEvaluations?.bracketsRoot).toBe(false);
    expect(firstBisect).toBeUndefined();
    expect(solved.iterations).toBe(0);
  });

  it('does not apply barbell natural-release apsis bounds to Fleet Central source launches', () => {
    const state = createInitialBeanstalkSystem();
    const transfer = getAvailableTransfers(state).find(candidate => (
      candidate.mode === 'source-load'
      && candidate.kind === 'downmass'
      && candidate.sourceBarbellId === 'fleet-central-downmass-source'
    ));
    expect(transfer).toBeDefined();

    const solved = solveTransferCorrection(state, transfer!);

    expect(solved.scalarBounds?.low).toBeLessThan(solved.scalarBounds!.high);
    expect(solved.scalarBounds?.low).toBeGreaterThan(-80);
  });

  it('launches a source transfer as an active payload before resolving it at angular catch', () => {
    const { state: loaded, transfer } = findStateWithSolvedTransfer({
      sourceBarbellId: 'civic-prime-space-gun',
      kind: 'upmass',
    });
    const launch = createTransferLaunch(loaded, transfer);
    const targetAfterLaunch = launch.state.barbells.find(barbell => barbell.id === transfer.targetBarbellId);

    expect(launch.state.payloads).toHaveLength(1);
    expect(targetAfterLaunch?.[transfer.targetEndpoint].upmassTons).toBe(0);

    const caught = simulateToAngularCatch(launch);
    const resolved = resolveCaughtTransfer(caught.state, transfer, caught.correctionMagnitude, caught.releaseSpeed);
    const target = resolved.state.barbells.find(barbell => barbell.id === transfer.targetBarbellId);

    expect(resolved.state.payloads).toHaveLength(0);
    expect(target?.inner.upmassTons).toBe(transfer.massTons);
    expect(resolved.releaseSpeed).toBeCloseTo(launch.releaseSpeed);
    expect(Number.isFinite(resolved.altitudeError)).toBe(true);
  });

  it('detects catch by angular crossing instead of radial distance', () => {
    expect(didPassCatchAngle(0.2, -0.1)).toBe(true);
    expect(didPassCatchAngle(-0.2, 0.1)).toBe(true);
    expect(didPassCatchAngle(2.8, -2.8)).toBe(false);
  });

  it('moves a caught upmass across its tether without correction cost', () => {
    const afterCatch = createInitialBeanstalkSystem();
    afterCatch.barbells[1].inner.upmassTons = DYNAMIC_MASS_TONS;
    const cross = getAvailableTransfers(afterCatch).find(candidate => (
      candidate.mode === 'cross-tether'
      && candidate.kind === 'upmass'
      && candidate.sourceBarbellId === 'stage-2'
    ));
    expect(cross).toBeDefined();

    const resolved = resolveTransfer(afterCatch, cross!);
    const barbell = resolved.state.barbells.find(candidate => candidate.id === cross!.sourceBarbellId);

    expect(resolved.costVBucks).toBe(0);
    expect(barbell?.inner.upmassTons).toBe(0);
    expect(barbell?.outer.upmassTons).toBe(cross!.massTons);
  });

  it('does not offer an upmass tether shift when the higher radial endpoint is already occupied', () => {
    const state = createInitialBeanstalkSystem();
    state.barbells[0].inner.upmassTons = DYNAMIC_MASS_TONS;
    state.barbells[0].outer.upmassTons = DYNAMIC_MASS_TONS;
    const blocked = getAvailableTransfers(state).find(candidate => (
      candidate.mode === 'cross-tether'
      && candidate.kind === 'upmass'
      && candidate.sourceBarbellId === 'stage-1'
    ));

    expect(blocked).toBeUndefined();
  });

  it('does not offer an upward transfer when the next lower radial endpoint is already occupied', () => {
    const state = createInitialBeanstalkSystem();
    state.barbells[0].outer.upmassTons = DYNAMIC_MASS_TONS;
    state.barbells[1].inner.upmassTons = DYNAMIC_MASS_TONS;
    const blocked = getAvailableTransfers(state).find(candidate => (
      candidate.mode === 'transfer'
      && candidate.kind === 'upmass'
      && candidate.sourceBarbellId === 'stage-1'
      && candidate.targetBarbellId === 'stage-2'
    ));

    expect(blocked).toBeUndefined();
  });

  it('conserves total angular momentum across a full user-directed upmass cycle', () => {
    let state = createInitialBeanstalkSystem();
    state.barbells[0].inner.upmassTons = DYNAMIC_MASS_TONS;
    const initialAngularMomentum = getSystemAngularMomentumAbout(state);

    state = resolveNamedTransfer(state, label => label === 'stage-1 upmass across tether');
    expectAngularMomentumConserved(state, initialAngularMomentum);
  });

  it('offers Fleet Central as the final upmass destination', () => {
    const state = createInitialBeanstalkSystem();
    state.barbells[2].outer.upmassTons = DYNAMIC_MASS_TONS;
    const transfers = getAvailableTransfers(state);
    const fleetTransfer = transfers.find(transfer => transfer.destinationKind === 'fleet-central');

    expect(fleetTransfer).toBeDefined();
    expect(fleetTransfer?.label).toContain('Fleet Central');
  });

  it('catches the first target angular crossing even when the payload has a large altitude miss', () => {
    const targetAngle = Math.PI / 3;
    const payloadAngle = targetAngle - 0.01;
    const payloadRadius = 50;
    const radial = fromAngle(payloadAngle);
    const state: BeanstalkSystemState = {
      timeSeconds: 0,
      planetRadius: 48,
      gravitationalParameter: 0,
      barbells: [{
        id: 'target',
        center: scale(fromAngle(targetAngle), 200),
        velocity: vec(0, 0),
        angleRad: targetAngle,
        angularVelocityRadPerSecond: 0,
        length: 0,
        dryMassTons: 80,
        inner: { upmassTons: 0, downmassTons: 0 },
        outer: { upmassTons: 0, downmassTons: 0 },
      }],
      payloads: [{
        id: 'active-payload',
        kind: 'upmass',
        massTons: DYNAMIC_MASS_TONS,
        position: scale(radial, payloadRadius),
        velocity: scale(rotate90(radial), 10),
      }],
    };
    const target = {
      sourceBarbellId: 'source',
      sourceEndpoint: 'outer' as const,
      targetBarbellId: 'target',
      targetEndpoint: 'inner' as const,
      kind: 'upmass' as const,
      massTons: DYNAMIC_MASS_TONS,
      durationSeconds: 10,
    };

    const stepped = stepTransferToCatch({
      state,
      target,
      correctionMagnitude: 0,
      releaseSpeed: 0,
      previousAngularError: 0.01,
      catchArmed: true,
      angularTravel: 0,
      minCatchSeconds: 0,
      elapsedSeconds: 1,
    }, 0.5);

    expect(stepped.caught).toBe(true);
    expect(length(stepped.launch.state.payloads[0].position)).toBeLessThan(100);
  });

  it('ignores non-target barbell angular crossings while a payload is in flight', () => {
    const payloadAngle = -0.01;
    const radial = fromAngle(payloadAngle);
    const state: BeanstalkSystemState = {
      timeSeconds: 0,
      planetRadius: 48,
      gravitationalParameter: 0,
      barbells: [
        makePointBarbell('bystander', 120, 0),
        makePointBarbell('target', 120, 1),
      ],
      payloads: [{
        id: 'active-payload',
        kind: 'upmass',
        massTons: DYNAMIC_MASS_TONS,
        position: scale(radial, 50),
        velocity: scale(rotate90(radial), 10),
      }],
    };

    const stepped = stepTransferToCatch({
      state,
      target: {
        sourceBarbellId: 'source',
        sourceEndpoint: 'outer',
        targetBarbellId: 'target',
        targetEndpoint: 'inner',
        kind: 'upmass',
        massTons: DYNAMIC_MASS_TONS,
        durationSeconds: 10,
      },
      correctionMagnitude: 0,
      releaseSpeed: 0,
      previousAngularError: 1.01,
      catchArmed: true,
      angularTravel: 0,
      minCatchSeconds: 0,
      elapsedSeconds: 1,
    }, 0.5);

    expect(stepped.caught).toBe(false);
  });

  it('uses Fleet Central angular crossing as the final upmass catch criterion', () => {
    const station = getFleetCentralState({ timeSeconds: 0, gravitationalParameter: 0 });
    const stationAngle = Math.atan2(station.position.y, station.position.x);
    const payloadAngle = stationAngle - 0.01;
    const radial = fromAngle(payloadAngle);
    const state: BeanstalkSystemState = {
      timeSeconds: 0,
      planetRadius: 48,
      gravitationalParameter: 0,
      barbells: [],
      payloads: [{
        id: 'active-payload',
        kind: 'upmass',
        massTons: DYNAMIC_MASS_TONS,
        position: scale(radial, length(station.position)),
        velocity: scale(rotate90(radial), 10),
      }],
    };

    const stepped = stepTransferToCatch({
      state,
      target: {
        sourceBarbellId: 'stage-3',
        sourceEndpoint: 'outer',
        targetBarbellId: 'fleet-central',
        targetEndpoint: 'inner',
        destinationKind: 'fleet-central',
        kind: 'upmass',
        massTons: DYNAMIC_MASS_TONS,
        durationSeconds: 10,
      },
      correctionMagnitude: 0,
      releaseSpeed: 0,
      previousAngularError: 0.01,
      catchArmed: true,
      angularTravel: 0,
      minCatchSeconds: 0,
      elapsedSeconds: 1,
    }, 0.5);

    expect(stepped.caught).toBe(true);
  });

  it('uses target barbell center angular crossing for Fleet Central downmass source launches', () => {
    const targetAngle = 0.75;
    const payloadAngle = targetAngle - 0.01;
    const radial = fromAngle(payloadAngle);
    const state: BeanstalkSystemState = {
      timeSeconds: 0,
      planetRadius: 48,
      gravitationalParameter: 0,
      barbells: [makePointBarbell('stage-3', 200, targetAngle)],
      payloads: [{
        id: 'active-payload',
        kind: 'downmass',
        massTons: DYNAMIC_MASS_TONS,
        position: scale(radial, 260),
        velocity: scale(rotate90(radial), 10),
      }],
    };

    const stepped = stepTransferToCatch({
      state,
      target: {
        sourceBarbellId: 'fleet-central-downmass-source',
        sourceEndpoint: 'inner',
        targetBarbellId: 'stage-3',
        targetEndpoint: 'outer',
        kind: 'downmass',
        massTons: DYNAMIC_MASS_TONS,
        durationSeconds: 10,
      },
      correctionMagnitude: 0,
      releaseSpeed: 0,
      previousAngularError: 0.01,
      catchArmed: true,
      angularTravel: 0,
      minCatchSeconds: 0,
      elapsedSeconds: 1,
    }, 0.5);

    expect(stepped.caught).toBe(true);
  });

  it('uses surface crossing, not angular crossing, for planet disposal', () => {
    const state: BeanstalkSystemState = {
      timeSeconds: 0,
      planetRadius: 48,
      gravitationalParameter: 0,
      barbells: [],
      payloads: [{
        id: 'active-payload',
        kind: 'downmass',
        massTons: DYNAMIC_MASS_TONS,
        position: vec(50, 0),
        velocity: vec(-30, 0),
      }],
    };

    const stepped = stepTransferToCatch({
      state,
      target: {
        sourceBarbellId: 'stage-1',
        sourceEndpoint: 'inner',
        targetBarbellId: 'civic-prime-disposal',
        targetEndpoint: 'outer',
        destinationKind: 'planet-disposal',
        kind: 'downmass',
        massTons: DYNAMIC_MASS_TONS,
        durationSeconds: 10,
      },
      correctionMagnitude: 0,
      releaseSpeed: 0,
      previousAngularError: 2,
      catchArmed: true,
      angularTravel: 0,
      minCatchSeconds: 0,
      elapsedSeconds: 1,
    }, 0.1);

    expect(stepped.caught).toBe(true);
    expect(stepped.launch.previousAngularError).toBeLessThanOrEqual(0);
  });

  it('offers planet disposal for downmass at the lowest inner endpoint', () => {
    const state = createInitialBeanstalkSystem();
    state.barbells[0].inner.downmassTons = DYNAMIC_MASS_TONS;
    const transfers = getAvailableTransfers(state);
    const disposal = transfers.find(transfer => transfer.destinationKind === 'planet-disposal');

    expect(disposal).toBeDefined();
    expect(disposal?.label).toContain('Civic Prime');
  });

  it('detects a tether collision with Civic Prime', () => {
    const state = createInitialBeanstalkSystem();
    state.barbells[0].center = { x: 0, y: 0 };
    state.barbells[0].angleRad = 0;
    state.barbells[0].length = state.planetRadius * 3;

    expect(detectInfrastructureCollision(state)).toEqual({
      kind: 'planet',
      barbellId: 'stage-1',
    });
  });

  it('detects a tether collision with Fleet Central', () => {
    const state = createInitialBeanstalkSystem();
    const fleetCentral = getFleetCentralState({
      timeSeconds: state.timeSeconds,
      gravitationalParameter: state.gravitationalParameter,
    });
    state.barbells[2].center = fleetCentral.position;
    state.barbells[2].angleRad = Math.PI / 2;
    state.barbells[2].length = 60;

    expect(detectInfrastructureCollision(state)).toEqual({
      kind: 'fleet-central',
      barbellId: 'stage-3',
    });
  });
});
