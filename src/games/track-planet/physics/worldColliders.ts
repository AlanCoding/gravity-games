import { RAPIER, type RapierPhysicsWorld } from '../../../engine/physics/rapierWorld';
import { makePlanetFrame, trackDistanceToLongitude } from '../../../engine/planetPlacement';
import { TRACK_LANE_SPACING_METERS, TRACK_START_LONGITUDE_DEGREES } from '../constants';
import { createRampSegmentGeometry } from '../rampGeometry';
import { createRampSegmentPlacement } from '../rampPlacement';
import { RAMP_CONFIG, getRampSegmentSpans } from '../rampConfig';

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
    radialOffset: outsideTrackOffset,
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
  for (const span of getRampSegmentSpans()) {
    const geometry = createRampSegmentGeometry(RAMP_CONFIG.width, span.endDistance - span.startDistance, span.startHeight, span.endHeight);
    const placement = createRampSegmentPlacement(planetRadius, span.centerDistance);
    const body = rapier.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed()
        .setTranslation(placement.position.x, placement.position.y, placement.position.z)
        .setRotation({
          x: placement.quaternion.x,
          y: placement.quaternion.y,
          z: placement.quaternion.z,
          w: placement.quaternion.w,
        }),
    );
    const positions = geometry.getAttribute('position').array as Float32Array;
    const indices = Uint32Array.from((geometry.getIndex()?.array ?? []) as ArrayLike<number>);
    rapier.world.createCollider(
      RAPIER.ColliderDesc.trimesh(positions, indices).setFriction(0.92).setRestitution(0.04),
      body,
    );
  }
}
