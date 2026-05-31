import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { PLANET_CIRCUMFERENCE_METERS } from './constants';
import { SurfaceTimeTrials } from './timeTrials';

describe('SurfaceTimeTrials', () => {
  it('records 100m and 400m times from surface longitude only', () => {
    const trials = new SurfaceTimeTrials({
      circumferenceMeters: PLANET_CIRCUMFERENCE_METERS,
      startPosition: new THREE.Vector3(64, 0, 0),
    });

    let snapshot = trials.step(new THREE.Vector3(64, 0, 0), 0);
    expect(snapshot.time100mSeconds).toBeNull();
    expect(snapshot.time400mSeconds).toBeNull();

    snapshot = trials.step(new THREE.Vector3(0, 0, 64), 8.7);
    expect(snapshot.crossed100m).toBe(true);
    expect(snapshot.time100mSeconds).toBeCloseTo(8.7, 6);
    expect(snapshot.fast100m).toBe(true);

    snapshot = trials.step(new THREE.Vector3(-64, 0, 0), 17.0);
    expect(snapshot.time400mSeconds).toBeNull();

    snapshot = trials.step(new THREE.Vector3(0, 0, -64), 25.5);
    expect(snapshot.time400mSeconds).toBeNull();

    snapshot = trials.step(new THREE.Vector3(64, 0, 0), 34.0);
    expect(snapshot.crossed400m).toBe(true);
    expect(snapshot.time400mSeconds).toBeCloseTo(34.0, 6);
  });
});
