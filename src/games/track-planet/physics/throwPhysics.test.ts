import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { computeShotPutReleaseVelocity } from './throwPhysics';

describe('computeShotPutReleaseVelocity', () => {
  it('inherits the runner tangent velocity at release', () => {
    const radialUp = new THREE.Vector3(1, 0, 0);
    const forward = new THREE.Vector3(0, 0, 1);
    const release = computeShotPutReleaseVelocity({
      playerVelocity: new THREE.Vector3(5.4, 0, 4.8),
      forward,
      radialUp,
      charge: 1,
    });

    expect(release.length()).toBeGreaterThan(7.5);
    expect(release.dot(forward)).toBeGreaterThan(5.5);
  });

  it('stays below the orbital ceiling when released from rest at full charge', () => {
    const radialUp = new THREE.Vector3(1, 0, 0);
    const forward = new THREE.Vector3(0, 0, 1);
    const release = computeShotPutReleaseVelocity({
      playerVelocity: new THREE.Vector3(),
      forward,
      radialUp,
      charge: 1,
    });

    expect(release.length()).toBeLessThan(8.7);
    expect(release.dot(radialUp)).toBeGreaterThan(0);
  });
});
