import * as THREE from 'three';

export type PlanetPlacement = {
  longitudeDeg: number;
  latitudeDeg?: number;
  altitude?: number;
  headingDeg?: number;
  // Tangent offset in meters along local north/south before the final frame is built.
  // Track lanes use this so lane spacing stays authored in meters.
  radialOffset?: number;
};

export type PlanetFrame = {
  localUp: THREE.Vector3;
  localEast: THREE.Vector3;
  localNorth: THREE.Vector3;
  localForward: THREE.Vector3;
  localRight: THREE.Vector3;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
};

export type PlanetPlacementOptions = PlanetPlacement & {
  planetRadius: number;
  planetCenter?: THREE.Vector3;
};

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

// Planet-surface asset convention:
// - object local +Y points away from the planet center.
// - object local +Z points toward localForward on the tangent plane.
// - object local +X points toward localRight on the tangent plane.
// This keeps meshes buildable in simple local coordinates, then orients them
// consistently anywhere on the spherical planet.
export function makePlanetFrame(options: PlanetPlacementOptions): PlanetFrame {
  const planetCenter = options.planetCenter ?? new THREE.Vector3();
  const longitude = options.longitudeDeg * DEG_TO_RAD;
  const latitude = (options.latitudeDeg ?? 0) * DEG_TO_RAD;
  const heading = (options.headingDeg ?? 0) * DEG_TO_RAD;
  const altitude = options.altitude ?? 0;
  const tangentOffset = options.radialOffset ?? 0;
  const effectiveLatitude = latitude + tangentOffset / options.planetRadius;

  const localUp = upFromLatitudeLongitude(effectiveLatitude, longitude);
  const localEast = new THREE.Vector3(-Math.sin(longitude), 0, Math.cos(longitude)).normalize();
  const localNorth = new THREE.Vector3(
    -Math.sin(effectiveLatitude) * Math.cos(longitude),
    Math.cos(effectiveLatitude),
    -Math.sin(effectiveLatitude) * Math.sin(longitude),
  ).normalize();
  const localForward = localNorth
    .clone()
    .multiplyScalar(Math.cos(heading))
    .addScaledVector(localEast, Math.sin(heading))
    .normalize();
  const localRight = new THREE.Vector3().crossVectors(localUp, localForward).normalize();
  const position = planetCenter.clone().addScaledVector(localUp, options.planetRadius + altitude);
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(localRight, localUp, localForward),
  );

  return {
    localUp,
    localEast,
    localNorth,
    localForward,
    localRight,
    position,
    quaternion,
  };
}

export function placeOnPlanet(object: THREE.Object3D, options: PlanetPlacementOptions): PlanetFrame {
  const frame = makePlanetFrame(options);
  object.position.copy(frame.position);
  object.quaternion.copy(frame.quaternion);
  return frame;
}

export function createPlacedGroup(options: PlanetPlacementOptions): THREE.Group {
  const group = new THREE.Group();
  placeOnPlanet(group, options);
  return group;
}

export function laneToLatitudeOrOffset(options: {
  laneIndex: number;
  laneCount: number;
  laneSpacingMeters: number;
}): number {
  const trackWidth = (options.laneCount - 1) * options.laneSpacingMeters;
  return options.laneIndex * options.laneSpacingMeters - trackWidth / 2;
}

export function trackDistanceToLongitude(distanceMeters: number, planetRadius: number, latitudeDeg = 0): number {
  const latitude = latitudeDeg * DEG_TO_RAD;
  const circumferenceAtLatitude = Math.PI * 2 * planetRadius * Math.max(Math.cos(latitude), 0.0001);
  return (distanceMeters / circumferenceAtLatitude) * 360;
}

export function latitudeOffsetToDegrees(offsetMeters: number, planetRadius: number): number {
  return (offsetMeters / planetRadius) * RAD_TO_DEG;
}

export function createPlacementAxesHelper(options: PlanetPlacementOptions & { size?: number }): THREE.AxesHelper {
  const helper = new THREE.AxesHelper(options.size ?? 3);
  placeOnPlanet(helper, options);
  return helper;
}

export function createPlacementMarker(options: PlanetPlacementOptions & { radius?: number; color?: THREE.ColorRepresentation }): THREE.Mesh {
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(options.radius ?? 0.35, 12, 8),
    new THREE.MeshBasicMaterial({ color: options.color ?? 0xff4f4f }),
  );
  placeOnPlanet(marker, options);
  return marker;
}

export function createPlacementArrows(options: PlanetPlacementOptions & { length?: number }): THREE.Group {
  const frame = makePlanetFrame(options);
  const length = options.length ?? 4;
  const group = new THREE.Group();
  group.add(new THREE.ArrowHelper(frame.localUp, frame.position, length, 0x56d364));
  group.add(new THREE.ArrowHelper(frame.localForward, frame.position, length, 0xeac460));
  return group;
}

function upFromLatitudeLongitude(latitude: number, longitude: number): THREE.Vector3 {
  return new THREE.Vector3(
    Math.cos(latitude) * Math.cos(longitude),
    Math.sin(latitude),
    Math.cos(latitude) * Math.sin(longitude),
  ).normalize();
}
