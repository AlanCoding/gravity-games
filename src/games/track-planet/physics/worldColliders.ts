import { RAPIER, type RapierPhysicsWorld } from '../../../engine/physics/rapierWorld';
import { makePlanetFrame, trackDistanceToLongitude } from '../../../engine/planetPlacement';
import { TRACK_LANE_SPACING_METERS, TRACK_START_LONGITUDE_DEGREES } from '../constants';
import { RAMP_CONFIG, getRampLongitudeDeg } from '../rampConfig';

export function createWorldPropColliders(rapier: RapierPhysicsWorld, planetRadius: number): Set<number> {
  const blockingColliders = new Set<number>();
  const bleacherCollider = createBleacherCollider(rapier, planetRadius);
  blockingColliders.add(bleacherCollider.handle);
  createRampColliders(rapier, planetRadius);
  return blockingColliders;
}

function createBleacherCollider(rapier: RapierPhysicsWorld, planetRadius: number): RAPIER.Collider {
  const trackWidth = 5 * TRACK_LANE_SPACING_METERS;
  const outsideTrackOffset = trackWidth / 2 + 2.4 + 6;
  const frame = makePlanetFrame({
    planetRadius,
    longitudeDeg: TRACK_START_LONGITUDE_DEGREES - trackDistanceToLongitude(3, planetRadius),
    radialOffset: -outsideTrackOffset,
    altitude: 0.12,
    headingDeg: 180,
  });
  const center = frame.position.clone().addScaledVector(frame.localUp, 1.45).addScaledVector(frame.localForward, 1.9);
  const body = rapier.world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed()
      .setTranslation(center.x, center.y, center.z)
      .setRotation({ x: frame.quaternion.x, y: frame.quaternion.y, z: frame.quaternion.z, w: frame.quaternion.w }),
  );
  return rapier.world.createCollider(RAPIER.ColliderDesc.cuboid(5.1, 1.65, 2.35).setFriction(0.8), body);
}

function createRampColliders(rapier: RapierPhysicsWorld, planetRadius: number): void {
  const frame = makePlanetFrame({
    planetRadius,
    longitudeDeg: getRampLongitudeDeg(),
    radialOffset: RAMP_CONFIG.radialOffset,
    altitude: 0,
    headingDeg: RAMP_CONFIG.headingDeg,
  });
  const fullLength = RAMP_CONFIG.rampLength * 2 + RAMP_CONFIG.topLength;
  const upCenter = frame.position
    .clone()
    .addScaledVector(frame.localUp, RAMP_CONFIG.height / 2)
    .addScaledVector(frame.localForward, -fullLength / 2 + RAMP_CONFIG.rampLength / 2);
  const topCenter = frame.position.clone().addScaledVector(frame.localUp, RAMP_CONFIG.height);
  const downCenter = frame.position
    .clone()
    .addScaledVector(frame.localUp, RAMP_CONFIG.height / 2)
    .addScaledVector(frame.localForward, fullLength / 2 - RAMP_CONFIG.rampLength / 2);

  createRampBlock(rapier, upCenter, frame.quaternion, RAMP_CONFIG.rampLength);
  createRampBlock(rapier, topCenter, frame.quaternion, RAMP_CONFIG.topLength);
  createRampBlock(rapier, downCenter, frame.quaternion, RAMP_CONFIG.rampLength);
}

function createRampBlock(
  rapier: RapierPhysicsWorld,
  center: { x: number; y: number; z: number },
  baseRotation: { x: number; y: number; z: number; w: number },
  length: number,
): void {
  const body = rapier.world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed()
      .setTranslation(center.x, center.y, center.z)
      .setRotation(baseRotation),
  );
  rapier.world.createCollider(RAPIER.ColliderDesc.cuboid(RAMP_CONFIG.width / 2, 0.12, length / 2).setFriction(0.9), body);
}
