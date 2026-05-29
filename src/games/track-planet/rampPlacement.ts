import * as THREE from 'three';
import { makePlanetFrame, type PlanetFrame } from '../../engine/planetPlacement';
import { RAMP_CONFIG, getRampLongitudeDeg } from './rampConfig';

export type RampSegmentPlacement = {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  baseFrame: PlanetFrame;
};

export function createRampBaseFrame(planetRadius: number): PlanetFrame {
  return makePlanetFrame({
    planetRadius,
    longitudeDeg: getRampLongitudeDeg(),
    radialOffset: RAMP_CONFIG.radialOffset,
    altitude: 0.08,
    headingDeg: RAMP_CONFIG.headingDeg,
  });
}

export function createRampSegmentPlacement(planetRadius: number, distanceMeters: number): RampSegmentPlacement {
  const baseFrame = createRampBaseFrame(planetRadius);
  const rotation = new THREE.Quaternion().setFromAxisAngle(baseFrame.localRight, distanceMeters / planetRadius);
  const position = baseFrame.position.clone().applyQuaternion(rotation);
  const localUp = baseFrame.localUp.clone().applyQuaternion(rotation).normalize();
  const localForward = baseFrame.localForward.clone().applyQuaternion(rotation).normalize();
  const localRight = baseFrame.localRight.clone().applyQuaternion(rotation).normalize();
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(localRight, localUp, localForward),
  );

  return {
    position,
    quaternion,
    baseFrame,
  };
}
