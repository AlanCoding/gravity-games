import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';

export type RapierCollisionEvent = {
  colliderA: number;
  colliderB: number;
  started: boolean;
};

export class RapierPhysicsWorld {
  readonly world: RAPIER.World;
  readonly eventQueue: RAPIER.EventQueue;
  readonly debugEnabled: boolean;

  private readonly fixedTimeStep: number;
  private accumulator = 0;
  private readonly collisionEvents: RapierCollisionEvent[] = [];
  private debugLines: THREE.LineSegments | null = null;

  constructor(options: { fixedTimeStep?: number; debugEnabled?: boolean } = {}) {
    // Gravity must stay disabled in Rapier. Track Planet applies custom radial
    // 1/r^2 gravity manually so objects fall toward the spherical planet center,
    // not toward a global flat-world down axis.
    this.world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    this.eventQueue = new RAPIER.EventQueue(true);
    this.fixedTimeStep = options.fixedTimeStep ?? 1 / 60;
    this.debugEnabled = options.debugEnabled ?? false;
  }

  static async create(options?: { fixedTimeStep?: number; debugEnabled?: boolean }): Promise<RapierPhysicsWorld> {
    await RAPIER.init();
    return new RapierPhysicsWorld(options);
  }

  step(dt: number, beforeStep?: (fixedDt: number) => void): number {
    this.accumulator += Math.min(dt, 0.1);
    this.collisionEvents.length = 0;
    let steps = 0;

    while (this.accumulator >= this.fixedTimeStep && steps < 5) {
      beforeStep?.(this.fixedTimeStep);
      this.world.timestep = this.fixedTimeStep;
      this.world.step(this.eventQueue);
      this.eventQueue.drainCollisionEvents((colliderA, colliderB, started) => {
        this.collisionEvents.push({ colliderA, colliderB, started });
      });
      this.accumulator -= this.fixedTimeStep;
      steps += 1;
    }

    return steps;
  }

  getCollisionEvents(): readonly RapierCollisionEvent[] {
    return this.collisionEvents;
  }

  createDynamicBody(position: THREE.Vector3, options: { linearDamping?: number; angularDamping?: number } = {}): RAPIER.RigidBody {
    const desc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z)
      .setLinearDamping(options.linearDamping ?? 0)
      .setAngularDamping(options.angularDamping ?? 0);
    return this.world.createRigidBody(desc);
  }

  syncObjectFromBody(object: THREE.Object3D, body: RAPIER.RigidBody): void {
    const position = body.translation();
    const rotation = body.rotation();
    object.position.set(position.x, position.y, position.z);
    object.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
  }

  updateDebugLines(scene: THREE.Scene): void {
    if (!this.debugEnabled) {
      return;
    }
    const buffers = this.world.debugRender();
    if (!this.debugLines) {
      this.debugLines = new THREE.LineSegments(
        new THREE.BufferGeometry(),
        new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.75 }),
      );
      scene.add(this.debugLines);
    }

    this.debugLines.geometry.dispose();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(buffers.vertices, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(buffers.colors, 4));
    this.debugLines.geometry = geometry;
  }
}

export { RAPIER };
