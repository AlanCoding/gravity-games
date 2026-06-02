import {
  type BarbellState,
  type BeanstalkSystemState,
  type EndpointKey,
  type EndpointState,
  type PayloadState,
  type Vec2,
  add,
  cloneSystem,
  computeBarbellDerivative,
  computeGravityAcceleration,
  createPayloadFromEndpoint,
  cross,
  dot,
  getBarbellMomentOfInertia,
  getEndpointState,
  getTotalBarbellMass,
  length,
  normalize,
  scale,
  stepSystem,
  sub,
  vec,
} from './model';
import { getFleetCentralState } from './initialState';

export type TransferTarget = {
  sourceBarbellId: string;
  sourceEndpoint: EndpointKey;
  targetBarbellId: string;
  targetEndpoint: EndpointKey;
  destinationKind?: 'barbell-end' | 'fleet-central' | 'planet-disposal';
  kind: 'upmass' | 'downmass';
  massTons: number;
  durationSeconds: number;
};

export type TransferSolveResult = {
  deltaVelocity: Vec2;
  scalarCorrection: number;
  correctionMagnitude: number;
  missDistance: number;
  nominalMissDistance: number;
  iterations: number;
  converged: boolean;
  failureReason?: 'no-angular-crossing' | 'no-scalar-root';
};

export function solveTransferCorrection(
  state: BeanstalkSystemState,
  target: TransferTarget,
  options?: {
    dt?: number;
    tolerance?: number;
    maxIterations?: number;
    maxSeconds?: number;
    searchLimit?: number;
  },
): TransferSolveResult {
  if (target.destinationKind === 'planet-disposal') {
    return solvePlanetDisposalCorrection(state, target, options);
  }

  const tolerance = options?.tolerance ?? 0.001;
  const maxIterations = options?.maxIterations ?? 48;
  const dt = options?.dt ?? 0.05;
  const maxSeconds = options?.maxSeconds ?? target.durationSeconds * 20;
  const searchLimit = options?.searchLimit ?? 80;
  const setup = createScalarTransferSetup(state, target);
  const nominal = evaluateScalarCorrection(setup, 0, dt, maxSeconds);
  const nominalMissDistance = nominal.converged ? Math.abs(nominal.radialMiss) : Number.POSITIVE_INFINITY;

  if (nominal.converged && Math.abs(nominal.radialMiss) <= tolerance) {
    return {
      deltaVelocity: vec(0, 0),
      scalarCorrection: 0,
      correctionMagnitude: 0,
      missDistance: Math.abs(nominal.radialMiss),
      nominalMissDistance,
      iterations: 0,
      converged: true,
    };
  }

  const bracket = findScalarRootBracket(setup, dt, maxSeconds, searchLimit, tolerance);
  if (!bracket) {
    return {
      deltaVelocity: vec(0, 0),
      scalarCorrection: 0,
      correctionMagnitude: 0,
      missDistance: nominalMissDistance,
      nominalMissDistance,
      iterations: 0,
      converged: false,
      failureReason: nominal.converged ? 'no-scalar-root' : 'no-angular-crossing',
    };
  }

  let low = bracket.low;
  let high = bracket.high;
  let lowResult = bracket.lowResult;
  let highResult = bracket.highResult;
  let bestCorrection = Math.abs(lowResult.radialMiss) <= Math.abs(highResult.radialMiss) ? low : high;
  let bestResult = Math.abs(lowResult.radialMiss) <= Math.abs(highResult.radialMiss) ? lowResult : highResult;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const middle = (low + high) / 2;
    const middleResult = evaluateScalarCorrection(setup, middle, dt, maxSeconds);
    if (!middleResult.converged) {
      break;
    }

    if (Math.abs(middleResult.radialMiss) < Math.abs(bestResult.radialMiss)) {
      bestCorrection = middle;
      bestResult = middleResult;
    }

    if (Math.abs(middleResult.radialMiss) <= tolerance) {
      const deltaVelocity = scale(setup.tangentDirection, middle);
      return {
        deltaVelocity,
        scalarCorrection: middle,
        correctionMagnitude: Math.abs(middle),
        missDistance: Math.abs(middleResult.radialMiss),
        nominalMissDistance,
        iterations: iteration + 1,
        converged: true,
      };
    }

    if (Math.sign(lowResult.radialMiss) === Math.sign(middleResult.radialMiss)) {
      low = middle;
      lowResult = middleResult;
    } else {
      high = middle;
      highResult = middleResult;
    }
  }

  const deltaVelocity = scale(setup.tangentDirection, bestCorrection);
  const converged = Math.abs(bestResult.radialMiss) <= tolerance;
  return {
    deltaVelocity,
    scalarCorrection: bestCorrection,
    correctionMagnitude: Math.abs(bestCorrection),
    missDistance: Math.abs(bestResult.radialMiss),
    nominalMissDistance,
    iterations: maxIterations,
    converged,
    failureReason: converged ? undefined : 'no-scalar-root',
  };
}

export function solvePlanetDisposalCorrection(
  state: BeanstalkSystemState,
  target: TransferTarget,
  options?: {
    tolerance?: number;
    maxIterations?: number;
    searchLimit?: number;
  },
): TransferSolveResult {
  const tolerance = options?.tolerance ?? 0.001;
  const maxIterations = options?.maxIterations ?? 48;
  const searchLimit = options?.searchLimit ?? 80;
  const setup = createScalarTransferSetup(state, target);
  const nominal = evaluatePlanetDisposalCorrection(setup, 0, state.planetRadius);
  const nominalMissDistance = Math.abs(nominal.radialMiss);

  if (nominal.radialMiss <= tolerance) {
    return {
      deltaVelocity: vec(0, 0),
      scalarCorrection: 0,
      correctionMagnitude: 0,
      missDistance: Math.max(0, nominal.radialMiss),
      nominalMissDistance,
      iterations: 0,
      converged: true,
    };
  }

  const bracket = findPlanetDisposalBracket(setup, state.planetRadius, searchLimit, tolerance);
  if (!bracket) {
    return {
      deltaVelocity: vec(0, 0),
      scalarCorrection: 0,
      correctionMagnitude: 0,
      missDistance: nominalMissDistance,
      nominalMissDistance,
      iterations: 0,
      converged: false,
      failureReason: 'no-scalar-root',
    };
  }

  let low = bracket.low;
  let high = bracket.high;
  let lowResult = bracket.lowResult;
  let bestCorrection = Math.abs(bracket.lowResult.radialMiss) <= Math.abs(bracket.highResult.radialMiss)
    ? bracket.low
    : bracket.high;
  let bestResult = Math.abs(bracket.lowResult.radialMiss) <= Math.abs(bracket.highResult.radialMiss)
    ? bracket.lowResult
    : bracket.highResult;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const middle = (low + high) / 2;
    const middleResult = evaluatePlanetDisposalCorrection(setup, middle, state.planetRadius);
    if (Math.abs(middleResult.radialMiss) < Math.abs(bestResult.radialMiss)) {
      bestCorrection = middle;
      bestResult = middleResult;
    }
    if (Math.abs(middleResult.radialMiss) <= tolerance) {
      return {
        deltaVelocity: scale(setup.tangentDirection, middle),
        scalarCorrection: middle,
        correctionMagnitude: Math.abs(middle),
        missDistance: Math.abs(middleResult.radialMiss),
        nominalMissDistance,
        iterations: iteration + 1,
        converged: true,
      };
    }
    if (Math.sign(lowResult.radialMiss) === Math.sign(middleResult.radialMiss)) {
      low = middle;
      lowResult = middleResult;
    } else {
      high = middle;
    }
  }

  return {
    deltaVelocity: scale(setup.tangentDirection, bestCorrection),
    scalarCorrection: bestCorrection,
    correctionMagnitude: Math.abs(bestCorrection),
    missDistance: Math.abs(bestResult.radialMiss),
    nominalMissDistance,
    iterations: maxIterations,
    converged: Math.abs(bestResult.radialMiss) <= tolerance,
    failureReason: Math.abs(bestResult.radialMiss) <= tolerance ? undefined : 'no-scalar-root',
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

export function vBuckCostFromCorrection(deltaVelocity: Vec2, massTons: number, rate = 1): number {
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

type ScalarTransferSetup = {
  payloadTemplate: PayloadState;
  destination:
    | { kind: 'barbell-end'; targetBarbell: BarbellState; targetEndpoint: EndpointKey }
    | { kind: 'fleet-central'; startTimeSeconds: number }
    | { kind: 'planet-disposal' };
  tangentDirection: Vec2;
  gravitationalParameter: number;
};

type ScalarEvaluation = {
  converged: boolean;
  radialMiss: number;
};

function createScalarTransferSetup(state: BeanstalkSystemState, target: TransferTarget): ScalarTransferSetup {
  const sourceBarbell = state.barbells.find(barbell => barbell.id === target.sourceBarbellId);
  if (!sourceBarbell) {
    throw new Error('Scalar transfer solve needs a source barbell.');
  }
  const targetBarbell = state.barbells.find(barbell => barbell.id === target.targetBarbellId);
  if (target.destinationKind !== 'fleet-central' && target.destinationKind !== 'planet-disposal' && !targetBarbell) {
    throw new Error('Scalar transfer solve needs a target barbell.');
  }
  const sourceEndpoint = getEndpointState(sourceBarbell, target.sourceEndpoint);
  return {
    payloadTemplate: createPayloadFromEndpoint({
      id: 'solver-payload',
      kind: target.kind,
      massTons: target.massTons,
      endpoint: sourceEndpoint,
    }),
    destination: target.destinationKind === 'fleet-central'
      ? { kind: 'fleet-central', startTimeSeconds: state.timeSeconds }
      : target.destinationKind === 'planet-disposal'
        ? { kind: 'planet-disposal' }
        : { kind: 'barbell-end', targetBarbell: cloneBarbell(targetBarbell!), targetEndpoint: target.targetEndpoint },
    tangentDirection: getReleaseTangentDirection(sourceEndpoint),
    gravitationalParameter: state.gravitationalParameter,
  };
}

function getReleaseTangentDirection(sourceEndpoint: EndpointState): Vec2 {
  const radial = normalize(sourceEndpoint.position);
  const radialVelocity = scale(radial, dot(sourceEndpoint.velocity, radial));
  const tangentVelocity = sub(sourceEndpoint.velocity, radialVelocity);
  const tangentFromVelocity = normalize(tangentVelocity);
  if (length(tangentFromVelocity) > 0) {
    return tangentFromVelocity;
  }
  return normalize(vec(-radial.y, radial.x));
}

function evaluateScalarCorrection(
  setup: ScalarTransferSetup,
  scalarCorrection: number,
  dt: number,
  maxSeconds: number,
): ScalarEvaluation {
  let payload: PayloadState = {
    ...setup.payloadTemplate,
    position: { ...setup.payloadTemplate.position },
    velocity: add(setup.payloadTemplate.velocity, scale(setup.tangentDirection, scalarCorrection)),
  };
  let targetBarbell = setup.destination.kind === 'barbell-end'
    ? cloneBarbell(setup.destination.targetBarbell)
    : null;
  let previousError = angularErrorBetween(payload.position, getTargetPosition(setup, 0, targetBarbell));
  let elapsed = 0;

  while (elapsed < maxSeconds) {
    const step = Math.min(dt, maxSeconds - elapsed);
    payload = stepPayload(payload, setup.gravitationalParameter, step);
    elapsed += step;
    targetBarbell = targetBarbell ? stepBarbell(targetBarbell, setup.gravitationalParameter, step) : null;
    const targetPosition = getTargetPosition(setup, elapsed, targetBarbell);
    const currentError = angularErrorBetween(payload.position, targetPosition);
    if (didPassCatchAngle(previousError, currentError)) {
      return {
        converged: true,
        radialMiss: length(payload.position) - length(targetPosition),
      };
    }
    previousError = currentError;
  }

  return {
    converged: false,
    radialMiss: Number.POSITIVE_INFINITY,
  };
}

function getTargetPosition(setup: ScalarTransferSetup, elapsedSeconds: number, targetBarbell: BarbellState | null): Vec2 {
  if (setup.destination.kind === 'fleet-central') {
    return getFleetCentralState({
      timeSeconds: setup.destination.startTimeSeconds + elapsedSeconds,
      gravitationalParameter: setup.gravitationalParameter,
    }).position;
  }
  if (setup.destination.kind === 'planet-disposal') {
    throw new Error('Planet disposal has no angular target position.');
  }
  if (!targetBarbell) {
    throw new Error('Barbell target evaluation needs a target barbell.');
  }
  return getEndpointState(targetBarbell, setup.destination.targetEndpoint).position;
}

function evaluatePlanetDisposalCorrection(
  setup: ScalarTransferSetup,
  scalarCorrection: number,
  planetRadius: number,
): ScalarEvaluation {
  const payload: PayloadState = {
    ...setup.payloadTemplate,
    position: { ...setup.payloadTemplate.position },
    velocity: add(setup.payloadTemplate.velocity, scale(setup.tangentDirection, scalarCorrection)),
  };
  return {
    converged: true,
    radialMiss: computePerigeeRadius(payload.position, payload.velocity, setup.gravitationalParameter) - planetRadius,
  };
}

function findPlanetDisposalBracket(
  setup: ScalarTransferSetup,
  planetRadius: number,
  searchLimit: number,
  tolerance: number,
): {
  low: number;
  high: number;
  lowResult: ScalarEvaluation;
  highResult: ScalarEvaluation;
} | null {
  const samples = 81;
  const zeroResult = evaluatePlanetDisposalCorrection(setup, 0, planetRadius);
  for (let index = 1; index <= samples; index += 1) {
    const magnitude = (searchLimit * index) / samples;
    for (const correction of [-magnitude, magnitude]) {
      const result = evaluatePlanetDisposalCorrection(setup, correction, planetRadius);
      if (Math.abs(result.radialMiss) <= tolerance) {
        return { low: correction, high: correction, lowResult: result, highResult: result };
      }
      if (Math.sign(zeroResult.radialMiss) !== Math.sign(result.radialMiss)) {
        return correction < 0
          ? { low: correction, high: 0, lowResult: result, highResult: zeroResult }
          : { low: 0, high: correction, lowResult: zeroResult, highResult: result };
      }
    }
  }
  return null;
}

export function computePerigeeRadius(position: Vec2, velocity: Vec2, gravitationalParameter: number): number {
  const radius = length(position);
  const speedSq = dot(velocity, velocity);
  const h = cross(position, velocity);
  if (Math.abs(h) < 1e-9) {
    return 0;
  }
  const energy = speedSq / 2 - gravitationalParameter / radius;
  const eccentricity = Math.sqrt(Math.max(0, 1 + (2 * energy * h * h) / (gravitationalParameter * gravitationalParameter)));
  return (h * h / gravitationalParameter) / (1 + eccentricity);
}

function findScalarRootBracket(
  setup: ScalarTransferSetup,
  dt: number,
  maxSeconds: number,
  searchLimit: number,
  tolerance: number,
): {
  low: number;
  high: number;
  lowResult: ScalarEvaluation;
  highResult: ScalarEvaluation;
} | null {
  const samples = 81;
  let previousCorrection: number | null = null;
  let previousResult: ScalarEvaluation | null = null;
  for (let index = 0; index < samples; index += 1) {
    const correction = -searchLimit + (2 * searchLimit * index) / (samples - 1);
    const result = evaluateScalarCorrection(setup, correction, dt, maxSeconds);
    if (!result.converged) {
      continue;
    }
    if (Math.abs(result.radialMiss) <= tolerance) {
      return {
        low: correction,
        high: correction,
        lowResult: result,
        highResult: result,
      };
    }
    if (
      previousResult
      && previousCorrection !== null
      && Math.sign(previousResult.radialMiss) !== Math.sign(result.radialMiss)
    ) {
      return {
        low: previousCorrection,
        high: correction,
        lowResult: previousResult,
        highResult: result,
      };
    }
    previousCorrection = correction;
    previousResult = result;
  }
  return null;
}

function stepPayload(payload: PayloadState, gravitationalParameter: number, dt: number): PayloadState {
  const acceleration = computeGravityAcceleration(payload.position, gravitationalParameter);
  const velocity = add(payload.velocity, scale(acceleration, dt));
  return {
    ...payload,
    velocity,
    position: add(payload.position, scale(velocity, dt)),
  };
}

function stepBarbell(barbell: BarbellState, gravitationalParameter: number, dt: number): BarbellState {
  const next = cloneBarbell(barbell);
  const derivative = computeBarbellDerivative(next, gravitationalParameter);
  next.velocity = add(next.velocity, scale(derivative.centerAcceleration, dt));
  next.angularVelocityRadPerSecond += derivative.angularAcceleration * dt;
  next.center = add(next.center, scale(next.velocity, dt));
  next.angleRad += next.angularVelocityRadPerSecond * dt;
  return next;
}

function cloneBarbell(barbell: BarbellState): BarbellState {
  return {
    ...barbell,
    center: { ...barbell.center },
    velocity: { ...barbell.velocity },
    inner: { ...barbell.inner },
    outer: { ...barbell.outer },
  };
}

function didPassCatchAngle(previousError: number, currentError: number): boolean {
  const nearCatchLine = Math.abs(previousError) < Math.PI / 2 || Math.abs(currentError) < Math.PI / 2;
  return nearCatchLine && previousError * currentError <= 0;
}

function angularErrorBetween(payloadPosition: Vec2, targetPosition: Vec2): number {
  return Math.atan2(cross(payloadPosition, targetPosition), dot(payloadPosition, targetPosition));
}
