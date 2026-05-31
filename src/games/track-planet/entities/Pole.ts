import * as THREE from 'three';

export class Pole {
  readonly mesh: THREE.Mesh;
  private readonly scene: THREE.Scene;
  private readonly baseHeight = 5.2;
  private disposed = false;

  constructor(options: { scene: THREE.Scene; position: THREE.Vector3; orientation: THREE.Quaternion }) {
    this.scene = options.scene;
    this.mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, this.baseHeight, 12),
      new THREE.MeshStandardMaterial({ color: 0xd8c47a, roughness: 0.42 }),
    );
    this.mesh.position.copy(options.position);
    this.mesh.quaternion.copy(options.orientation);
    this.scene.add(this.mesh);
  }

  updateFromPhysics(options: { basePosition: THREE.Vector3; tipPosition: THREE.Vector3 }): void {
    if (this.disposed) {
      return;
    }

    const poleVector = options.tipPosition.clone().sub(options.basePosition);
    const poleLength = poleVector.length();
    if (poleLength < 0.01) {
      this.mesh.visible = false;
      return;
    }

    const direction = poleVector.clone().normalize();
    const midpoint = options.basePosition.clone().addScaledVector(direction, poleLength * 0.5);
    this.mesh.visible = true;
    this.mesh.position.copy(midpoint);
    this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    this.mesh.scale.set(1, poleLength / this.baseHeight, 1);
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    if (Array.isArray(this.mesh.material)) {
      this.mesh.material.forEach(material => material.dispose());
    } else {
      this.mesh.material.dispose();
    }
  }
}
