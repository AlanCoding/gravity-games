import * as THREE from 'three';
import { RAPIER, type RapierPhysicsWorld } from '../../../engine/physics/rapierWorld';
import { computeOrbitMetrics, computePlanetGravity, getRadialUp } from './gravity';

export type PlayerPhysicsInput = {
  dt: number;
  desiredTangentVelocity: THREE.Vector3;
  jumpRequested: boolean;
  poleVaultRequested: boolean;
};

export type PlayerPhysicsSnapshot = {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  radialUp: THREE.Vector3;
  grounded: boolean;
  jumped: boolean;
  speed: number;
  altitude: number;
  altitudeAboveGround: number;
  groundHeight: number;
  orbitalSpeed: number;
  escapeSpeed: number;
  orbitPerigeeAltitude: number;
};

export class PlayerPhysics {
  readonly body: RAPIER.RigidBody;
  readonly collider: RAPIER.Collider;

  private position: THREE.Vector3;
  private velocity = new THREE.Vector3();
  private grounded = true;
  private jumpedThisStep = false;
  private airborneJumpConsumed = false;
  private readonly mu: number;
  private readonly surfaceDistance: number;

  constructor(
    private readonly rapier: RapierPhysicsWorld,
    private readonly options: {
      planetRadius: number;
      surfaceGravity: number;
      bodyCenterHeight: number;
      tangentAcceleration: number;
      groundedFriction: number;
      jumpSpeed: number;
      initialUp: THREE.Vector3;
      blockingColliderHandles?: ReadonlySet<number>;
      groundSurfaces?: ReadonlyArray<{ heightAt: (position: THREE.Vector3) => number | null }>;
    },
  ) {
    this.mu = options.surfaceGravity * options.planetRadius * options.planetRadius;
    this.surfaceDistance = options.planetRadius + options.bodyCenterHeight;
    this.position = options.initialUp.clone().normalize().multiplyScalar(this.surfaceDistance);

    const desc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
      this.position.x,
      this.position.y,
      this.position.z,
    );
    this.body = this.rapier.world.createRigidBody(desc);

    const capsuleRadius = 0.32;
    const capsuleHalfHeight = Math.max(0.2, options.bodyCenterHeight - capsuleRadius);
    this.collider = this.rapier.world.createCollider(
      RAPIER.ColliderDesc.capsule(capsuleHalfHeight, capsuleRadius)
        .setFriction(0.9)
        .setRestitution(0)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      this.body,
    );
    this.syncBodyTransform();
  }

  beforePhysicsStep(input: PlayerPhysicsInput): void {
    this.jumpedThisStep = false;
    const previousPosition = this.position.clone();
    const previousVelocity = this.velocity.clone();
    this.updateGrounded();

    if (this.grounded) {
      this.airborneJumpConsumed = false;
      this.position.setLength(this.getGroundDistance(this.position));
      this.velocity.projectOnPlane(getRadialUp(this.position));
      this.applyGroundMovement(input.desiredTangentVelocity, input.dt);
    }

    if (input.jumpRequested && (this.grounded || !this.airborneJumpConsumed)) {
      if (input.poleVaultRequested) {
        this.applyPoleVault();
      } else {
        this.applyJump();
      }
    }

    if (!this.grounded) {
      this.velocity.addScaledVector(
        computePlanetGravity({
          position: this.position,
          planetRadius: this.options.planetRadius,
          surfaceGravity: this.options.surfaceGravity,
        }),
        input.dt,
      );
      this.position.addScaledVector(this.velocity, input.dt);
      this.resolvePlanetContact();
    } else {
      this.walkAlongSurface(input.dt);
    }

    this.resolveBlockingCollisions(previousPosition, previousVelocity);
    this.syncBodyTransform();
  }

  getSnapshot(): PlayerPhysicsSnapshot {
    this.updateGrounded();
    const distance = Math.max(this.position.length(), 0.001);
    const groundHeight = this.getGroundHeight(this.position);
    return {
      position: this.position.clone(),
      velocity: this.velocity.clone(),
      radialUp: getRadialUp(this.position),
      grounded: this.grounded,
      jumped: this.jumpedThisStep,
      speed: this.velocity.length(),
      altitude: distance - this.surfaceDistance,
      altitudeAboveGround: distance - this.surfaceDistance - groundHeight,
      groundHeight,
      orbitalSpeed: Math.sqrt(this.mu / distance),
      escapeSpeed: Math.sqrt((2 * this.mu) / distance),
      orbitPerigeeAltitude: computeOrbitMetrics({
        position: this.position,
        velocity: this.velocity,
        planetRadius: this.options.planetRadius,
        surfaceGravity: this.options.surfaceGravity,
      }).perigeeAltitude,
    };
  }

  private applyGroundMovement(desiredTangentVelocity: THREE.Vector3, dt: number): void {
    const radialUp = getRadialUp(this.position);
    const tangentVelocity = this.velocity.clone().projectOnPlane(radialUp);
    const desired = desiredTangentVelocity.clone().projectOnPlane(radialUp);
    const delta = desired.sub(tangentVelocity);
    const maxChange = this.options.tangentAcceleration * dt;
    if (delta.length() > maxChange) {
      delta.setLength(maxChange);
    }

    if (desiredTangentVelocity.lengthSq() < 0.0001) {
      const damp = Math.max(0, 1 - this.options.groundedFriction * dt);
      delta.addScaledVector(tangentVelocity, damp - 1);
    }

    this.velocity.copy(tangentVelocity.add(delta));
  }

  private applyJump(): void {
    const radialUp = getRadialUp(this.position);
    const radialVelocity = radialUp.dot(this.velocity);
    if (radialVelocity < 0) {
      this.velocity.addScaledVector(radialUp, -radialVelocity);
    }
    this.velocity.addScaledVector(radialUp, this.options.jumpSpeed);
    this.grounded = false;
    this.airborneJumpConsumed = true;
    this.jumpedThisStep = true;
  }

  private applyPoleVault(): void {
    const radialUp = getRadialUp(this.position);
    const tangentVelocity = this.velocity.clone().projectOnPlane(radialUp);
    const tangentSpeed = tangentVelocity.length();
    const tangentCarry = tangentSpeed * 0.15;
    const vaultBoost = this.options.jumpSpeed * 5.5 + tangentSpeed * 2.9 + 4.2;
    const carryDirection = tangentSpeed > 0.0001 ? tangentVelocity.normalize() : new THREE.Vector3();

    this.velocity.copy(carryDirection.multiplyScalar(tangentCarry)).addScaledVector(radialUp, vaultBoost);
    this.grounded = false;
    this.airborneJumpConsumed = true;
    this.jumpedThisStep = true;
  }

  private walkAlongSurface(dt: number): void {
    const radialUp = getRadialUp(this.position);
    const tangentVelocity = this.velocity.clone().projectOnPlane(radialUp);
    const tangentSpeed = tangentVelocity.length();
    if (tangentSpeed < 0.0001) {
      this.velocity.set(0, 0, 0);
      this.position.setLength(this.getGroundDistance(this.position));
      return;
    }

    const direction = tangentVelocity.clone().normalize();
    const rotationAxis = new THREE.Vector3().crossVectors(radialUp, direction).normalize();
    const angle = (tangentSpeed * dt) / this.getGroundDistance(this.position);
    this.position.applyAxisAngle(rotationAxis, angle).setLength(this.getGroundDistance(this.position));
    this.velocity.copy(direction.projectOnPlane(getRadialUp(this.position)).normalize().multiplyScalar(tangentSpeed));
  }

  private resolvePlanetContact(): void {
    const radialUp = getRadialUp(this.position);
    const groundDistance = this.getGroundDistance(this.position);
    const altitude = this.position.length() - groundDistance;
    if (altitude > 0) {
      return;
    }

    this.position.copy(radialUp.multiplyScalar(groundDistance));
    const radialVelocity = radialUp.dot(this.velocity);
    if (radialVelocity < 0) {
      this.velocity.addScaledVector(radialUp, -radialVelocity);
    }
    this.grounded = true;
    this.airborneJumpConsumed = false;
  }

  private updateGrounded(): void {
    if (this.airborneJumpConsumed && getRadialUp(this.position).dot(this.velocity) > 0.1) {
      this.grounded = false;
      return;
    }
    this.grounded = this.position.length() - this.getGroundDistance(this.position) <= 0.08;
  }

  private getGroundDistance(position: THREE.Vector3): number {
    return this.surfaceDistance + this.getGroundHeight(position);
  }

  private getGroundHeight(position: THREE.Vector3): number {
    let height = 0;
    for (const surface of this.options.groundSurfaces ?? []) {
      const surfaceHeight = surface.heightAt(position);
      if (surfaceHeight !== null) {
        height = Math.max(height, surfaceHeight);
      }
    }
    return height;
  }

  private syncBodyTransform(): void {
    const rotation = this.getBodyRotation(this.position);
    this.body.setNextKinematicTranslation({ x: this.position.x, y: this.position.y, z: this.position.z });
    this.body.setNextKinematicRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w });
  }

  private resolveBlockingCollisions(previousPosition: THREE.Vector3, previousVelocity: THREE.Vector3): void {
    const blockingColliderHandles = this.options.blockingColliderHandles;
    if (!blockingColliderHandles?.size) {
      return;
    }

    const rotation = this.getBodyRotation(this.position);
    const capsuleRadius = 0.32;
    const capsuleHalfHeight = Math.max(0.2, this.options.bodyCenterHeight - capsuleRadius);
    const shape = new RAPIER.Capsule(capsuleHalfHeight, capsuleRadius);
    const hit = this.rapier.world.intersectionWithShape(
      { x: this.position.x, y: this.position.y, z: this.position.z },
      { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w },
      shape,
      undefined,
      undefined,
      this.collider,
      this.body,
      collider => blockingColliderHandles.has(collider.handle),
    );

    if (!hit) {
      return;
    }

    const attemptedMove = this.position.clone().sub(previousPosition);
    this.position.copy(previousPosition);
    if (attemptedMove.lengthSq() > 0.0001) {
      const blockedDirection = attemptedMove.normalize();
      const blockedSpeed = this.velocity.dot(blockedDirection);
      if (blockedSpeed > 0) {
        this.velocity.addScaledVector(blockedDirection, -blockedSpeed);
      }
    } else {
      this.velocity.copy(previousVelocity.projectOnPlane(getRadialUp(previousPosition)));
    }
  }

  private getBodyRotation(position: THREE.Vector3): THREE.Quaternion {
    const up = getRadialUp(position);
    const forward = this.velocity.lengthSq() > 0.0001 ? this.velocity.clone().projectOnPlane(up).normalize() : new THREE.Vector3(0, 0, 1).projectOnPlane(up).normalize();
    const stableForward = forward.lengthSq() > 0.0001 ? forward : new THREE.Vector3(1, 0, 0).projectOnPlane(up).normalize();
    const right = new THREE.Vector3().crossVectors(up, stableForward).normalize();
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, stableForward));
  }
}
