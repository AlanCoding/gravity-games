import * as THREE from 'three';
import { makePlanetFrame } from '../../engine/planetPlacement';
import {
  TRACK_START_HEADING_DEGREES,
  TRACK_START_LANE_OFFSET_METERS,
  TRACK_START_LONGITUDE_DEGREES,
} from './constants';
import { createPlayerModel, createPlayerShadow } from './playerModel';
import { addTrackAssets } from './trackAssets';
import { addWorldProps } from './worldProps';

export type TrackPlanetScene = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  player: THREE.Group;
  playerShadow: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  rotatingObject: THREE.Object3D;
  resize: () => void;
  dispose: () => void;
};

export function getTrackStartUp(planetRadius: number): THREE.Vector3 {
  return makePlanetFrame({
    planetRadius,
    longitudeDeg: TRACK_START_LONGITUDE_DEGREES,
    radialOffset: TRACK_START_LANE_OFFSET_METERS,
    headingDeg: TRACK_START_HEADING_DEGREES,
  }).localUp;
}

export function createTrackPlanetScene(container: HTMLElement, planetRadius: number, playerHeight: number): TrackPlanetScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(65, 16 / 9, 0.1, 1200);
  const player = createPlayerModel(playerHeight);
  const playerShadow = createPlayerShadow();

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x050709, 1);
  container.appendChild(renderer.domElement);

  scene.fog = new THREE.Fog(0x050709, 170, 520);
  scene.add(new THREE.HemisphereLight(0xb7d8ff, 0x243b29, 2.1));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(80, 120, 60);
  scene.add(sun);

  scene.add(createPlanet(planetRadius));
  scene.add(createPlanetWireframe(planetRadius));
  addTrackAssets(scene, planetRadius);
  const rotatingObject = addWorldProps(scene, planetRadius);
  scene.add(playerShadow, player);

  function resize(): void {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  return {
    scene,
    camera,
    renderer,
    player,
    playerShadow,
    rotatingObject,
    resize,
    dispose: () => renderer.dispose(),
  };
}

function createPlanet(planetRadius: number): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.SphereGeometry(planetRadius, 64, 32),
    new THREE.MeshStandardMaterial({ color: 0x3d8a70, emissive: 0x0a2f25, roughness: 0.82, metalness: 0.03 }),
  );
}

function createPlanetWireframe(planetRadius: number): THREE.LineSegments {
  return new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.SphereGeometry(planetRadius + 0.08, 32, 18)),
    new THREE.LineBasicMaterial({ color: 0x86c7b0, transparent: true, opacity: 0.18 }),
  );
}
