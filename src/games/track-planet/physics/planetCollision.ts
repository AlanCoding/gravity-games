import * as THREE from 'three';
import { makePlanetFrame, type PlanetFrame } from '../../../engine/planetPlacement';
import { TRACK_LANE_SPACING_METERS, TRACK_START_LONGITUDE_DEGREES } from '../constants';

export type PlanetBoxCollider = {
  frame: PlanetFrame;
  halfExtents: THREE.Vector3;
  restitution: number;
  friction: number;
  name: string;
};

export function createBleacherColliderVolume(planetRadius: number): PlanetBoxCollider {
  const trackWidth = 5 * TRACK_LANE_SPACING_METERS;
  const outsideTrackOffset = trackWidth / 2 + 2.4 + 6;
  const frame = makePlanetFrame({
    planetRadius,
    longitudeDeg: TRACK_START_LONGITUDE_DEGREES - trackDistanceToLongitude(3, planetRadius),
    radialOffset: -outsideTrackOffset,
    altitude: 0.12,
    headingDeg: 180,
  });

  return {
    frame,
    halfExtents: new THREE.Vector3(5.1, 1.65, 2.35),
    restitution: 0.18,
    friction: 0.8,
    name: 'bleachers',
  };
}

export function resolveSphereAgainstPlanetBox(
  position: THREE.Vector3,
  velocity: THREE.Vector3,
  radius: number,
  collider: PlanetBoxCollider,
  options: {
    surfaceVelocity?: THREE.Vector3;
    restitution?: number;
    friction?: number;
  } = {},
): boolean {
  const surfaceVelocity = options.surfaceVelocity ?? new THREE.Vector3();
  const relativePosition = position.clone().sub(collider.frame.position);
  const local = new THREE.Vector3(
    relativePosition.dot(collider.frame.localRight),
    relativePosition.dot(collider.frame.localUp),
    relativePosition.dot(collider.frame.localForward),
  );
  const closest = new THREE.Vector3(
    THREE.MathUtils.clamp(local.x, -collider.halfExtents.x, collider.halfExtents.x),
    THREE.MathUtils.clamp(local.y, -collider.halfExtents.y, collider.halfExtents.y),
    THREE.MathUtils.clamp(local.z, -collider.halfExtents.z, collider.halfExtents.z),
  );
  const delta = local.clone().sub(closest);
  const distanceSq = delta.lengthSq();
  if (distanceSq > radius * radius) {
    return false;
  }

  let localNormal = delta.clone();
  if (localNormal.lengthSq() < 0.000001) {
    const distances = [
      { axis: 'x' as const, value: collider.halfExtents.x - Math.abs(local.x), sign: Math.sign(local.x) || 1 },
      { axis: 'y' as const, value: collider.halfExtents.y - Math.abs(local.y), sign: Math.sign(local.y) || 1 },
      { axis: 'z' as const, value: collider.halfExtents.z - Math.abs(local.z), sign: Math.sign(local.z) || 1 },
    ];
    distances.sort((a, b) => a.value - b.value);
    localNormal.set(0, 0, 0);
    localNormal[distances[0].axis] = distances[0].sign;
  }
  localNormal.normalize();

  const worldNormal = collider.frame.localRight
    .clone()
    .multiplyScalar(localNormal.x)
    .addScaledVector(collider.frame.localUp, localNormal.y)
    .addScaledVector(collider.frame.localForward, localNormal.z)
    .normalize();

  const contactPoint = collider.frame.position
    .clone()
    .addScaledVector(collider.frame.localRight, closest.x)
    .addScaledVector(collider.frame.localUp, closest.y)
    .addScaledVector(collider.frame.localForward, closest.z)
    .addScaledVector(worldNormal, radius + 0.001);
  position.copy(contactPoint);

  const restitution = options.restitution ?? collider.restitution;
  const friction = options.friction ?? collider.friction;
  const relativeVelocity = velocity.clone().sub(surfaceVelocity);
  const normalSpeed = relativeVelocity.dot(worldNormal);
  if (normalSpeed < 0) {
    relativeVelocity.addScaledVector(worldNormal, -(1 + restitution) * normalSpeed);
  }

  const tangent = relativeVelocity.clone().addScaledVector(worldNormal, -relativeVelocity.dot(worldNormal));
  const tangentSpeed = tangent.length();
  if (tangentSpeed > 0.000001) {
    const drop = friction * 0.12;
    tangent.setLength(Math.max(0, tangentSpeed - drop));
  }

  velocity.copy(tangent.addScaledVector(worldNormal, Math.max(0.05, relativeVelocity.dot(worldNormal)))).add(surfaceVelocity);
  return true;
}

function trackDistanceToLongitude(distanceMeters: number, planetRadius: number, latitudeDeg = 0): number {
  const latitude = (latitudeDeg * Math.PI) / 180;
  const circumferenceAtLatitude = Math.PI * 2 * planetRadius * Math.max(Math.cos(latitude), 0.0001);
  return (distanceMeters / circumferenceAtLatitude) * 360;
}
