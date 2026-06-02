import {
  type BarbellState,
  type BeanstalkSystemState,
  type EndpointKey,
  type Vec2,
  add,
  fromAngle,
  rotate90,
  scale,
} from './model';

export const CIVIC_PRIME_RADIUS = 48;
export const CIVIC_PRIME_MU = 12000;
export const BARBELL_ENDPOINT_DRY_MASS_TONS = 80;
export const DYNAMIC_MASS_TONS = 12;
export const FLEET_CENTRAL_ORBIT_RADIUS = 275;
export const FLEET_CENTRAL_PHASE_RAD = Math.PI / 3;

export type StageSpec = {
  id: string;
  centerRadius: number;
  length: number;
  phaseRad: number;
};

export function createCircularTidallyLockedBarbell(options: {
  id: string;
  centerRadius: number;
  length: number;
  phaseRad: number;
  dryMassTons?: number;
  innerUpmassTons?: number;
  outerUpmassTons?: number;
  innerDownmassTons?: number;
  outerDownmassTons?: number;
  gravitationalParameter?: number;
}): BarbellState {
  const mu = options.gravitationalParameter ?? CIVIC_PRIME_MU;
  const radial = fromAngle(options.phaseRad);
  const tangent = rotate90(radial);
  const orbitalAngularVelocity = Math.sqrt(mu / (options.centerRadius * options.centerRadius * options.centerRadius));
  const centerSpeed = orbitalAngularVelocity * options.centerRadius;

  return {
    id: options.id,
    center: scale(radial, options.centerRadius),
    velocity: scale(tangent, centerSpeed),
    angleRad: options.phaseRad,
    angularVelocityRadPerSecond: orbitalAngularVelocity,
    length: options.length,
    dryMassTons: options.dryMassTons ?? BARBELL_ENDPOINT_DRY_MASS_TONS,
    inner: {
      upmassTons: options.innerUpmassTons ?? 0,
      downmassTons: options.innerDownmassTons ?? 0,
    },
    outer: {
      upmassTons: options.outerUpmassTons ?? 0,
      downmassTons: options.outerDownmassTons ?? 0,
    },
  };
}

export function createInitialBeanstalkSystem(): BeanstalkSystemState {
  const stages: StageSpec[] = [
    { id: 'stage-1', centerRadius: 88, length: 20, phaseRad: 0 },
    { id: 'stage-2', centerRadius: 165, length: 28, phaseRad: Math.PI / 2 },
    { id: 'stage-3', centerRadius: 225, length: 36, phaseRad: 0 },
  ];

  return {
    timeSeconds: 0,
    planetRadius: CIVIC_PRIME_RADIUS,
    gravitationalParameter: CIVIC_PRIME_MU,
    barbells: stages.map(stage => createCircularTidallyLockedBarbell(stage)),
    payloads: [],
  };
}

export function getFleetCentralState(options: {
  timeSeconds: number;
  gravitationalParameter?: number;
  orbitRadius?: number;
  phaseRad?: number;
}): {
  id: string;
  position: Vec2;
  velocity: Vec2;
  orbitRadius: number;
} {
  const mu = options.gravitationalParameter ?? CIVIC_PRIME_MU;
  const orbitRadius = options.orbitRadius ?? FLEET_CENTRAL_ORBIT_RADIUS;
  const angularVelocity = Math.sqrt(mu / (orbitRadius * orbitRadius * orbitRadius));
  const phase = (options.phaseRad ?? FLEET_CENTRAL_PHASE_RAD) + angularVelocity * options.timeSeconds;
  const radial = fromAngle(phase);
  const tangent = rotate90(radial);
  return {
    id: 'fleet-central',
    position: scale(radial, orbitRadius),
    velocity: scale(tangent, angularVelocity * orbitRadius),
    orbitRadius,
  };
}

export function getOppositeEndpoint(endpoint: EndpointKey): EndpointKey {
  return endpoint === 'inner' ? 'outer' : 'inner';
}

export function createSurfaceLauncherState(options?: {
  phaseRad?: number;
  upmassTons?: number;
}): {
  id: string;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  upmassTons: number;
} {
  const phaseRad = options?.phaseRad ?? 0;
  const radial = fromAngle(phaseRad);
  return {
    id: 'civic-prime-space-gun',
    position: scale(radial, CIVIC_PRIME_RADIUS),
    velocity: add(scale(radial, 0), { x: 0, y: 0 }),
    upmassTons: options?.upmassTons ?? DYNAMIC_MASS_TONS,
  };
}
