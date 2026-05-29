import * as THREE from 'three';
import { createRampBaseFrame } from '../rampPlacement';
import { RAMP_CONFIG, getRampHeightAtDistance, getRampTotalLength } from '../rampConfig';

export type RampSurface = {
  heightAt(position: THREE.Vector3): number | null;
};

export function createRampSurface(planetRadius: number): RampSurface {
  const frame = createRampBaseFrame(planetRadius);
  const fullLength = getRampTotalLength();

  return {
    heightAt(position: THREE.Vector3): number | null {
      const relative = position.clone().sub(frame.position);
      const x = relative.dot(frame.localRight);
      const z = relative.dot(frame.localForward);
      if (Math.abs(x) > RAMP_CONFIG.width / 2 || Math.abs(z) > fullLength / 2) {
        return null;
      }
      return RAMP_CONFIG.surfaceLift + getRampHeightAtDistance(z);
    },
  };
}
