import * as THREE from 'three';

export type ShotPutReleaseInput = {
  playerVelocity: THREE.Vector3;
  forward: THREE.Vector3;
  radialUp: THREE.Vector3;
  charge: number;
  chargeCap?: number;
  powerMultiplier?: number;
};

export function computeShotPutReleaseVelocity(input: ShotPutReleaseInput): THREE.Vector3 {
  const chargeCap = Math.max(0.1, input.chargeCap ?? 1);
  const charge = THREE.MathUtils.clamp(input.charge, 0, chargeCap);
  const normalizedCharge = THREE.MathUtils.clamp(charge / chargeCap, 0, 1);
  const powerMultiplier = Math.max(0, input.powerMultiplier ?? 1);
  const forward = input.forward.clone().projectOnPlane(input.radialUp).normalize();
  const radialUp = input.radialUp.clone().normalize();
  const carriedVelocity = input.playerVelocity.clone().projectOnPlane(radialUp);
  const forwardSpeed = THREE.MathUtils.lerp(0.15, 5.4 * powerMultiplier, Math.pow(normalizedCharge, 2.15));
  const radialSpeed = THREE.MathUtils.lerp(0.04, 0.68 * powerMultiplier, normalizedCharge);
  return carriedVelocity
    .addScaledVector(forward, forwardSpeed)
    .addScaledVector(radialUp, radialSpeed);
}
