import * as THREE from 'three';
import { laneToLatitudeOrOffset, makePlanetFrame, placeOnPlanet } from '../../engine/planetPlacement';
import {
  TRACK_LANE_SPACING_METERS,
  TRACK_START_HEADING_DEGREES,
  TRACK_START_LONGITUDE_DEGREES,
} from './constants';

export function addTrackAssets(scene: THREE.Scene, planetRadius: number): void {
  addTrackLanes(scene, planetRadius);
  addStartFinishLine(scene, planetRadius);
}

function addTrackLanes(scene: THREE.Scene, planetRadius: number): void {
  const laneCount = 6;
  const material = new THREE.MeshStandardMaterial({ color: 0xeac460, emissive: 0x5a420d, roughness: 0.5 });

  for (let i = 0; i < laneCount; i += 1) {
    const radialOffset = laneToLatitudeOrOffset({
      laneIndex: i,
      laneCount,
      laneSpacingMeters: TRACK_LANE_SPACING_METERS,
    });
    const ring = new THREE.Mesh(makeLatitudeTubeGeometry(planetRadius, radialOffset, 0.12, 0.07), material);
    scene.add(ring);
  }
}

function addStartFinishLine(scene: THREE.Scene, planetRadius: number): void {
  const laneCount = 6;
  const trackWidth = (laneCount - 1) * TRACK_LANE_SPACING_METERS + 1.2;
  const line = new THREE.Mesh(
    new THREE.BoxGeometry(trackWidth, 0.08, 0.55),
    new THREE.MeshStandardMaterial({ color: 0xf2f7f3, emissive: 0x303030, roughness: 0.55 }),
  );
  placeOnPlanet(line, {
    planetRadius,
    longitudeDeg: TRACK_START_LONGITUDE_DEGREES,
    altitude: 0.18,
    headingDeg: TRACK_START_HEADING_DEGREES,
  });
  scene.add(line);
}

function makeLatitudeTubeGeometry(
  planetRadius: number,
  radialOffset: number,
  altitude: number,
  tubeRadius: number,
): THREE.TubeGeometry {
  const points = Array.from({ length: 193 }, (_, index) => {
    const longitudeDeg = (index / 192) * 360;
    return makePlanetFrame({
      planetRadius,
      longitudeDeg,
      radialOffset,
      altitude,
      headingDeg: TRACK_START_HEADING_DEGREES,
    }).position;
  });
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), 192, tubeRadius, 8, true);
}
