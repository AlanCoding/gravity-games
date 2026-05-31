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

  it('keeps the runner tangent velocity even on a tapped release', () => {
    const radialUp = new THREE.Vector3(1, 0, 0);
    const forward = new THREE.Vector3(0, 0, 1);
    const playerVelocity = new THREE.Vector3(0, 0, 5.6);
    const release = computeShotPutReleaseVelocity({
      playerVelocity,
      forward,
      radialUp,
      charge: 0.02,
    });

    expect(release.dot(forward)).toBeGreaterThan(playerVelocity.dot(forward));
    expect(release.dot(radialUp)).toBeGreaterThan(0);
    expect(release.length()).toBeGreaterThan(playerVelocity.length());
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
