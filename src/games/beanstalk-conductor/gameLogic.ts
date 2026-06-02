import {
  type BeanstalkSystemState,
  type EndpointKey,
  type Vec2,
  attachPayloadToEndpoint,
  cloneSystem,
  cross,
  detachEndpointMassAsPayload,
  dot,
  getEndpointState,
  length,
  moveFillAcrossBarbell,
  scale,
  stepSystem,
  sub,
} from './physics/model';
import {
  solveTransferCorrection,
  type TransferTarget,
} from './physics/transferSolver';
import { DYNAMIC_MASS_TONS, createSurfaceLauncherState, getFleetCentralState } from './physics/initialState';

export type TransferOpportunity = TransferTarget & {
  label: string;
  mode: 'cross-tether' | 'source-load' | 'transfer';
};

export type TransferResolution = {
  state: BeanstalkSystemState;
  costVBucks: number;
  correctionMagnitude: number;
  deliveredTons: number;
  relativeCatchSpeed: number;
  message: string;
};

export type TransferLaunch = {
  state: BeanstalkSystemState;
  target: TransferTarget;
  correctionMagnitude: number;
  previousAngularError: number;
};

export type TransferAvailabilityIssue = {
  reason: 'surface-launch-obstructed';
  message: string;
};

const DEFAULT_TRANSFER_SECONDS = 10;
const CIVIC_PRIME_SOURCE_ID = 'civic-prime-space-gun';
const FLEET_CENTRAL_SOURCE_ID = 'fleet-central-downmass-source';
const FLEET_CENTRAL_TARGET_ID = 'fleet-central';
const PLANET_DISPOSAL_TARGET_ID = 'civic-prime-disposal';
const UPMASS_REVENUE_PER_TON = 500;
const DOWNMASS_RELEASE_COST_PER_TON = 125;
const FLEET_CENTRAL_COLLISION_RADIUS = 10;

export type InfrastructureCollision = {
  kind: 'planet' | 'fleet-central';
  barbellId: string;
};

export class TransferSolveFailure extends Error {
  constructor(
    readonly reason: 'no-angular-crossing' | 'no-scalar-root' | 'unknown',
  ) {
    super('No valid release window is available.');
    this.name = 'TransferSolveFailure';
  }
}

export function getAvailableTransfers(state: BeanstalkSystemState): TransferOpportunity[] {
  const transfers: TransferOpportunity[] = [];
  const ordered = [...state.barbells].sort((a, b) => length(a.center) - length(b.center));
  const first = ordered[0];
  const last = ordered[ordered.length - 1];

  const civicPrimeUpmassTarget = first ? getEndpointsByRadius(first)[0] : null;
  if (first && civicPrimeUpmassTarget && first[civicPrimeUpmassTarget].upmassTons <= 0) {
    transfers.push({
      mode: 'source-load',
      sourceBarbellId: CIVIC_PRIME_SOURCE_ID,
      sourceEndpoint: 'outer',
      targetBarbellId: first.id,
      targetEndpoint: civicPrimeUpmassTarget,
      kind: 'upmass',
      massTons: DYNAMIC_MASS_TONS,
      durationSeconds: 0,
      label: `load ${DYNAMIC_MASS_TONS}-ton upmass from Civic Prime`,
    });
  }

  const fleetCentralDownmassTarget = last ? getEndpointsByRadius(last)[1] : null;
  if (last && fleetCentralDownmassTarget && last[fleetCentralDownmassTarget].downmassTons <= 0) {
    transfers.push({
      mode: 'source-load',
      sourceBarbellId: FLEET_CENTRAL_SOURCE_ID,
      sourceEndpoint: 'inner',
      targetBarbellId: last.id,
      targetEndpoint: fleetCentralDownmassTarget,
      kind: 'downmass',
      massTons: DYNAMIC_MASS_TONS,
      durationSeconds: 0,
      label: `load ${DYNAMIC_MASS_TONS}-ton downmass from Fleet Central`,
    });
  }

  for (let index = 0; index < ordered.length; index += 1) {
    const current = ordered[index];
    const nextOuter = ordered[index + 1];
    const nextInner = ordered[index - 1];
    const [lowerEndpoint, higherEndpoint] = getEndpointsByRadius(current);

    if (nextOuter && current[higherEndpoint].upmassTons > 0) {
      const targetEndpoint = getEndpointsByRadius(nextOuter)[0];
      if (nextOuter[targetEndpoint].upmassTons <= 0) {
        transfers.push({
          mode: 'transfer',
          sourceBarbellId: current.id,
          sourceEndpoint: higherEndpoint,
          targetBarbellId: nextOuter.id,
          targetEndpoint,
          kind: 'upmass',
          massTons: current[higherEndpoint].upmassTons,
          durationSeconds: DEFAULT_TRANSFER_SECONDS,
          label: `${current.id} upmass to ${nextOuter.id}`,
        });
      }
    }

    if (!nextOuter && current[higherEndpoint].upmassTons > 0) {
      transfers.push({
        mode: 'transfer',
        sourceBarbellId: current.id,
        sourceEndpoint: higherEndpoint,
        targetBarbellId: FLEET_CENTRAL_TARGET_ID,
        targetEndpoint: 'inner',
        destinationKind: 'fleet-central',
        kind: 'upmass',
        massTons: current[higherEndpoint].upmassTons,
        durationSeconds: DEFAULT_TRANSFER_SECONDS,
        label: `${current.id} upmass to Fleet Central`,
      });
    }

    if (current[lowerEndpoint].upmassTons > 0 && current[higherEndpoint].upmassTons <= 0) {
      transfers.push({
        mode: 'cross-tether',
        sourceBarbellId: current.id,
        sourceEndpoint: lowerEndpoint,
        targetBarbellId: current.id,
        targetEndpoint: higherEndpoint,
        kind: 'upmass',
        massTons: current[lowerEndpoint].upmassTons,
        durationSeconds: 0,
        label: `${current.id} upmass across tether`,
      });
    }

    if (nextInner && current[lowerEndpoint].downmassTons > 0) {
      const targetEndpoint = getEndpointsByRadius(nextInner)[1];
      if (nextInner[targetEndpoint].downmassTons <= 0) {
        transfers.push({
          mode: 'transfer',
          sourceBarbellId: current.id,
          sourceEndpoint: lowerEndpoint,
          targetBarbellId: nextInner.id,
          targetEndpoint,
          kind: 'downmass',
          massTons: current[lowerEndpoint].downmassTons,
          durationSeconds: DEFAULT_TRANSFER_SECONDS,
          label: `${current.id} downmass to ${nextInner.id}`,
        });
      }
    }

    if (!nextInner && current[lowerEndpoint].downmassTons > 0) {
      transfers.push({
        mode: 'transfer',
        sourceBarbellId: current.id,
        sourceEndpoint: lowerEndpoint,
        targetBarbellId: PLANET_DISPOSAL_TARGET_ID,
        targetEndpoint: 'outer',
        destinationKind: 'planet-disposal',
        kind: 'downmass',
        massTons: current[lowerEndpoint].downmassTons,
        durationSeconds: DEFAULT_TRANSFER_SECONDS,
        label: `${current.id} downmass disposal to Civic Prime`,
      });
    }

    if (current[higherEndpoint].downmassTons > 0 && current[lowerEndpoint].downmassTons <= 0) {
      transfers.push({
        mode: 'cross-tether',
        sourceBarbellId: current.id,
        sourceEndpoint: higherEndpoint,
        targetBarbellId: current.id,
        targetEndpoint: lowerEndpoint,
        kind: 'downmass',
        massTons: current[higherEndpoint].downmassTons,
        durationSeconds: 0,
        label: `${current.id} downmass across tether`,
      });
    }
  }

  return transfers.sort((a, b) => getTransferSourceRadius(state, a) - getTransferSourceRadius(state, b));
}

export function resolveTransfer(
  state: BeanstalkSystemState,
  target: TransferTarget,
): TransferResolution {
  if (isSourceLoad(target)) {
    const resolvedState = cloneSystem(state);
    replaceBarbell(resolvedState, moveEndpointFill({
      state: resolvedState,
      barbellId: target.targetBarbellId,
      endpoint: target.targetEndpoint,
      direction: 1,
      kind: target.kind,
      massTons: target.massTons,
    }));
    const costVBucks = target.sourceBarbellId === FLEET_CENTRAL_SOURCE_ID
      ? target.massTons * DOWNMASS_RELEASE_COST_PER_TON
      : 0;
    return {
      state: resolvedState,
      costVBucks,
      correctionMagnitude: 0,
      deliveredTons: target.massTons,
      relativeCatchSpeed: 0,
      message: target.sourceBarbellId === FLEET_CENTRAL_SOURCE_ID
        ? `Downmass released from Fleet Central: ${target.massTons.toFixed(0)} tons, -${costVBucks} vBucks.`
        : `Source load complete: ${target.massTons.toFixed(0)} tons ready.`,
    };
  }

  if (target.sourceBarbellId === target.targetBarbellId) {
    const resolvedState = cloneSystem(state);
    replaceBarbell(resolvedState, moveEndpointFill({
      state: resolvedState,
      barbellId: target.sourceBarbellId,
      endpoint: target.sourceEndpoint,
      direction: -1,
      kind: target.kind,
      massTons: target.massTons,
    }));
    replaceBarbell(resolvedState, moveEndpointFill({
      state: resolvedState,
      barbellId: target.targetBarbellId,
      endpoint: target.targetEndpoint,
      direction: 1,
      kind: target.kind,
      massTons: target.massTons,
    }));
    return {
      state: resolvedState,
      costVBucks: 0,
      correctionMagnitude: 0,
      deliveredTons: target.massTons,
      relativeCatchSpeed: 0,
      message: `Tether shift complete: ${target.massTons.toFixed(0)} tons repositioned.`,
    };
  }

  const launch = createTransferLaunch(state, target);
  const caught = simulateToAngularCatch(launch);
  return resolveCaughtTransfer(caught.state, target, launch.correctionMagnitude);
}

export function getTransferAvailabilityIssue(
  state: BeanstalkSystemState,
  target: TransferTarget,
): TransferAvailabilityIssue | null {
  if (target.sourceBarbellId !== CIVIC_PRIME_SOURCE_ID) {
    return null;
  }
  const targetBarbell = state.barbells.find(barbell => barbell.id === target.targetBarbellId);
  if (!targetBarbell) {
    return null;
  }
  if (isClearSurfaceLaunch(state, targetBarbell, target.targetEndpoint)) {
    return null;
  }
  return {
    reason: 'surface-launch-obstructed',
    message: 'Admiral Voss: Civic Prime cannot launch through the planet. Wait for a clear mass-driver line.',
  };
}

function isSourceLoad(target: TransferTarget): boolean {
  return target.sourceBarbellId === CIVIC_PRIME_SOURCE_ID || target.sourceBarbellId === FLEET_CENTRAL_SOURCE_ID;
}

export function createTransferLaunch(
  state: BeanstalkSystemState,
  target: TransferTarget,
): TransferLaunch {
  const launchState = cloneSystem(state);
  const sourceBarbell = launchState.barbells.find(barbell => barbell.id === target.sourceBarbellId);
  if (!sourceBarbell) {
    throw new Error('Transfer launch needs a source barbell.');
  }

  const targetPosition = target.destinationKind === 'planet-disposal'
    ? null
    : getTargetPosition(launchState, target);
  const solved = solveTransferCorrection(state, target);
  if (!solved.converged) {
    throw new TransferSolveFailure(solved.failureReason ?? 'unknown');
  }
  const detached = detachEndpointMassAsPayload({
    barbell: sourceBarbell,
    endpoint: target.sourceEndpoint,
    kind: target.kind,
    massTons: target.massTons,
    payloadId: 'active-payload',
    deltaVelocity: solved.deltaVelocity,
  });
  replaceBarbell(launchState, detached.barbell);
  launchState.payloads = [detached.payload];

  return {
    state: launchState,
    target,
    correctionMagnitude: solved.correctionMagnitude,
    previousAngularError: target.destinationKind === 'planet-disposal'
      ? length(launchState.payloads[0].position) - launchState.planetRadius
      : angularErrorBetween(launchState.payloads[0].position, targetPosition!),
  };
}

export function stepTransferToCatch(
  launch: TransferLaunch,
  dt: number,
): { launch: TransferLaunch; caught: boolean } {
  const nextState = stepSystem(launch.state, dt);
  const currentAngularError = getCatchError(nextState, launch.target);
  return {
    launch: {
      ...launch,
      state: nextState,
      previousAngularError: currentAngularError,
    },
    caught: launch.target.destinationKind === 'planet-disposal'
      ? launch.previousAngularError > 0 && currentAngularError <= 0
      : didPassCatchAngle(launch.previousAngularError, currentAngularError),
  };
}

export function simulateToAngularCatch(
  launch: TransferLaunch,
  options?: {
    dt?: number;
    maxSeconds?: number;
  },
): TransferLaunch {
  const dt = options?.dt ?? 0.05;
  const maxSeconds = options?.maxSeconds ?? launch.target.durationSeconds * 2;
  let elapsed = 0;
  let current = launch;
  while (elapsed < maxSeconds) {
    const stepped = stepTransferToCatch(current, Math.min(dt, maxSeconds - elapsed));
    current = stepped.launch;
    elapsed += dt;
    if (stepped.caught) {
      return current;
    }
  }
  return current;
}

export function resolveCaughtTransfer(
  state: BeanstalkSystemState,
  target: TransferTarget,
  correctionMagnitude: number,
): TransferResolution {
  const payload = state.payloads.find(candidate => candidate.id === 'active-payload');
  if (!payload) {
    throw new Error('Caught transfer needs active payload.');
  }

  if (target.destinationKind === 'fleet-central') {
    const station = getFleetCentralState({
      timeSeconds: state.timeSeconds,
      gravitationalParameter: state.gravitationalParameter,
    });
    const relativeCatchSpeed = length(sub(payload.velocity, station.velocity));
    const resolvedState = cloneSystem(state);
    resolvedState.payloads = resolvedState.payloads.filter(candidate => candidate.id !== 'active-payload');
    const correctionCost = Math.round(correctionMagnitude * target.massTons);
    const revenue = target.massTons * UPMASS_REVENUE_PER_TON;
    return {
      state: resolvedState,
      costVBucks: correctionCost - revenue,
      correctionMagnitude,
      deliveredTons: target.massTons,
      relativeCatchSpeed,
      message: `Fleet Central accepted ${target.massTons.toFixed(0)} tons, +${revenue - correctionCost} vBucks.`,
    };
  }

  if (target.destinationKind === 'planet-disposal') {
    const resolvedState = cloneSystem(state);
    resolvedState.payloads = resolvedState.payloads.filter(candidate => candidate.id !== 'active-payload');
    const correctionCost = Math.round(correctionMagnitude * target.massTons);
    return {
      state: resolvedState,
      costVBucks: correctionCost,
      correctionMagnitude,
      deliveredTons: target.massTons,
      relativeCatchSpeed: 0,
      message: `Downmass disposed on Civic Prime: ${target.massTons.toFixed(0)} tons, -${correctionCost} vBucks.`,
    };
  }

  const targetBarbell = state.barbells.find(barbell => barbell.id === target.targetBarbellId);
  if (!targetBarbell) {
    throw new Error('Caught transfer needs target barbell.');
  }

  const targetEndpoint = getEndpointState(targetBarbell, target.targetEndpoint);
  const relativeCatchSpeed = length(sub(payload.velocity, targetEndpoint.velocity));
  const resolvedState = cloneSystem(state);
  resolvedState.payloads = resolvedState.payloads.filter(candidate => candidate.id !== 'active-payload');
  replaceBarbell(resolvedState, attachPayloadToEndpoint({
    barbell: targetBarbell,
    endpoint: target.targetEndpoint,
    payload,
  }));

  const correctionCost = Math.round(correctionMagnitude * target.massTons);
  const catchCost = Math.round(relativeCatchSpeed * target.massTons);
  const costVBucks = correctionCost + catchCost;
  return {
    state: resolvedState,
    costVBucks,
    correctionMagnitude,
    deliveredTons: target.massTons,
    relativeCatchSpeed,
    message: `Transfer complete: ${target.massTons.toFixed(0)} tons moved, -${costVBucks} vBucks.`,
  };
}

export function getAngularCatchError(state: BeanstalkSystemState, target: TransferTarget): number {
  return getCatchError(state, target);
}

export function getCatchError(state: BeanstalkSystemState, target: TransferTarget): number {
  const payload = state.payloads.find(candidate => candidate.id === 'active-payload');
  if (!payload) {
    throw new Error('Catch check needs active payload.');
  }
  if (target.destinationKind === 'planet-disposal') {
    return length(payload.position) - state.planetRadius;
  }
  return angularErrorBetween(payload.position, getTargetPosition(state, target));
}

function getTargetPosition(state: BeanstalkSystemState, target: TransferTarget): Vec2 {
  if (target.destinationKind === 'fleet-central') {
    return getFleetCentralState({
      timeSeconds: state.timeSeconds,
      gravitationalParameter: state.gravitationalParameter,
    }).position;
  }
  const targetBarbell = state.barbells.find(barbell => barbell.id === target.targetBarbellId);
  if (!targetBarbell) {
    throw new Error('Catch check needs target barbell.');
  }
  return getEndpointState(targetBarbell, target.targetEndpoint).position;
}

export function didPassCatchAngle(previousError: number, currentError: number): boolean {
  const nearCatchLine = Math.abs(previousError) < Math.PI / 2 || Math.abs(currentError) < Math.PI / 2;
  return nearCatchLine && previousError * currentError <= 0;
}

export function detectInfrastructureCollision(state: BeanstalkSystemState): InfrastructureCollision | null {
  const fleetCentral = getFleetCentralState({
    timeSeconds: state.timeSeconds,
    gravitationalParameter: state.gravitationalParameter,
  });

  for (const barbell of state.barbells) {
    const inner = getEndpointState(barbell, 'inner');
    const outer = getEndpointState(barbell, 'outer');
    if (distancePointToSegment({ x: 0, y: 0 }, inner.position, outer.position) <= state.planetRadius) {
      return { kind: 'planet', barbellId: barbell.id };
    }
    if (
      distancePointToSegment(fleetCentral.position, inner.position, outer.position)
      <= FLEET_CENTRAL_COLLISION_RADIUS
    ) {
      return { kind: 'fleet-central', barbellId: barbell.id };
    }
  }

  return null;
}

function getEndpointsByRadius(barbell: BeanstalkSystemState['barbells'][number]): [EndpointKey, EndpointKey] {
  const innerRadius = length(getEndpointState(barbell, 'inner').position);
  const outerRadius = length(getEndpointState(barbell, 'outer').position);
  return innerRadius <= outerRadius ? ['inner', 'outer'] : ['outer', 'inner'];
}

function getTransferSourceRadius(state: BeanstalkSystemState, transfer: TransferOpportunity): number {
  if (transfer.sourceBarbellId === CIVIC_PRIME_SOURCE_ID) {
    return state.planetRadius;
  }
  if (transfer.sourceBarbellId === FLEET_CENTRAL_SOURCE_ID) {
    return getFleetCentralState({
      timeSeconds: state.timeSeconds,
      gravitationalParameter: state.gravitationalParameter,
    }).orbitRadius;
  }
  const sourceBarbell = state.barbells.find(barbell => barbell.id === transfer.sourceBarbellId);
  return sourceBarbell
    ? length(getEndpointState(sourceBarbell, transfer.sourceEndpoint).position)
    : Number.POSITIVE_INFINITY;
}

function isClearSurfaceLaunch(
  state: BeanstalkSystemState,
  targetBarbell: BeanstalkSystemState['barbells'][number],
  targetEndpoint: EndpointKey,
): boolean {
  const source = createSurfaceLauncherState().position;
  const target = getEndpointState(targetBarbell, targetEndpoint).position;
  return !segmentPassesInsidePlanetFromSurface(source, target, state.planetRadius);
}

function segmentPassesInsidePlanetFromSurface(start: Vec2, end: Vec2, planetRadius: number): boolean {
  const segment = sub(end, start);
  const segmentLengthSq = dot(segment, segment);
  if (segmentLengthSq <= 0) {
    return false;
  }
  const t = Math.max(0, Math.min(1, dot(scale(start, -1), segment) / segmentLengthSq));
  if (t <= 0.05) {
    return false;
  }
  const closest = {
    x: start.x + segment.x * t,
    y: start.y + segment.y * t,
  };
  return length(closest) < planetRadius * 0.985;
}

function angularErrorBetween(payloadPosition: { x: number; y: number }, targetPosition: { x: number; y: number }): number {
  return Math.atan2(cross(payloadPosition, targetPosition), dot(payloadPosition, targetPosition));
}

function distancePointToSegment(point: Vec2, start: Vec2, end: Vec2): number {
  const segment = sub(end, start);
  const segmentLengthSq = dot(segment, segment);
  if (segmentLengthSq <= 0) {
    return length(sub(point, start));
  }
  const t = Math.max(0, Math.min(1, dot(sub(point, start), segment) / segmentLengthSq));
  const closest = {
    x: start.x + segment.x * t,
    y: start.y + segment.y * t,
  };
  return length(sub(point, closest));
}

function replaceBarbell(state: BeanstalkSystemState, replacement: BeanstalkSystemState['barbells'][number]): void {
  const index = state.barbells.findIndex(barbell => barbell.id === replacement.id);
  if (index < 0) {
    throw new Error(`Unknown barbell ${replacement.id}.`);
  }
  state.barbells[index] = replacement;
}

function moveEndpointFill(options: {
  state: BeanstalkSystemState;
  barbellId: string;
  endpoint: EndpointKey;
  direction: -1 | 1;
  kind: 'upmass' | 'downmass';
  massTons: number;
}): BeanstalkSystemState['barbells'][number] {
  const barbell = options.state.barbells.find(candidate => candidate.id === options.barbellId);
  if (!barbell) {
    throw new Error(`Unknown barbell ${options.barbellId}.`);
  }
  const parkingEndpoint: EndpointKey = options.endpoint === 'inner' ? 'outer' : 'inner';
  const parked = moveFillAcrossBarbell({
    barbell,
    kind: options.kind,
    from: options.endpoint,
    to: parkingEndpoint,
    massTons: options.direction < 0 ? options.massTons : 0,
  });
  const next = {
    ...parked,
    center: { ...parked.center },
    velocity: { ...parked.velocity },
    inner: { ...parked.inner },
    outer: { ...parked.outer },
  };
  const key = options.kind === 'upmass' ? 'upmassTons' : 'downmassTons';
  if (options.direction < 0) {
    next[parkingEndpoint][key] -= Math.min(next[parkingEndpoint][key], options.massTons);
  } else {
    next[options.endpoint][key] += options.massTons;
  }
  return next;
}
