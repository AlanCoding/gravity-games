import {
  type BeanstalkSystemState,
  type EndpointKey,
  type Vec2,
  add,
  cloneSystem,
  createPayloadFromEndpoint,
  cross,
  getBarbellMomentOfInertia,
  getEndpointState,
  getTotalBarbellMass,
  length,
  scale,
  stepSystem,
  sub,
  vec,
} from './model';

export type TransferTarget = {
  sourceBarbellId: string;
  sourceEndpoint: EndpointKey;
  targetBarbellId: string;
  targetEndpoint: EndpointKey;
  kind: 'upmass' | 'downmass';
  massTons: number;
  durationSeconds: number;
};

export type TransferSolveResult = {
  deltaVelocity: Vec2;
  correctionMagnitude: number;
  missDistance: number;
  nominalMissDistance: number;
  iterations: number;
  converged: boolean;
};

export function solveTransferCorrection(
  state: BeanstalkSystemState,
  target: TransferTarget,
  options?: {
    dt?: number;
    tolerance?: number;
    maxIterations?: number;
    finiteDifferenceStep?: number;
  },
): TransferSolveResult {
  const tolerance = options?.tolerance ?? 0.05;
  const maxIterations = options?.maxIterations ?? 12;
  const finiteDifferenceStep = options?.finiteDifferenceStep ?? 0.02;
  let deltaVelocity = vec(0, 0);
  const nominalError = simulateTransferError(state, target, deltaVelocity, options?.dt);
  const nominalMissDistance = length(nominalError);

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const error = simulateTransferError(state, target, deltaVelocity, options?.dt);
    const missDistance = length(error);
    if (missDistance <= tolerance) {
      return {
        deltaVelocity,
        correctionMagnitude: length(deltaVelocity),
        missDistance,
        nominalMissDistance,
        iterations: iteration,
        converged: true,
      };
    }

    const errorX = simulateTransferError(state, target, add(deltaVelocity, vec(finiteDifferenceStep, 0)), options?.dt);
    const errorY = simulateTransferError(state, target, add(deltaVelocity, vec(0, finiteDifferenceStep)), options?.dt);
    const j00 = (errorX.x - error.x) / finiteDifferenceStep;
    const j10 = (errorX.y - error.y) / finiteDifferenceStep;
    const j01 = (errorY.x - error.x) / finiteDifferenceStep;
    const j11 = (errorY.y - error.y) / finiteDifferenceStep;
    const determinant = j00 * j11 - j01 * j10;

    if (Math.abs(determinant) < 0.000001) {
      break;
    }

    const correction = {
      x: (-error.x * j11 + j01 * error.y) / determinant,
      y: (j10 * error.x - j00 * error.y) / determinant,
    };
    deltaVelocity = add(deltaVelocity, correction);
  }

  const finalError = simulateTransferError(state, target, deltaVelocity, options?.dt);
  return {
    deltaVelocity,
    correctionMagnitude: length(deltaVelocity),
    missDistance: length(finalError),
    nominalMissDistance,
    iterations: maxIterations,
    converged: length(finalError) <= tolerance,
  };
}

export function simulateTransferError(
  state: BeanstalkSystemState,
  target: TransferTarget,
  deltaVelocity: Vec2,
  dt = 0.1,
): Vec2 {
  const endState = simulateTransfer(state, target, deltaVelocity, dt);
  const payload = endState.payloads.find(candidate => candidate.id === 'solver-payload');
  const targetBarbell = endState.barbells.find(barbell => barbell.id === target.targetBarbellId);
  if (!payload || !targetBarbell) {
    throw new Error('Transfer simulation lost payload or target barbell.');
  }
  const targetEndpoint = getEndpointState(targetBarbell, target.targetEndpoint);
  return sub(payload.position, targetEndpoint.position);
}

export function simulateTransfer(
  state: BeanstalkSystemState,
  target: TransferTarget,
  deltaVelocity: Vec2,
  dt = 0.1,
): BeanstalkSystemState {
  let simulated = cloneSystem(state);
  const sourceBarbell = simulated.barbells.find(barbell => barbell.id === target.sourceBarbellId);
  if (!sourceBarbell) {
    throw new Error(`Unknown source barbell ${target.sourceBarbellId}.`);
  }
  const sourceEndpoint = getEndpointState(sourceBarbell, target.sourceEndpoint);
  simulated.payloads.push(createPayloadFromEndpoint({
    id: 'solver-payload',
    kind: target.kind,
    massTons: target.massTons,
    endpoint: sourceEndpoint,
    deltaVelocity,
  }));

  let remaining = target.durationSeconds;
  while (remaining > 0) {
    const step = Math.min(dt, remaining);
    simulated = stepSystem(simulated, step);
    remaining -= step;
  }

  return simulated;
}

export function vBuckCostFromCorrection(deltaVelocity: Vec2, massTons: number, rate = 12): number {
  return Math.round(length(deltaVelocity) * massTons * rate);
}

export function applyCorrectionMomentumToEndpoint(options: {
  state: BeanstalkSystemState;
  barbellId: string;
  endpoint: EndpointKey;
  deltaVelocity: Vec2;
  payloadMassTons: number;
}): BeanstalkSystemState {
  const next = cloneSystem(options.state);
  const barbell = next.barbells.find(candidate => candidate.id === options.barbellId);
  if (!barbell) {
    throw new Error(`Unknown barbell ${options.barbellId}.`);
  }
  const endpoint = getEndpointState(barbell, options.endpoint);
  const impulse = scale(options.deltaVelocity, -options.payloadMassTons);
  const totalMass = getTotalBarbellMass(barbell);
  const endpointOffset = sub(endpoint.position, barbell.center);
  const angularImpulse = cross(endpointOffset, impulse);
  const momentOfInertia = getBarbellMomentOfInertia(barbell);
  barbell.velocity = add(barbell.velocity, scale(impulse, 1 / Math.max(totalMass, 0.001)));
  if (momentOfInertia > 0) {
    barbell.angularVelocityRadPerSecond += angularImpulse / momentOfInertia;
  }
  return next;
}
