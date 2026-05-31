import * as THREE from 'three';
import { TIME_TRIAL_FAST_100M_SECONDS } from './constants';

export type SurfaceTimeTrialSnapshot = {
  distanceMeters: number;
  time100mSeconds: number | null;
  time400mSeconds: number | null;
  crossed100m: boolean;
  crossed400m: boolean;
  fast100m: boolean;
};

export class SurfaceTimeTrials {
  private previousLongitudeDeg: number;
  private accumulatedLongitudeDeg = 0;
  private time100mSeconds: number | null = null;
  private time400mSeconds: number | null = null;
  private fast100m = false;

  constructor(
    private readonly options: {
      circumferenceMeters: number;
      startPosition: THREE.Vector3;
    },
  ) {
    this.previousLongitudeDeg = longitudeDegrees(options.startPosition);
  }

  step(position: THREE.Vector3, elapsedSeconds: number): SurfaceTimeTrialSnapshot {
    const currentLongitudeDeg = longitudeDegrees(position);
    const deltaLongitudeDeg = normalizeLongitudeDelta(currentLongitudeDeg - this.previousLongitudeDeg);
    this.previousLongitudeDeg = currentLongitudeDeg;
    this.accumulatedLongitudeDeg += deltaLongitudeDeg;

    const distanceMeters = Math.max(0, (this.accumulatedLongitudeDeg / 360) * this.options.circumferenceMeters);
    let crossed100m = false;
    let crossed400m = false;
    if (this.time100mSeconds === null && distanceMeters >= 100) {
      this.time100mSeconds = elapsedSeconds;
      crossed100m = true;
      this.fast100m = elapsedSeconds < TIME_TRIAL_FAST_100M_SECONDS;
    }
    if (this.time400mSeconds === null && distanceMeters >= 400) {
      this.time400mSeconds = elapsedSeconds;
      crossed400m = true;
    }

    return {
      distanceMeters,
      time100mSeconds: this.time100mSeconds,
      time400mSeconds: this.time400mSeconds,
      crossed100m,
      crossed400m,
      fast100m: this.fast100m,
    };
  }
}

function longitudeDegrees(position: THREE.Vector3): number {
  const projected = new THREE.Vector3(position.x, 0, position.z);
  if (projected.lengthSq() < 0.000001) {
    return 0;
  }
  const longitude = THREE.MathUtils.radToDeg(Math.atan2(projected.z, projected.x));
  return longitude;
}

function normalizeLongitudeDelta(delta: number): number {
  let normalized = delta % 360;
  if (normalized >= 180) {
    normalized -= 360;
  }
  if (normalized < -180) {
    normalized += 360;
  }
  return normalized;
}
