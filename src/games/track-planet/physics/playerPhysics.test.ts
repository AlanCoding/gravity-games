import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  PLANET_RADIUS_METERS,
  PLAYER_CENTER_HEIGHT_METERS,
  PLAYER_KINETIC_FRICTION_COEFFICIENT,
  PLAYER_STATIC_FRICTION_COEFFICIENT,
  PLAYER_TANGENT_ACCELERATION_METERS_PER_SECOND_SQUARED,
  SURFACE_GRAVITY,
  WALK_SPEED,
} from '../constants';
import { PlayerPhysics } from './playerPhysics';

describe('PlayerPhysics', () => {
  it('accelerates to athlete-like speed on a straight run without sliding', () => {
    const physics = new PlayerPhysics({
      planetRadius: PLANET_RADIUS_METERS,
      surfaceGravity: SURFACE_GRAVITY,
      bodyCenterHeight: PLAYER_CENTER_HEIGHT_METERS,
      tangentAcceleration: PLAYER_TANGENT_ACCELERATION_METERS_PER_SECOND_SQUARED,
      staticFrictionCoefficient: PLAYER_STATIC_FRICTION_COEFFICIENT,
      kineticFrictionCoefficient: PLAYER_KINETIC_FRICTION_COEFFICIENT,
      jumpSpeed: 1.4,
      initialUp: new THREE.Vector3(1, 0, 0),
    });

    let snapshot = physics.getSnapshot();
    for (let i = 0; i < 360; i += 1) {
      const desiredVelocity = new THREE.Vector3(0, 0, 1).projectOnPlane(snapshot.radialUp).normalize().multiplyScalar(WALK_SPEED);
      physics.beforePhysicsStep({
        dt: 1 / 60,
        desiredTangentVelocity: desiredVelocity,
        jumpRequested: false,
        poleVaultRequested: false,
      });
      snapshot = physics.getSnapshot();
    }

    expect(snapshot.speed).toBeGreaterThan(9.5);
    expect(snapshot.speed).toBeLessThanOrEqual(WALK_SPEED + 0.25);
    expect(snapshot.sliding).toBe(false);
  });
});
