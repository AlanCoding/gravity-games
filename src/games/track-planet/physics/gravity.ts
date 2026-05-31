import * as THREE from 'three';

export function computePlanetGravity(options: {
  position: THREE.Vector3;
  planetCenter?: THREE.Vector3;
  planetRadius: number;
  surfaceGravity: number;
}): THREE.Vector3 {
  const planetCenter = options.planetCenter ?? new THREE.Vector3();
  const fromCenter = options.position.clone().sub(planetCenter);
  const distance = Math.max(fromCenter.length(), 0.001);
  const mu = options.surfaceGravity * options.planetRadius * options.planetRadius;
  return fromCenter.normalize().multiplyScalar(-mu / (distance * distance));
}

export function getRadialUp(position: THREE.Vector3, planetCenter = new THREE.Vector3()): THREE.Vector3 {
  return position.clone().sub(planetCenter).normalize();
}

export type OrbitMetrics = {
  specificEnergy: number;
  boundOrbit: boolean;
  perigeeAltitude: number;
  apoapsisAltitude: number;
};

export function computeOrbitMetrics(options: {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  planetCenter?: THREE.Vector3;
  planetRadius: number;
  surfaceGravity: number;
}): OrbitMetrics {
  const planetCenter = options.planetCenter ?? new THREE.Vector3();
  const relativePosition = options.position.clone().sub(planetCenter);
  const relativeVelocity = options.velocity.clone();
  const radius = Math.max(relativePosition.length(), 0.001);
  const speedSq = relativeVelocity.lengthSq();
  const mu = options.surfaceGravity * options.planetRadius * options.planetRadius;
  const specificEnergy = 0.5 * speedSq - mu / radius;

  if (specificEnergy >= 0) {
    return {
      specificEnergy,
      boundOrbit: false,
      perigeeAltitude: Number.POSITIVE_INFINITY,
      apoapsisAltitude: Number.POSITIVE_INFINITY,
    };
  }

  const angularMomentum = relativePosition.clone().cross(relativeVelocity).length();
  const eccentricity = Math.sqrt(
    Math.max(0, 1 + (2 * specificEnergy * angularMomentum * angularMomentum) / (mu * mu)),
  );
  const semiMajorAxis = -mu / (2 * specificEnergy);
  const perigeeDistance = semiMajorAxis * (1 - eccentricity);
  const apoapsisDistance = semiMajorAxis * (1 + eccentricity);

  return {
    specificEnergy,
    boundOrbit: true,
    perigeeAltitude: perigeeDistance - options.planetRadius,
    apoapsisAltitude: apoapsisDistance - options.planetRadius,
  };
}
