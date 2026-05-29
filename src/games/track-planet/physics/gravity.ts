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
