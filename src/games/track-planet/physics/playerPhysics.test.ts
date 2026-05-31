import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  PLAYER_BASELINE_ACCELERATION_METERS_PER_SECOND_SQUARED,
  PLANET_RADIUS_METERS,
  PLAYER_CENTER_HEIGHT_METERS,
  PLAYER_KINETIC_FRICTION_COEFFICIENT,
  PLAYER_RUN_REFERENCE_SPEED_METERS_PER_SECOND,
  PLAYER_STATIC_FRICTION_COEFFICIENT,
  SURFACE_GRAVITY,
} from '../constants';
import { PlayerPhysics } from './playerPhysics';

describe('PlayerPhysics', () => {
  it('accelerates along the speed envelope on a straight run without sliding', () => {
    const physics = new PlayerPhysics({
      planetRadius: PLANET_RADIUS_METERS,
      surfaceGravity: SURFACE_GRAVITY,
      bodyCenterHeight: PLAYER_CENTER_HEIGHT_METERS,
      baselineAcceleration: PLAYER_BASELINE_ACCELERATION_METERS_PER_SECOND_SQUARED,
      referenceSpeed: PLAYER_RUN_REFERENCE_SPEED_METERS_PER_SECOND,
      staticFrictionCoefficient: PLAYER_STATIC_FRICTION_COEFFICIENT,
      kineticFrictionCoefficient: PLAYER_KINETIC_FRICTION_COEFFICIENT,
      jumpSpeed: 1.4,
      initialUp: new THREE.Vector3(1, 0, 0),
    });

    let snapshot = physics.getSnapshot();
    for (let i = 0; i < 360; i += 1) {
      const desiredDirection = new THREE.Vector3(0, 0, 1).projectOnPlane(snapshot.radialUp).normalize();
      physics.beforePhysicsStep({
        dt: 1 / 60,
        desiredTangentDirection: desiredDirection,
        jumpRequested: false,
        poleVaultRequested: false,
      });
      snapshot = physics.getSnapshot();
    }

    expect(snapshot.speed).toBeGreaterThan(5.5);
    expect(snapshot.speed).toBeLessThan(PLAYER_RUN_REFERENCE_SPEED_METERS_PER_SECOND + 0.3);
    expect(snapshot.sliding).toBe(false);
  });
});
