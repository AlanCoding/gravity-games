import * as THREE from 'three';
import { makePlanetFrame } from '../../../engine/planetPlacement';
import { RAMP_CONFIG, getRampLongitudeDeg } from '../rampConfig';

export type RampSurface = {
  heightAt(position: THREE.Vector3): number | null;
};

export function createRampSurface(planetRadius: number): RampSurface {
  const frame = makePlanetFrame({
    planetRadius,
    longitudeDeg: getRampLongitudeDeg(),
    radialOffset: RAMP_CONFIG.radialOffset,
    altitude: 0,
    headingDeg: RAMP_CONFIG.headingDeg,
  });
  const fullLength = RAMP_CONFIG.rampLength * 2 + RAMP_CONFIG.topLength;

  return {
    heightAt(position: THREE.Vector3): number | null {
      const relative = position.clone().sub(frame.position);
      const x = relative.dot(frame.localRight);
      const z = relative.dot(frame.localForward);
      if (Math.abs(x) > RAMP_CONFIG.width / 2 || Math.abs(z) > fullLength / 2) {
        return null;
      }

      const upRampEnd = -RAMP_CONFIG.topLength / 2;
      const downRampStart = RAMP_CONFIG.topLength / 2;
      if (z < upRampEnd) {
        const t = THREE.MathUtils.clamp((z + fullLength / 2) / RAMP_CONFIG.rampLength, 0, 1);
        return t * RAMP_CONFIG.height;
      }
      if (z > downRampStart) {
        const t = THREE.MathUtils.clamp((fullLength / 2 - z) / RAMP_CONFIG.rampLength, 0, 1);
        return t * RAMP_CONFIG.height;
      }
      return RAMP_CONFIG.height;
    },
  };
}
