import * as THREE from 'three';

export type ShotPutReleaseInput = {
  playerVelocity: THREE.Vector3;
  forward: THREE.Vector3;
  radialUp: THREE.Vector3;
  charge: number;
};

export function computeShotPutReleaseVelocity(input: ShotPutReleaseInput): THREE.Vector3 {
  const charge = THREE.MathUtils.clamp(input.charge, 0, 1);
  const forward = input.forward.clone().projectOnPlane(input.radialUp).normalize();
  const radialUp = input.radialUp.clone().normalize();
  const carriedVelocity = input.playerVelocity.clone().projectOnPlane(radialUp);
  const forwardSpeed = THREE.MathUtils.lerp(0.2, 6.6, Math.pow(charge, 2.25));
  const radialSpeed = THREE.MathUtils.lerp(0.05, 0.85, charge);
  return carriedVelocity
    .addScaledVector(forward, forwardSpeed)
    .addScaledVector(radialUp, radialSpeed);
}
