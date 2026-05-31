import * as THREE from 'three';
import { RAPIER, type RapierPhysicsWorld } from '../../../engine/physics/rapierWorld';
import { computeOrbitMetrics } from './gravity';

export class ProjectilePhysics {
  readonly body: RAPIER.RigidBody;
  readonly collider: RAPIER.Collider;
  readonly startUp: THREE.Vector3;
  readonly startTime: number;

  maxAltitude = 0;
  bounceCount = 0;
  orbitAchievementFired = false;
  escapeAchievementFired = false;

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
    },
  ) {
    this.startUp = options.position.clone().normalize();
    this.startTime = options.startTime;
    this.body = this.rapier.createDynamicBody(options.position, { linearDamping: 0.01, angularDamping: 0.05 });
    this.body.setLinvel({ x: options.velocity.x, y: options.velocity.y, z: options.velocity.z }, true);
    this.body.enableCcd(true);
    this.collider = this.rapier.world.createCollider(
      RAPIER.ColliderDesc.ball(options.radius)
        .setDensity(options.mass / ((4 / 3) * Math.PI * options.radius ** 3))
        .setRestitution(options.restitution)
        .setFriction(options.friction)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      this.body,
    );
  }

  beforePhysicsStep(): void {
    const position = this.getPosition();
    const fromCenter = position.clone();
    const distance = Math.max(fromCenter.length(), this.options.planetRadius + this.options.radius * 0.9);
    const gravityDirection = fromCenter.lengthSq() > 0.000001 ? fromCenter.normalize() : this.startUp.clone();
    const mu = this.options.surfaceGravity * this.options.planetRadius * this.options.planetRadius;
    const gravity = gravityDirection.multiplyScalar(-mu / (distance * distance));
    this.body.addForce({ x: gravity.x * this.body.mass(), y: gravity.y * this.body.mass(), z: gravity.z * this.body.mass() }, true);
    this.applyAtmosphericDrag(position);
    this.maxAltitude = Math.max(this.maxAltitude, position.length() - this.options.planetRadius - this.options.radius);
  }

  getPosition(): THREE.Vector3 {
    const position = this.body.translation();
    return new THREE.Vector3(position.x, position.y, position.z);
  }

  getVelocity(): THREE.Vector3 {
    const velocity = this.body.linvel();
    return new THREE.Vector3(velocity.x, velocity.y, velocity.z);
  }

  getAltitude(): number {
    return this.getPosition().length() - this.options.planetRadius - this.options.radius;
  }

  getSurfaceDistance(): number {
    const currentUp = this.getPosition().clone().normalize();
    const angle = Math.acos(THREE.MathUtils.clamp(this.startUp.dot(currentUp), -1, 1));
    return angle * this.options.planetRadius;
  }

  getOrbitMetrics(): ReturnType<typeof computeOrbitMetrics> {
    return computeOrbitMetrics({
      position: this.getPosition(),
      velocity: this.getVelocity(),
      planetRadius: this.options.planetRadius,
      surfaceGravity: this.options.surfaceGravity,
    });
  }

  private applyAtmosphericDrag(position: THREE.Vector3): void {
    const velocity = this.getVelocity();
    const speed = velocity.length();
    if (speed < 0.001) {
      return;
    }

    const altitude = Math.max(0, position.length() - this.options.planetRadius - this.options.radius);
    const atmosphereFactor = Math.pow(THREE.MathUtils.clamp(1 - altitude / 120, 0, 1), 2);
    if (atmosphereFactor <= 0) {
      return;
    }

    const dragCoefficient = 0.02 * atmosphereFactor;
    const dragForce = velocity.normalize().multiplyScalar(-dragCoefficient * speed * speed * this.body.mass());
    this.body.addForce({ x: dragForce.x, y: dragForce.y, z: dragForce.z }, true);
  }
}
