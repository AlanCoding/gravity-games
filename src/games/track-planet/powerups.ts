import * as THREE from 'three';
import { createPlacedGroup } from '../../engine/planetPlacement';

export type TrackPlanetPowerupKind = 'runner-upgrade' | 'shot-put-upgrade' | 'rocket-pack';

export type TrackPlanetPowerup = {
  kind: TrackPlanetPowerupKind;
  label: string;
  description: string;
  position: THREE.Vector3;
  radius: number;
  collected: boolean;
  mesh: THREE.Group;
  collect: () => void;
};

export function createTrackPlanetPowerups(scene: THREE.Scene, planetRadius: number): TrackPlanetPowerup[] {
  const powerups = [
    createPowerup(scene, planetRadius, {
      kind: 'runner-upgrade',
      label: 'Runner upgrade',
      description: 'Raises runner tier by one.\n-coach',
      longitudeDeg: 28,
      latitudeDeg: 10,
      altitude: 1.1,
      color: 0xeac460,
    }),
    createPowerup(scene, planetRadius, {
      kind: 'runner-upgrade',
      label: 'Runner upgrade',
      description: 'Raises runner tier by one.\n-coach',
      longitudeDeg: 44,
      latitudeDeg: -12,
      altitude: 1.1,
      color: 0xd1f0a0,
    }),
    createPowerup(scene, planetRadius, {
      kind: 'shot-put-upgrade',
      label: 'Shot put power',
      description: 'Raises shot put throw power.\n-coach',
      longitudeDeg: 138,
      latitudeDeg: 16,
      altitude: 1.1,
      color: 0xffb35f,
    }),
    createPowerup(scene, planetRadius, {
      kind: 'rocket-pack',
      label: 'Rocket pack',
      description: 'Pushes forward while airborne.\nRefuels on the ground.\n-coach',
      longitudeDeg: 302,
      latitudeDeg: 12,
      altitude: 1.1,
      color: 0x7db7ff,
    }),
  ];

  return powerups;
}

function createPowerup(
  scene: THREE.Scene,
  planetRadius: number,
  options: {
    kind: TrackPlanetPowerupKind;
    label: string;
    description: string;
    longitudeDeg: number;
    latitudeDeg: number;
    altitude: number;
    color: THREE.ColorRepresentation;
  },
): TrackPlanetPowerup {
  const group = createPlacedGroup({
    planetRadius,
    longitudeDeg: options.longitudeDeg,
    latitudeDeg: options.latitudeDeg,
    altitude: options.altitude,
    headingDeg: 90,
  });

  const billboardWall = createPowerupBillboardWall(options.label, options.description);
  billboardWall.position.set(0, 3.1, 2.6);
  group.add(billboardWall);

  const pickupGroup = new THREE.Group();
  pickupGroup.position.set(0, 0, -2.2);
  const markerMaterial = new THREE.MeshStandardMaterial({
    color: options.color,
    emissive: options.color,
    emissiveIntensity: 0.28,
    roughness: 0.34,
    metalness: 0.18,
  });
  const stemMaterial = new THREE.MeshStandardMaterial({ color: 0xe6ebe9, roughness: 0.55 });

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.1, 10), stemMaterial);
  stem.position.y = 0.55;
  pickupGroup.add(stem);

  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.48, 16, 12), markerMaterial);
  orb.position.y = 1.55;
  pickupGroup.add(orb);

  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.08, 8, 16), markerMaterial);
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 1.55;
  pickupGroup.add(halo);

  group.add(pickupGroup);

  scene.add(group);

  return {
    kind: options.kind,
    label: options.label,
    description: options.description,
    position: group.position.clone(),
    radius: 2.3,
    collected: false,
    mesh: group,
    collect: () => {
      if (pickupGroup.visible) {
        pickupGroup.visible = false;
      }
    },
  };
}

function createPowerupBillboardWall(title: string, body: string): THREE.Mesh {
  const lines = [title, ...body.split('\n')];
  const canvas = document.createElement('canvas');
  canvas.width = 1536;
  canvas.height = 640;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D context unavailable for powerup label.');
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'rgba(12, 18, 19, 0.94)';
  roundRect(context, 22, 22, canvas.width - 44, canvas.height - 44, 42);
  context.fill();
  context.strokeStyle = 'rgba(234, 196, 96, 0.9)';
  context.lineWidth = 16;
  context.stroke();

  context.fillStyle = '#eef4f8';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '700 128px Inter, system-ui, sans-serif';
  context.fillText(lines[0], canvas.width / 2, 210);

  context.font = '500 78px Inter, system-ui, sans-serif';
  const bodyLines = lines.slice(1);
  bodyLines.forEach((line, index) => {
    context.fillStyle = index === bodyLines.length - 1 ? '#eac460' : '#d7e1de';
  context.fillText(line, canvas.width / 2, 390 + index * 112);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  const wallDepth = 0.18;
  const wallWidth = 7.8;
  const wallHeight = 4.6;
  const wallMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x1b2528, roughness: 0.92, metalness: 0.04 }), // right
    new THREE.MeshStandardMaterial({ color: 0x1b2528, roughness: 0.92, metalness: 0.04 }), // left
    new THREE.MeshStandardMaterial({ color: 0x203036, roughness: 0.88, metalness: 0.02 }), // top
    new THREE.MeshStandardMaterial({ color: 0x162026, roughness: 0.96, metalness: 0.01 }), // bottom
    new THREE.MeshStandardMaterial({ map: texture, color: 0xffffff, roughness: 0.88, metalness: 0.02 }), // front
    new THREE.MeshStandardMaterial({ color: 0x7f858b, roughness: 0.96, metalness: 0.02 }), // back
  ];
  const wall = new THREE.Mesh(new THREE.BoxGeometry(wallWidth, wallHeight, wallDepth), wallMaterials);
  wall.rotation.y = Math.PI;
  wall.castShadow = false;
  wall.receiveShadow = true;
  return wall;
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}
