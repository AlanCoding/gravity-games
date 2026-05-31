import * as THREE from 'three';
import {
  createPlacedGroup,
  latitudeOffsetToDegrees,
  placeOnPlanet,
  trackDistanceToLongitude,
} from '../../engine/planetPlacement';
import { TRACK_LANE_SPACING_METERS, TRACK_START_LONGITUDE_DEGREES } from './constants';
import { RAMP_CONFIG, getRampLongitudeDeg } from './rampConfig';

export function addWorldProps(scene: THREE.Scene, planetRadius: number): THREE.Object3D {
  addStartingBleachers(scene, planetRadius);
  addRamp(scene, planetRadius);
  addTrackAndFieldMarkers(scene, planetRadius);
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

function addTrackAndFieldMarkers(scene: THREE.Scene, planetRadius: number): void {
  addShotPutMarkers(scene, planetRadius);
  addLongJumpMarkers(scene, planetRadius);
  addPoleVaultMarkers(scene, planetRadius);
}

function addShotPutMarkers(scene: THREE.Scene, planetRadius: number): void {
  const group = createPlacedGroup({
    planetRadius,
    longitudeDeg: 160,
    latitudeDeg: -18,
    altitude: 0.13,
    headingDeg: 90,
  });
  const whiteMaterial = new THREE.MeshStandardMaterial({ color: 0xf2f7f3, emissive: 0x2b2d2b, roughness: 0.58 });
  const sectorMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x191919, roughness: 0.6 });
  const square = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 3.2), whiteMaterial);
  square.position.y = 0.06;
  group.add(square);

  const sector = createGroundTriangle(12, 18, sectorMaterial);
  sector.position.set(0, 0.05, 8.5);
  group.add(sector);

  const standLine = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.1, 0.22), whiteMaterial);
  standLine.position.set(0, 0.07, 1.8);
  group.add(standLine);

  scene.add(group);
}

function addLongJumpMarkers(scene: THREE.Scene, planetRadius: number): void {
  const group = createPlacedGroup({
    planetRadius,
    longitudeDeg: 196,
    latitudeDeg: -18,
    altitude: 0.13,
    headingDeg: 90,
  });
  const runwayMaterial = new THREE.MeshStandardMaterial({ color: 0xb3a18a, emissive: 0x20170f, roughness: 0.7 });
  const boardMaterial = new THREE.MeshStandardMaterial({ color: 0xf2f7f3, emissive: 0x2b2d2b, roughness: 0.58 });
  const pitMaterial = new THREE.MeshStandardMaterial({ color: 0xd8c19a, emissive: 0x271c10, roughness: 0.82 });

  const runway = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.1, 26), runwayMaterial);
  runway.position.y = 0.05;
  group.add(runway);

  const board = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.12, 0.36), boardMaterial);
  board.position.set(0, 0.08, 8.8);
  group.add(board);

  const pit = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.08, 5.2), pitMaterial);
  pit.position.set(0, 0.04, 13.6);
  group.add(pit);

  scene.add(group);
}

function addPoleVaultMarkers(scene: THREE.Scene, planetRadius: number): void {
  const group = createPlacedGroup({
    planetRadius,
    longitudeDeg: 232,
    latitudeDeg: -18,
    altitude: 0.13,
    headingDeg: 90,
  });
  const runwayMaterial = new THREE.MeshStandardMaterial({ color: 0x7e8f8d, emissive: 0x151c1b, roughness: 0.72 });
  const boxMaterial = new THREE.MeshStandardMaterial({ color: 0xf2f7f3, emissive: 0x2b2d2b, roughness: 0.58 });
  const barMaterial = new THREE.MeshStandardMaterial({ color: 0xe5c97c, emissive: 0x2b210c, roughness: 0.46 });

  const runway = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 24), runwayMaterial);
  runway.position.y = 0.05;
  group.add(runway);

  const plantBox = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.12, 1.3), boxMaterial);
  plantBox.position.set(0, 0.08, 8.0);
  group.add(plantBox);

  const leftStandard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 4.3, 0.18), barMaterial);
  leftStandard.position.set(-2.1, 2.15, 10.7);
  group.add(leftStandard);

  const rightStandard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 4.3, 0.18), barMaterial);
  rightStandard.position.set(2.1, 2.15, 10.7);
  group.add(rightStandard);

  const crossBar = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.12, 0.12), barMaterial);
  crossBar.position.set(0, 3.05, 10.7);
  group.add(crossBar);

  scene.add(group);
}

function createGroundTriangle(width: number, length: number, material: THREE.Material): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(0, length);
  shape.closePath();
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), material);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

function addRamp(scene: THREE.Scene, planetRadius: number): void {
  const group = createPlacedGroup({
    planetRadius,
    longitudeDeg: getRampLongitudeDeg(),
    radialOffset: RAMP_CONFIG.radialOffset,
    altitude: 0.08,
    headingDeg: RAMP_CONFIG.headingDeg,
  });
  const rampMaterial = new THREE.MeshStandardMaterial({
    color: 0x78846f,
    emissive: 0x151a12,
    roughness: 0.72,
    side: THREE.DoubleSide,
  });
  const deckMaterial = new THREE.MeshStandardMaterial({ color: 0x98a58d, emissive: 0x171d14, roughness: 0.68 });
  const fullLength = RAMP_CONFIG.rampLength * 2 + RAMP_CONFIG.topLength;

  const upRamp = createRampSegment(RAMP_CONFIG.width, RAMP_CONFIG.rampLength, RAMP_CONFIG.height, rampMaterial, 1);
  upRamp.position.z = -fullLength / 2 + RAMP_CONFIG.rampLength / 2;
  group.add(upRamp);

  const top = new THREE.Mesh(
    new THREE.BoxGeometry(RAMP_CONFIG.width, 0.22, RAMP_CONFIG.topLength),
    deckMaterial,
  );
  top.position.set(0, RAMP_CONFIG.height, 0);
  group.add(top);

  const downRamp = createRampSegment(RAMP_CONFIG.width, RAMP_CONFIG.rampLength, RAMP_CONFIG.height, rampMaterial, -1);
  downRamp.position.z = fullLength / 2 - RAMP_CONFIG.rampLength / 2;
  group.add(downRamp);

  scene.add(group);
}

function createRampSegment(
  width: number,
  length: number,
  height: number,
  material: THREE.Material,
  slopeDirection: 1 | -1,
): THREE.Mesh {
  const halfWidth = width / 2;
  const halfLength = length / 2;
  const lowZ = slopeDirection === 1 ? -halfLength : halfLength;
  const highZ = slopeDirection === 1 ? halfLength : -halfLength;
  const geometry = new THREE.BufferGeometry();
  geometry.setFromPoints([
    new THREE.Vector3(-halfWidth, 0, lowZ),
    new THREE.Vector3(halfWidth, 0, lowZ),
    new THREE.Vector3(-halfWidth, height, highZ),
    new THREE.Vector3(halfWidth, height, highZ),
    new THREE.Vector3(-halfWidth, 0, highZ),
    new THREE.Vector3(halfWidth, 0, highZ),
  ]);
  geometry.setIndex([
    0, 1, 2, 1, 3, 2,
    2, 3, 4, 3, 5, 4,
    0, 2, 4, 0, 4, 1,
    1, 4, 5, 1, 5, 3,
    0, 4, 2, 1, 3, 5,
  ]);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
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
    radialOffset: -outsideTrackOffset,
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
