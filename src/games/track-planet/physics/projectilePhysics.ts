import * as THREE from 'three';
import { ShotPutMotion } from './shotPutMotion';
import { type PlanetBoxCollider, resolveSphereAgainstPlanetBox } from './planetCollision';

export class ProjectilePhysics {
  readonly motion: ShotPutMotion;
  readonly startTime: number;

  constructor(
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
      collisionVolumes: ReadonlyArray<PlanetBoxCollider>;
    },
  ) {
    this.motion = new ShotPutMotion(options);
    this.startTime = options.startTime;
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
    void previousPosition;
    for (const collider of this.options.collisionVolumes) {
      resolveSphereAgainstPlanetBox(this.motion.position, this.motion.velocity, 0.42, collider, {
        restitution: collider.restitution,
        friction: collider.friction,
      });
    }
  }
}
