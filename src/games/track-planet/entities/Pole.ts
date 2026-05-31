import * as THREE from 'three';

export class Pole {
  readonly mesh: THREE.Mesh;
  private readonly scene: THREE.Scene;
  private disposed = false;

  constructor(options: { scene: THREE.Scene; position: THREE.Vector3; orientation: THREE.Quaternion }) {
    this.scene = options.scene;
    this.mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 5.2, 12),
      new THREE.MeshStandardMaterial({ color: 0xd8c47a, roughness: 0.42 }),
    );
    this.mesh.position.copy(options.position);
    this.mesh.quaternion.copy(options.orientation);
    this.scene.add(this.mesh);
  }

  updateFromPhysics(): void {
    if (this.disposed) {
      return;
    }
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
