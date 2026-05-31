import * as THREE from 'three';
import { RAPIER, type RapierPhysicsWorld } from '../../../engine/physics/rapierWorld';
import { ShotPutMotion } from './shotPutMotion';

export class ProjectilePhysics {
  readonly motion: ShotPutMotion;
  readonly startTime: number;

  private readonly shape: RAPIER.Shape;

  constructor(
    private readonly rapier: RapierPhysicsWorld,
    private readonly options: {
      position: THREE.Vector3;
      velocity: THREE.Vector3;
      radius: number;
      mass: number;
      restitution: number;
      friction: number;
      planetRadius: number;
      surfaceGravity: number;
      startTime: number;
      collisionColliderHandles: ReadonlySet<number>;
    },
  ) {
    this.motion = new ShotPutMotion(options);
    this.startTime = options.startTime;
    this.shape = new RAPIER.Ball(options.radius);
  }

  beforePhysicsStep(dt: number): void {
    const previousPosition = this.motion.getPosition();
    this.motion.step(dt);
    this.resolveSceneryCollisions(previousPosition);
  }

  getPosition(): THREE.Vector3 {
    return this.motion.getPosition();
  }

  getVelocity(): THREE.Vector3 {
    return this.motion.getVelocity();
  }

  getAltitude(): number {
    return this.motion.getAltitude();
  }

  getSurfaceDistance(): number {
    return this.motion.getSurfaceDistance();
  }

  getOrbitMetrics(): ReturnType<ShotPutMotion['getOrbitMetrics']> {
    return this.motion.getOrbitMetrics();
  }

  get maxAltitude(): number {
    return this.motion.maxAltitude;
  }

  get bounceCount(): number {
    return this.motion.bounceCount;
  }

  get orbitAchievementFired(): boolean {
    return this.motion.orbitAchievementFired;
  }

  set orbitAchievementFired(value: boolean) {
    this.motion.orbitAchievementFired = value;
  }

  get escapeAchievementFired(): boolean {
    return this.motion.escapeAchievementFired;
  }

  set escapeAchievementFired(value: boolean) {
    this.motion.escapeAchievementFired = value;
  }

  get hasTouchedSurface(): boolean {
    return this.motion.hasTouchedSurface;
  }

  applySphereContact(options: Parameters<ShotPutMotion['applySphereContact']>[0]): boolean {
    return this.motion.applySphereContact(options);
  }

  resolveSphereContact(other: ProjectilePhysics): boolean {
    return this.motion.resolveSphereContact(other.motion);
  }

  private resolveSceneryCollisions(previousPosition: THREE.Vector3): void {
    const currentPosition = this.motion.getPosition();
    const displacement = currentPosition.clone().sub(previousPosition);
    if (displacement.lengthSq() < 0.000001) {
      return;
    }

    const shapeRotation = { x: 0, y: 0, z: 0, w: 1 };
    const shapePosition = { x: previousPosition.x, y: previousPosition.y, z: previousPosition.z };
    const shapeVelocity = { x: displacement.x, y: displacement.y, z: displacement.z };
    const hit = this.rapier.world.castShape(
      shapePosition,
      shapeRotation,
      shapeVelocity,
      this.shape,
      displacement.length(),
      1,
      true,
      undefined,
      undefined,
      undefined,
      undefined,
      collider => this.options.collisionColliderHandles.has(collider.handle),
    );

    if (!hit) {
      return;
    }

    const contactPosition = previousPosition.clone().addScaledVector(displacement, hit.time_of_impact);
    const colliderRotation = hit.collider.rotation();
    const normal = new THREE.Vector3(hit.normal2.x, hit.normal2.y, hit.normal2.z)
      .applyQuaternion(new THREE.Quaternion(colliderRotation.x, colliderRotation.y, colliderRotation.z, colliderRotation.w))
      .normalize();

    this.motion.position.copy(contactPosition).addScaledVector(normal, 0.001);
    this.motion.applyContact({ normal });
    this.motion.resting = false;
  }
}
