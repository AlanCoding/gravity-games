import * as THREE from 'three';
import {
  createPlacedGroup,
  latitudeOffsetToDegrees,
  placeOnPlanet,
  trackDistanceToLongitude,
} from '../../engine/planetPlacement';
import { TRACK_LANE_SPACING_METERS, TRACK_START_LONGITUDE_DEGREES } from './constants';
import { createRampSegmentGeometry } from './rampGeometry';
import { createRampSegmentPlacement } from './rampPlacement';
import { RAMP_CONFIG, getRampSegmentSpans } from './rampConfig';

export function addWorldProps(scene: THREE.Scene, planetRadius: number): THREE.Object3D {
  addStartingBleachers(scene, planetRadius);
  addRamp(scene, planetRadius);
  addFootballFieldMarkers(scene, planetRadius);
  addPlacementTestMarkers(scene, planetRadius);
  scene.add(createStars());

  const rotatingObject = createRotatingObject();
  placeOnPlanet(rotatingObject, {
    planetRadius,
    longitudeDeg: 72,
    latitudeDeg: 78,
    altitude: 7,
    headingDeg: 90,
  });
  scene.add(rotatingObject);
  return rotatingObject;
}

function addRamp(scene: THREE.Scene, planetRadius: number): void {
  const rampMaterial = new THREE.MeshStandardMaterial({
    color: 0x78846f,
    emissive: 0x151a12,
    roughness: 0.72,
    side: THREE.DoubleSide,
  });
  for (const span of getRampSegmentSpans()) {
    const geometry = createRampSegmentGeometry(RAMP_CONFIG.width, span.endDistance - span.startDistance, span.startHeight, span.endHeight);
    const segment = new THREE.Mesh(geometry, rampMaterial);
    const placement = createRampSegmentPlacement(planetRadius, span.centerDistance);
    segment.position.copy(placement.position);
    segment.quaternion.copy(placement.quaternion);
    scene.add(segment);
  }
}

function createRotatingObject(): THREE.Object3D {
  return new THREE.Mesh(
    new THREE.OctahedronGeometry(1.6, 0),
    new THREE.MeshStandardMaterial({ color: 0x7db7ff, emissive: 0x102d58, roughness: 0.35 }),
  );
}

function addStartingBleachers(scene: THREE.Scene, planetRadius: number): void {
  const trackWidth = 5 * TRACK_LANE_SPACING_METERS;
  const outsideTrackOffset = trackWidth / 2 + 2.4 + 6;
  const group = createPlacedGroup({
    planetRadius,
    longitudeDeg: TRACK_START_LONGITUDE_DEGREES - trackDistanceToLongitude(3, planetRadius),
    radialOffset: outsideTrackOffset,
    altitude: 0.12,
    headingDeg: 180,
  });
  const seatMaterial = new THREE.MeshStandardMaterial({ color: 0xb7c1c8, emissive: 0x171b1d, roughness: 0.48 });
  const railMaterial = new THREE.MeshStandardMaterial({ color: 0xe7ecef, emissive: 0x1c2224, roughness: 0.38 });
  const rowCount = 6;
  const rowRise = 0.42;
  const rowDepth = 0.72;
  const bleacherWidth = 9;

  for (let row = 0; row < rowCount; row += 1) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(bleacherWidth, 0.16, 0.62), seatMaterial);
    seat.position.set(0, row * rowRise + 0.22, row * rowDepth);
    group.add(seat);

    [-1, 1].forEach(side => {
      const legHeight = row * rowRise + 0.28;
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, legHeight, 0.16), railMaterial);
      leg.position.set(side * (bleacherWidth / 2 - 0.45), legHeight / 2, row * rowDepth);
      group.add(leg);
    });
  }

  const rail = new THREE.Mesh(new THREE.BoxGeometry(bleacherWidth + 0.6, 0.14, 0.14), railMaterial);
  rail.position.set(0, rowCount * rowRise + 0.35, (rowCount - 1) * rowDepth + 0.25);
  group.add(rail);

  scene.add(group);
}

function addFootballFieldMarkers(scene: THREE.Scene, planetRadius: number): void {
  const markerMaterial = new THREE.MeshStandardMaterial({ color: 0xf2f7f3, emissive: 0x252924, roughness: 0.55 });
  const centerLongitudeDeg = 180;
  const centerLatitudeDeg = latitudeOffsetToDegrees(42, planetRadius);

  for (let i = -3; i <= 3; i += 1) {
    const marker = new THREE.Mesh(new THREE.BoxGeometry(10, 0.14, 0.42), markerMaterial);
    placeOnPlanet(marker, {
      planetRadius,
      longitudeDeg: centerLongitudeDeg,
      latitudeDeg: centerLatitudeDeg + latitudeOffsetToDegrees(i * 3.5, planetRadius),
      altitude: 0.2,
      headingDeg: 90,
    });
    scene.add(marker);
  }

  for (let i = -2; i <= 2; i += 1) {
    [-1, 1].forEach(side => {
      const hash = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 0.34), markerMaterial);
      placeOnPlanet(hash, {
        planetRadius,
        longitudeDeg: centerLongitudeDeg + side * trackDistanceToLongitude(7.5, planetRadius, centerLatitudeDeg),
        latitudeDeg: centerLatitudeDeg + latitudeOffsetToDegrees(i * 5.2, planetRadius),
        altitude: 0.22,
        headingDeg: 90,
      });
      scene.add(hash);
    });
  }
}

function addPlacementTestMarkers(scene: THREE.Scene, planetRadius: number): void {
  const material = new THREE.MeshStandardMaterial({ color: 0x7db7ff, emissive: 0x102d58, roughness: 0.4 });
  [0, 90, 180, 270].forEach(longitudeDeg => {
    const marker = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.45, 1.6, 12), material);
    placeOnPlanet(marker, {
      planetRadius,
      longitudeDeg,
      latitudeDeg: -36,
      altitude: 0.9,
      headingDeg: 90,
    });
    scene.add(marker);
  });
}

function createStars(): THREE.Points {
  return new THREE.Points(
    new THREE.BufferGeometry().setFromPoints(makeStars()),
    new THREE.PointsMaterial({ color: 0xcbd9ff, size: 1.1, sizeAttenuation: false }),
  );
}

function makeStars(): THREE.Vector3[] {
  return Array.from({ length: 420 }, () => {
    const point = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
    return point.normalize().multiplyScalar(360 + Math.random() * 220);
  });
}
