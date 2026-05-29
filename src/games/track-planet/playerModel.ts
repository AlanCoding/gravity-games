import * as THREE from 'three';

export function createPlayerModel(playerHeight: number): THREE.Group {
  const player = new THREE.Group();
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xf2f7f3, roughness: 0.45 });
  const noseMaterial = new THREE.MeshStandardMaterial({ color: 0xd6563f, roughness: 0.55 });
  const torsoHeight = playerHeight * 0.62;
  const headRadius = playerHeight * 0.14;
  const bodyRadius = playerHeight * 0.16;

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(bodyRadius, torsoHeight, 6, 16), bodyMaterial);
  torso.position.y = -playerHeight * 0.08;

  const head = new THREE.Mesh(new THREE.SphereGeometry(headRadius, 20, 14), bodyMaterial);
  head.position.y = playerHeight * 0.34;

  const nose = new THREE.Mesh(new THREE.ConeGeometry(playerHeight * 0.1, playerHeight * 0.34, 16), noseMaterial);
  nose.rotation.z = -Math.PI / 2;
  nose.position.set(playerHeight * 0.24, playerHeight * 0.35, 0);

  player.add(torso, head, nose);
  return player;
}

export function createPlayerShadow(): THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial> {
  const geometry = new THREE.CircleGeometry(1, 40);
  geometry.rotateX(-Math.PI / 2);
  const shadow = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: 0x020302,
      depthWrite: false,
      transparent: true,
      opacity: 0.58,
    }),
  );
  shadow.renderOrder = 2;
  return shadow;
}
