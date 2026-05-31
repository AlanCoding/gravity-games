import * as THREE from 'three';
import { RAPIER, type RapierPhysicsWorld } from '../../../engine/physics/rapierWorld';

export class Pole {
  readonly mesh: THREE.Mesh;
  readonly body: RAPIER.RigidBody;
  readonly collider: RAPIER.Collider;
  private readonly scene: THREE.Scene;
  private disposed = false;

  constructor(options: { scene: THREE.Scene; rapier: RapierPhysicsWorld; position: THREE.Vector3; orientation: THREE.Quaternion }) {
    this.scene = options.scene;
    this.mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 5.2, 12),
      new THREE.MeshStandardMaterial({ color: 0xd8c47a, roughness: 0.42 }),
    );
    this.body = options.rapier.createDynamicBody(options.position, { linearDamping: 0.02, angularDamping: 0.2 });
    this.body.setRotation(
      { x: options.orientation.x, y: options.orientation.y, z: options.orientation.z, w: options.orientation.w },
      true,
    );
    this.collider = options.rapier.world.createCollider(
      RAPIER.ColliderDesc.capsule(2.5, 0.06).setFriction(0.7).setRestitution(0.15),
      this.body,
    );
    this.scene.add(this.mesh);
  }

  updateFromPhysics(): void {
    if (this.disposed) {
      return;
    }
    const position = this.body.translation();
    const rotation = this.body.rotation();
    this.mesh.position.set(position.x, position.y, position.z);
    this.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
  }

  dispose(rapier: RapierPhysicsWorld): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.scene.remove(this.mesh);
    rapier.world.removeCollider(this.collider, true);
    rapier.world.removeRigidBody(this.body);
    this.mesh.geometry.dispose();
    if (Array.isArray(this.mesh.material)) {
      this.mesh.material.forEach(material => material.dispose());
    } else {
      this.mesh.material.dispose();
    }
  }
}
