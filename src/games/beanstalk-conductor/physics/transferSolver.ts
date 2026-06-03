import {
  type BarbellState,
  type BeanstalkSystemState,
  type EndpointKey,
  type PayloadState,
  type Vec2,
  add,
  cloneSystem,
  computeBarbellDerivative,
  computeGravityAcceleration,
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
import { createSurfaceLauncherState, getFleetCentralState } from './initialState';

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
  minCatchSeconds: number;
  scalarBounds?: { low: number; high: number; reason?: string };
  boundEvaluations?: {
    low: TransferSolveBoundEvaluation;
    high: TransferSolveBoundEvaluation;
    bracketsRoot: boolean;
  };
  trace?: TransferSolveTraceEvent[];
  failureReason?: 'no-angular-crossing' | 'no-scalar-root' | 'retrograde-root';
};

export type TransferSolveBoundEvaluation = {
  scalarCorrection: number;
  altitudeError: number;
  catchElapsedSeconds: number | null;
  crossedTargetAngle: boolean;
};

export type TransferSolveTraceEvent = {
  phase: 'sample' | 'bisect';
  iteration: number;
  scalarCorrection: number;
  radialMiss: number;
  catchElapsedSeconds: number | null;
  payloadAngularMomentum: number | null;
  targetCircularAngularMomentum: number | null;
  deltaAngularMomentum: number | null;
  converged: boolean;
};

const CIVIC_PRIME_SOURCE_ID = 'civic-prime-space-gun';
const FLEET_CENTRAL_SOURCE_ID = 'fleet-central-downmass-source';
const CATCH_ARM_ANGLE_RAD = 0.015;
const MAX_TRANSFER_ANGULAR_TRAVEL_RAD = Math.PI * 2;

export function solveTransferCorrection(
  state: BeanstalkSystemState,
  target: TransferTarget,
  options?: {
    dt?: number;
    tolerance?: number;
    maxIterations?: number;
    maxSeconds?: number;
    searchLimit?: number;
    collectTrace?: boolean;
  },
): TransferSolveResult {
  if (target.destinationKind === 'planet-disposal') {
    return solvePlanetDisposalCorrection(state, target, options);
  }

  const maxIterations = options?.maxIterations ?? 48;
  const dt = options?.dt ?? 0.05;
  const maxSeconds = options?.maxSeconds ?? target.durationSeconds * 20;
  const searchLimit = options?.searchLimit ?? 80;
  const setup = createScalarTransferSetup(state, target);
  const tolerance = options?.tolerance ?? getDefaultScalarTolerance(setup);
  const trace: TransferSolveTraceEvent[] | undefined = options?.collectTrace ? [] : undefined;
  const scalarBounds = getScalarSearchBounds(setup, searchLimit);
  let boundEvaluations = evaluateScalarBounds(setup, scalarBounds, dt, maxSeconds);
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
      minCatchSeconds: setup.minCatchSeconds,
      scalarBounds,
      boundEvaluations,
      trace,
    };
  }

  const bracketSearch = findScalarRootBracket(setup, dt, maxSeconds, searchLimit, tolerance, trace);
  const bracket = bracketSearch.bracket;
  boundEvaluations = {
    ...boundEvaluations,
    bracketsRoot: bracket !== null,
  };
  if (!bracket) {
    const bestSample = bracketSearch.bestSample;
    const missDistance = bestSample
      ? Math.abs(bestSample.result.radialMiss)
      : nominalMissDistance;
    return {
      deltaVelocity: bestSample ? scale(setup.tangentDirection, bestSample.correction) : vec(0, 0),
      scalarCorrection: bestSample?.correction ?? 0,
      correctionMagnitude: Math.abs(bestSample?.correction ?? 0),
      missDistance,
      nominalMissDistance,
      iterations: 0,
      converged: false,
      minCatchSeconds: setup.minCatchSeconds,
      scalarBounds,
      boundEvaluations,
      trace,
      failureReason: bestSample || nominal.converged ? 'no-scalar-root' : 'no-angular-crossing',
    };
  }

  let low = bracket.low;
  let high = bracket.high;
  let lowResult = bracket.lowResult;
  let highResult = bracket.highResult;
  let bestCorrection = Math.abs(lowResult.radialMiss) <= Math.abs(highResult.radialMiss) ? low : high;
  let bestResult = Math.abs(lowResult.radialMiss) <= Math.abs(highResult.radialMiss) ? lowResult : highResult;

  let iterations = 0;
  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const middle = (low + high) / 2;
    const middleResult = evaluateScalarCorrection(setup, middle, dt, maxSeconds);
    iterations = iteration + 1;
    pushTrace(trace, 'bisect', iteration, middle, middleResult, setup);
    if (!middleResult.converged) {
      break;
    }

    if (Math.abs(middleResult.radialMiss) < Math.abs(bestResult.radialMiss)) {
      bestCorrection = middle;
      bestResult = middleResult;
    }

    if (Math.abs(middleResult.radialMiss) <= tolerance) {
      const deltaVelocity = scale(setup.tangentDirection, middle);
      const accepted = acceptScalarCorrection(setup, middle);
      if (accepted) {
        return {
          deltaVelocity,
          scalarCorrection: middle,
          correctionMagnitude: Math.abs(middle),
          missDistance: Math.abs(middleResult.radialMiss),
          nominalMissDistance,
          iterations: iteration + 1,
          converged: true,
          minCatchSeconds: setup.minCatchSeconds,
          scalarBounds,
          boundEvaluations,
          trace,
        };
      }
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
  const converged = Math.abs(bestResult.radialMiss) <= tolerance && acceptScalarCorrection(setup, bestCorrection);
  return {
    deltaVelocity,
    scalarCorrection: bestCorrection,
    correctionMagnitude: Math.abs(bestCorrection),
    missDistance: Math.abs(bestResult.radialMiss),
    nominalMissDistance,
    iterations,
    converged,
    minCatchSeconds: setup.minCatchSeconds,
    scalarBounds,
    boundEvaluations,
    trace,
    failureReason: converged ? undefined : (
      Math.abs(bestResult.radialMiss) <= tolerance ? 'retrograde-root' : 'no-scalar-root'
    ),
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
      minCatchSeconds: 0.15,
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
      minCatchSeconds: 0.15,
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
        minCatchSeconds: 0.15,
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
    minCatchSeconds: 0.15,
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
  const source = getTransferSourceState(simulated, target);
  simulated.payloads.push(createPayloadFromSourceState('solver-payload', target, source, deltaVelocity));

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
  sourceKind: TransferSourceState['kind'];
  destination:
    | {
        kind: 'barbell-end';
        targetBarbell: BarbellState;
        targetEndpoint: EndpointKey;
        transferOrbitTargetPosition: Vec2;
        catchTimingPosition: Vec2;
        catchReference: 'center' | 'endpoint';
      }
    | { kind: 'fleet-central'; startTimeSeconds: number }
    | { kind: 'planet-disposal' };
  tangentDirection: Vec2;
  gravitationalParameter: number;
  progradeScalarOnly: boolean;
  requireProgradeResult: boolean;
  minCatchSeconds: number;
  catchTolerance: number;
  correctionBounds?: { low: number; high: number };
};

export type TransferSourceState = {
  kind: 'barbell-end' | 'civic-prime-launcher' | 'fleet-central-source';
  position: Vec2;
  velocity: Vec2;
  tangentDirection: Vec2;
  progradeScalarOnly: boolean;
  requireProgradeResult: boolean;
  correctionBounds?: { low: number; high: number };
};

type ScalarEvaluation = {
  converged: boolean;
  radialMiss: number;
  catchElapsedSeconds: number | null;
  payloadAngularMomentum: number | null;
};

function createScalarTransferSetup(state: BeanstalkSystemState, target: TransferTarget): ScalarTransferSetup {
  const targetBarbell = state.barbells.find(barbell => barbell.id === target.targetBarbellId);
  if (target.destinationKind !== 'fleet-central' && target.destinationKind !== 'planet-disposal' && !targetBarbell) {
    throw new Error('Scalar transfer solve needs a target barbell.');
  }
  const source = getTransferSourceState(state, target);
  const transferOrbitTargetPosition = target.destinationKind === 'fleet-central'
    ? getFleetCentralState({
        timeSeconds: state.timeSeconds,
        gravitationalParameter: state.gravitationalParameter,
      }).position
    : target.destinationKind === 'planet-disposal'
      ? source.position
      : { ...targetBarbell!.center };
  const catchReference = source.kind === 'fleet-central-source' ? 'center' : 'endpoint';
  const targetEnvelope = targetBarbell
    ? getTargetBarbellRadialEnvelope(targetBarbell, state.gravitationalParameter)
    : null;
  const catchTimingPosition = target.destinationKind === 'fleet-central' || target.destinationKind === 'planet-disposal'
    ? transferOrbitTargetPosition
    : catchReference === 'center'
      ? targetBarbell!.center
      : getEndpointState(targetBarbell!, target.targetEndpoint).position;
  return {
    payloadTemplate: createPayloadFromSourceState('solver-payload', target, source),
    sourceKind: source.kind,
    destination: target.destinationKind === 'fleet-central'
      ? { kind: 'fleet-central', startTimeSeconds: state.timeSeconds }
      : target.destinationKind === 'planet-disposal'
        ? { kind: 'planet-disposal' }
        : {
            kind: 'barbell-end',
            targetBarbell: cloneBarbell(targetBarbell!),
            targetEndpoint: target.targetEndpoint,
            transferOrbitTargetPosition,
            catchTimingPosition,
            catchReference,
          },
    tangentDirection: source.tangentDirection,
    gravitationalParameter: state.gravitationalParameter,
    progradeScalarOnly: source.progradeScalarOnly,
    requireProgradeResult: source.requireProgradeResult,
    minCatchSeconds: source.kind === 'fleet-central-source' || target.destinationKind === 'fleet-central'
      ? estimateTransferOrbitHalfPeriod(
          source.position,
          catchTimingPosition,
          state.gravitationalParameter,
        )
      : 0.15,
    catchTolerance: source.kind === 'fleet-central-source' && targetEnvelope
      ? Math.max(1, targetEnvelope.longLeg)
      : 1,
    correctionBounds: source.correctionBounds,
  };
}

export function getTransferSourceState(
  state: BeanstalkSystemState,
  target: TransferTarget,
): TransferSourceState {
  if (target.sourceBarbellId === CIVIC_PRIME_SOURCE_ID) {
    const launcher = createSurfaceLauncherState();
    const radial = normalize(launcher.position);
    return {
      kind: 'civic-prime-launcher',
      position: { ...launcher.position },
      velocity: { ...launcher.velocity },
      tangentDirection: normalize(vec(-radial.y, radial.x)),
      progradeScalarOnly: true,
      requireProgradeResult: true,
    };
  }

  if (target.sourceBarbellId === FLEET_CENTRAL_SOURCE_ID) {
    const station = getFleetCentralState({
      timeSeconds: state.timeSeconds,
      gravitationalParameter: state.gravitationalParameter,
    });
    return {
      kind: 'fleet-central-source',
      position: { ...station.position },
      velocity: { ...station.velocity },
      tangentDirection: normalize(station.velocity),
      progradeScalarOnly: false,
      requireProgradeResult: true,
      correctionBounds: {
        low: -length(station.velocity) + 0.000001,
        high: length(station.velocity),
      },
    };
  }

  const sourceBarbell = state.barbells.find(barbell => barbell.id === target.sourceBarbellId);
  if (!sourceBarbell) {
    throw new Error(`Unknown source barbell ${target.sourceBarbellId}.`);
  }
  const sourceEndpoint = getEndpointState(sourceBarbell, target.sourceEndpoint);
  return {
    kind: 'barbell-end',
    position: { ...sourceEndpoint.position },
    velocity: { ...sourceEndpoint.velocity },
    tangentDirection: getReleaseTangentDirection(sourceEndpoint.position, sourceEndpoint.velocity),
    progradeScalarOnly: false,
    requireProgradeResult: true,
  };
}

export function createPayloadFromSourceState(
  id: string,
  target: TransferTarget,
  source: TransferSourceState,
  deltaVelocity: Vec2 = vec(0, 0),
): PayloadState {
  return {
    id,
    kind: target.kind,
    massTons: target.massTons,
    position: { ...source.position },
    velocity: add(source.velocity, deltaVelocity),
  };
}

function getReleaseTangentDirection(position: Vec2, velocity: Vec2): Vec2 {
  const radial = normalize(position);
  const radialVelocity = scale(radial, dot(velocity, radial));
  const tangentVelocity = sub(velocity, radialVelocity);
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
  if (!acceptScalarCorrection(setup, scalarCorrection)) {
    return {
      converged: false,
      radialMiss: Number.POSITIVE_INFINITY,
      catchElapsedSeconds: null,
      payloadAngularMomentum: null,
    };
  }
  let payload: PayloadState = {
    ...setup.payloadTemplate,
    position: { ...setup.payloadTemplate.position },
    velocity: add(setup.payloadTemplate.velocity, scale(setup.tangentDirection, scalarCorrection)),
  };
  let targetBarbell = setup.destination.kind === 'barbell-end'
    ? cloneBarbell(setup.destination.targetBarbell)
    : null;
  let previousError = angularErrorBetween(payload.position, getTargetPosition(setup, 0, targetBarbell));
  let catchArmed = Math.abs(previousError) >= CATCH_ARM_ANGLE_RAD;
  let angularTravel = 0;
  let elapsed = 0;

  while (elapsed < maxSeconds) {
    const step = Math.min(dt, maxSeconds - elapsed);
    payload = stepPayload(payload, setup.gravitationalParameter, step);
    elapsed += step;
    targetBarbell = targetBarbell ? stepBarbell(targetBarbell, setup.gravitationalParameter, step) : null;
    const targetPosition = getTargetPosition(setup, elapsed, targetBarbell);
    const currentError = angularErrorBetween(payload.position, targetPosition);
    angularTravel += Math.abs(signedAngularDelta(previousError, currentError));
    if (elapsed >= setup.minCatchSeconds && catchArmed && didPassCatchAngle(previousError, currentError)) {
      return {
        converged: true,
        radialMiss: length(payload.position) - length(targetPosition),
        catchElapsedSeconds: elapsed,
        payloadAngularMomentum: cross(payload.position, payload.velocity),
      };
    }
    if (!catchArmed && elapsed >= setup.minCatchSeconds && Math.abs(currentError) >= CATCH_ARM_ANGLE_RAD) {
      catchArmed = true;
    }
    if (angularTravel >= MAX_TRANSFER_ANGULAR_TRAVEL_RAD) {
      return {
        converged: false,
        radialMiss: Number.POSITIVE_INFINITY,
        catchElapsedSeconds: null,
        payloadAngularMomentum: null,
      };
    }
    previousError = currentError;
  }

  return {
    converged: false,
    radialMiss: Number.POSITIVE_INFINITY,
    catchElapsedSeconds: null,
    payloadAngularMomentum: null,
  };
}

function acceptScalarCorrection(setup: ScalarTransferSetup, scalarCorrection: number): boolean {
  if (setup.progradeScalarOnly && scalarCorrection < 0) {
    return false;
  }
  if (!setup.requireProgradeResult) {
    return true;
  }
  const velocity = add(setup.payloadTemplate.velocity, scale(setup.tangentDirection, scalarCorrection));
  return cross(setup.payloadTemplate.position, velocity) > 0;
}

function getDefaultScalarTolerance(setup: ScalarTransferSetup): number {
  return setup.catchTolerance;
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
  if (setup.destination.catchReference === 'center') {
    return targetBarbell.center;
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
    catchElapsedSeconds: null,
    payloadAngularMomentum: cross(payload.position, payload.velocity),
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
  return computeOrbitApsides(position, velocity, gravitationalParameter).perigeeRadius;
}

export function computeOrbitApsides(position: Vec2, velocity: Vec2, gravitationalParameter: number): {
  perigeeRadius: number;
  apogeeRadius: number;
  semiMajorAxis: number;
  eccentricity: number;
  specificAngularMomentum: number;
  specificEnergy: number;
} {
  const radius = length(position);
  const speedSq = dot(velocity, velocity);
  const h = cross(position, velocity);
  if (gravitationalParameter <= 0) {
    return {
      perigeeRadius: radius,
      apogeeRadius: radius,
      semiMajorAxis: radius,
      eccentricity: 0,
      specificAngularMomentum: h,
      specificEnergy: speedSq / 2,
    };
  }
  if (Math.abs(h) < 1e-9) {
    return {
      perigeeRadius: 0,
      apogeeRadius: Number.POSITIVE_INFINITY,
      semiMajorAxis: Number.POSITIVE_INFINITY,
      eccentricity: 1,
      specificAngularMomentum: h,
      specificEnergy: Number.POSITIVE_INFINITY,
    };
  }
  const energy = speedSq / 2 - gravitationalParameter / radius;
  const eccentricity = Math.sqrt(Math.max(0, 1 + (2 * energy * h * h) / (gravitationalParameter * gravitationalParameter)));
  const perigeeRadius = (h * h / gravitationalParameter) / (1 + eccentricity);
  const semiMajorAxis = energy < 0 ? -gravitationalParameter / (2 * energy) : Number.POSITIVE_INFINITY;
  const apogeeRadius = energy < 0
    ? semiMajorAxis * (1 + eccentricity)
    : Number.POSITIVE_INFINITY;
  return {
    perigeeRadius,
    apogeeRadius,
    semiMajorAxis,
    eccentricity,
    specificAngularMomentum: h,
    specificEnergy: energy,
  };
}

function findScalarRootBracket(
  setup: ScalarTransferSetup,
  dt: number,
  maxSeconds: number,
  searchLimit: number,
  tolerance: number,
  trace?: TransferSolveTraceEvent[],
): {
  bracket: {
    low: number;
    high: number;
    lowResult: ScalarEvaluation;
    highResult: ScalarEvaluation;
  } | null;
  bestSample: { correction: number; result: ScalarEvaluation } | null;
} {
  let previousCorrection: number | null = null;
  let previousResult: ScalarEvaluation | null = null;
  let bestSample: { correction: number; result: ScalarEvaluation } | null = null;
  for (const [iteration, correction] of getScalarSamples(setup, searchLimit).entries()) {
    const result = evaluateScalarCorrection(setup, correction, dt, maxSeconds);
    pushTrace(trace, 'sample', iteration, correction, result, setup);
    if (!result.converged) {
      previousCorrection = null;
      previousResult = null;
      continue;
    }
    if (Math.abs(result.radialMiss) <= tolerance) {
      return {
        bracket: {
          low: correction,
          high: correction,
          lowResult: result,
          highResult: result,
        },
        bestSample: { correction, result },
      };
    }
    if (!bestSample || Math.abs(result.radialMiss) < Math.abs(bestSample.result.radialMiss)) {
      bestSample = { correction, result };
    }
    if (
      previousResult
      && previousCorrection !== null
      && Math.sign(previousResult.radialMiss) !== Math.sign(result.radialMiss)
    ) {
      return {
        bracket: {
          low: previousCorrection,
          high: correction,
          lowResult: previousResult,
          highResult: result,
        },
        bestSample,
      };
    }
    previousCorrection = correction;
    previousResult = result;
  }
  return { bracket: null, bestSample };
}

function evaluateScalarBounds(
  setup: ScalarTransferSetup,
  bounds: { low: number; high: number },
  dt: number,
  maxSeconds: number,
): NonNullable<TransferSolveResult['boundEvaluations']> {
  const low = evaluateScalarCorrection(setup, bounds.low, dt, maxSeconds);
  const high = evaluateScalarCorrection(setup, bounds.high, dt, maxSeconds);
  return {
    low: {
      scalarCorrection: bounds.low,
      altitudeError: low.radialMiss,
      catchElapsedSeconds: low.catchElapsedSeconds,
      crossedTargetAngle: low.converged,
    },
    high: {
      scalarCorrection: bounds.high,
      altitudeError: high.radialMiss,
      catchElapsedSeconds: high.catchElapsedSeconds,
      crossedTargetAngle: high.converged,
    },
    bracketsRoot: low.converged
      && high.converged
      && Math.sign(low.radialMiss) !== Math.sign(high.radialMiss),
  };
}

function getScalarSamples(setup: ScalarTransferSetup, searchLimit: number): number[] {
  const samples = 161;
  const bounds = getScalarSearchBounds(setup, searchLimit);
  const corrections: number[] = [];
  for (let index = 0; index < samples; index += 1) {
    corrections.push(bounds.low + ((bounds.high - bounds.low) * index) / (samples - 1));
  }
  const transferOrbitCorrection = estimateTangentialTransferOrbitCorrection(setup);
  if (
    transferOrbitCorrection !== null
    && transferOrbitCorrection >= bounds.low
    && transferOrbitCorrection <= bounds.high
  ) {
    corrections.push(transferOrbitCorrection);
  }
  const endpointTransferOrbitCorrection = setup.destination.kind === 'barbell-end'
    ? estimateTangentialTransferOrbitCorrectionForPosition(setup, setup.destination.catchTimingPosition)
    : null;
  if (
    endpointTransferOrbitCorrection !== null
    && endpointTransferOrbitCorrection >= bounds.low
    && endpointTransferOrbitCorrection <= bounds.high
  ) {
    corrections.push(endpointTransferOrbitCorrection);
  }
  if (0 >= bounds.low && 0 <= bounds.high) {
    corrections.push(0);
  }
  return [...new Set(corrections)].sort((a, b) => a - b);
}

function estimateTangentialTransferOrbitCorrection(setup: ScalarTransferSetup): number | null {
  if (setup.destination.kind === 'planet-disposal') {
    return null;
  }
  const transferOrbitTargetPosition = setup.destination.kind === 'barbell-end'
    ? setup.destination.transferOrbitTargetPosition
    : getTargetPosition(setup, 0, null);
  return estimateTangentialTransferOrbitCorrectionForPosition(setup, transferOrbitTargetPosition);
}

function estimateTangentialTransferOrbitCorrectionForPosition(
  setup: ScalarTransferSetup,
  transferOrbitTargetPosition: Vec2,
): number | null {
  const sourceRadius = length(setup.payloadTemplate.position);
  const targetRadius = length(transferOrbitTargetPosition);
  if (sourceRadius <= 0 || targetRadius <= 0 || setup.gravitationalParameter <= 0) {
    return null;
  }
  const semiMajorAxis = (sourceRadius + targetRadius) / 2;
  const transferSpeedSq = setup.gravitationalParameter * ((2 / sourceRadius) - (1 / semiMajorAxis));
  if (transferSpeedSq <= 0) {
    return null;
  }
  const currentTangentialSpeed = dot(setup.payloadTemplate.velocity, setup.tangentDirection);
  return Math.sqrt(transferSpeedSq) - currentTangentialSpeed;
}

function estimateTransferOrbitHalfPeriod(sourcePosition: Vec2, targetPosition: Vec2, gravitationalParameter: number): number {
  const sourceRadius = length(sourcePosition);
  const targetRadius = length(targetPosition);
  if (sourceRadius <= 0 || targetRadius <= 0 || gravitationalParameter <= 0) {
    return 0.15;
  }
  const semiMajorAxis = (sourceRadius + targetRadius) / 2;
  return Math.max(0.15, Math.PI * Math.sqrt((semiMajorAxis ** 3) / gravitationalParameter));
}

function getScalarSearchBounds(setup: ScalarTransferSetup, searchLimit: number): { low: number; high: number } {
  const physicalBounds = getApsisConstrainedScalarBounds(setup);
  let low = setup.progradeScalarOnly ? 0 : -searchLimit;
  const high = searchLimit;
  let boundedHigh = high;
  if (setup.correctionBounds) {
    low = Math.max(low, setup.correctionBounds.low);
    boundedHigh = Math.min(boundedHigh, setup.correctionBounds.high);
  }
  if (physicalBounds) {
    low = Math.max(low, physicalBounds.low);
    boundedHigh = Math.min(boundedHigh, physicalBounds.high);
  }
  if (setup.requireProgradeResult) {
    const baseAngularMomentum = cross(setup.payloadTemplate.position, setup.payloadTemplate.velocity);
    const correctionAngularMomentum = cross(setup.payloadTemplate.position, setup.tangentDirection);
    if (correctionAngularMomentum > 0) {
      low = Math.max(low, (-baseAngularMomentum / correctionAngularMomentum) + 0.000001);
    }
  }
  return low <= boundedHigh ? { low, high: boundedHigh } : { low: boundedHigh, high: boundedHigh };
}

function getApsisConstrainedScalarBounds(setup: ScalarTransferSetup): { low: number; high: number } | null {
  if (setup.destination.kind !== 'barbell-end' || setup.sourceKind !== 'barbell-end') {
    return null;
  }
  const sourceRadius = length(setup.payloadTemplate.position);
  const sourceTangentialSpeed = dot(setup.payloadTemplate.velocity, setup.tangentDirection);
  const targetBounds = getTargetBarbellRadialEnvelope(setup.destination.targetBarbell, setup.gravitationalParameter);
  const circularizationCorrection = tangentialCorrectionToCircularizeAtRadius(
    sourceRadius,
    sourceTangentialSpeed,
    setup.gravitationalParameter,
  );
  if (circularizationCorrection === null || Math.abs(circularizationCorrection) <= 1e-9) {
    return null;
  }
  const desiredRadii = sourceRadius <= targetBounds.maxRadius
    ? [Math.max(sourceRadius, targetBounds.minRadius), targetBounds.maxRadius]
    : [targetBounds.minRadius, Math.min(sourceRadius, targetBounds.maxRadius)];
  const corrections = desiredRadii
    .map(radius => tangentialSpeedForApsisTransfer(sourceRadius, radius, setup.gravitationalParameter))
    .filter((speed): speed is number => speed !== null)
    .map(speed => speed - sourceTangentialSpeed);
  const oppositeSignCorrections = corrections.filter(correction => (
    Math.sign(correction) !== 0
    && Math.sign(correction) !== Math.sign(circularizationCorrection)
  ));
  const reflectedNaturalReleaseBound = -circularizationCorrection;
  const oppositeBound = oppositeSignCorrections.length > 0
    ? oppositeSignCorrections.reduce((best, correction) => (
        Math.abs(correction) > Math.abs(best) ? correction : best
      ))
    : reflectedNaturalReleaseBound;

  if (circularizationCorrection < 0) {
    return {
      low: circularizationCorrection,
      high: Math.max(oppositeBound, reflectedNaturalReleaseBound),
    };
  }
  return {
    low: Math.min(oppositeBound, reflectedNaturalReleaseBound),
    high: circularizationCorrection,
  };
}

function getTargetBarbellRadialEnvelope(
  barbell: BarbellState,
  gravitationalParameter: number,
): { minRadius: number; maxRadius: number; longLeg: number; centerPerigee: number; centerApogee: number } {
  const orbit = computeOrbitApsides(barbell.center, barbell.velocity, gravitationalParameter);
  const inner = getEndpointState(barbell, 'inner');
  const outer = getEndpointState(barbell, 'outer');
  const longLeg = Math.max(length(sub(inner.position, barbell.center)), length(sub(outer.position, barbell.center)));
  return {
    minRadius: Math.max(0.001, orbit.perigeeRadius - longLeg),
    maxRadius: Number.isFinite(orbit.apogeeRadius) ? orbit.apogeeRadius + longLeg : Number.POSITIVE_INFINITY,
    longLeg,
    centerPerigee: orbit.perigeeRadius,
    centerApogee: orbit.apogeeRadius,
  };
}

function tangentialSpeedForApsisTransfer(
  sourceRadius: number,
  targetApsisRadius: number,
  gravitationalParameter: number,
): number | null {
  if (
    sourceRadius <= 0
    || targetApsisRadius <= 0
    || !Number.isFinite(targetApsisRadius)
    || gravitationalParameter <= 0
  ) {
    return null;
  }
  const semiMajorAxis = (sourceRadius + targetApsisRadius) / 2;
  const speedSq = gravitationalParameter * ((2 / sourceRadius) - (1 / semiMajorAxis));
  return speedSq > 0 ? Math.sqrt(speedSq) : null;
}

function tangentialCorrectionToCircularizeAtRadius(
  barbellEndRadius: number,
  currentBarbellEndTangentialSpeed: number,
  gravitationalParameter: number,
): number | null {
  if (barbellEndRadius <= 0 || gravitationalParameter <= 0) {
    return null;
  }
  return Math.sqrt(gravitationalParameter / barbellEndRadius) - currentBarbellEndTangentialSpeed;
}

function pushTrace(
  trace: TransferSolveTraceEvent[] | undefined,
  phase: TransferSolveTraceEvent['phase'],
  iteration: number,
  scalarCorrection: number,
  result: ScalarEvaluation,
  setup: ScalarTransferSetup,
): void {
  if (!trace) {
    return;
  }
  const targetAngularMomentum = getTargetCircularAngularMomentum(setup);
  trace.push({
    phase,
    iteration,
    scalarCorrection,
    radialMiss: result.radialMiss,
    catchElapsedSeconds: result.catchElapsedSeconds,
    payloadAngularMomentum: result.payloadAngularMomentum,
    targetCircularAngularMomentum: targetAngularMomentum,
    deltaAngularMomentum: result.payloadAngularMomentum !== null && targetAngularMomentum !== null
      ? result.payloadAngularMomentum - targetAngularMomentum
      : null,
    converged: result.converged,
  });
}

function getTargetCircularAngularMomentum(setup: ScalarTransferSetup): number | null {
  if (setup.destination.kind === 'planet-disposal' || setup.gravitationalParameter <= 0) {
    return null;
  }
  const targetPosition = setup.destination.kind === 'barbell-end'
    ? setup.destination.catchTimingPosition
    : getTargetPosition(setup, 0, null);
  const radius = length(targetPosition);
  return radius > 0 ? Math.sqrt(setup.gravitationalParameter * radius) : null;
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

function signedAngularDelta(previousError: number, currentError: number): number {
  let delta = currentError - previousError;
  while (delta > Math.PI) {
    delta -= Math.PI * 2;
  }
  while (delta < -Math.PI) {
    delta += Math.PI * 2;
  }
  return delta;
}
