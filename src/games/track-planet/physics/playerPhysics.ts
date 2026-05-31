import * as THREE from 'three';
import {
  PLAYER_EFFECTIVE_MASS_KG,
  PLAYER_SPEED_FALLOFF_EXPONENT,
} from '../constants';
import { computeOrbitMetrics, computePlanetGravity, getRadialUp } from './gravity';
import { type PlanetBoxCollider, resolveSphereAgainstPlanetBox } from './planetCollision';

export type PlayerPhysicsInput = {
  dt: number;
  desiredTangentDirection: THREE.Vector3;
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
  normalForceLbf: number;
  sliding: boolean;
  slidingIntensity: number;
  orbitalSpeed: number;
  escapeSpeed: number;
  orbitPerigeeAltitude: number;
};

export class PlayerPhysics {
  private position: THREE.Vector3;
  private velocity = new THREE.Vector3();
  private grounded = true;
  private jumpedThisStep = false;
  private airborneJumpConsumed = false;
  private sliding = false;
  private slidingIntensity = 0;
  private readonly mu: number;
  private readonly surfaceDistance: number;
  private readonly restingNormalForceLbf = 150;
  private readonly playerMassKg: number;

  constructor(
    private readonly options: {
      planetRadius: number;
      surfaceGravity: number;
      bodyCenterHeight: number;
      baselineAcceleration: number;
      referenceSpeed: number;
      staticFrictionCoefficient: number;
      kineticFrictionCoefficient: number;
      jumpSpeed: number;
      initialUp: THREE.Vector3;
      blockingVolumes?: ReadonlyArray<PlanetBoxCollider>;
      groundSurfaces?: ReadonlyArray<{ heightAt: (position: THREE.Vector3) => number | null }>;
    },
  ) {
    this.mu = options.surfaceGravity * options.planetRadius * options.planetRadius;
    this.playerMassKg = PLAYER_EFFECTIVE_MASS_KG;
    this.surfaceDistance = options.planetRadius + options.bodyCenterHeight;
    this.position = options.initialUp.clone().normalize().multiplyScalar(this.surfaceDistance);
  }

  beforePhysicsStep(input: PlayerPhysicsInput): void {
    this.jumpedThisStep = false;
    this.updateGrounded();

    if (this.grounded) {
      this.airborneJumpConsumed = false;
      this.position.setLength(this.getGroundDistance(this.position));
      this.velocity.projectOnPlane(getRadialUp(this.position));
      this.applyGroundMovement(input.desiredTangentDirection, input.dt);
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

    this.resolveBlockingCollisions();
  }

  getSnapshot(): PlayerPhysicsSnapshot {
    this.updateGrounded();
    const distance = Math.max(this.position.length(), 0.001);
    const groundHeight = this.getGroundHeight(this.position);
    const radialUp = getRadialUp(this.position);
    const tangentSpeed = this.velocity.clone().projectOnPlane(radialUp).length();
    const supportLimit = this.options.surfaceGravity * this.getGroundDistance(this.position);
    const normalForceLbf = this.grounded
      ? this.restingNormalForceLbf * THREE.MathUtils.clamp(1 - (tangentSpeed * tangentSpeed) / Math.max(supportLimit, 0.0001), 0, 1)
      : 0;
    return {
      position: this.position.clone(),
      velocity: this.velocity.clone(),
      radialUp,
      grounded: this.grounded,
      jumped: this.jumpedThisStep,
      speed: this.velocity.length(),
      altitude: distance - this.surfaceDistance,
      altitudeAboveGround: distance - this.surfaceDistance - groundHeight,
      groundHeight,
      normalForceLbf,
      sliding: this.sliding,
      slidingIntensity: this.slidingIntensity,
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

  private applyGroundMovement(desiredTangentDirection: THREE.Vector3, dt: number): void {
    const radialUp = getRadialUp(this.position);
    const tangentVelocity = this.velocity.clone().projectOnPlane(radialUp);
    const desired = desiredTangentDirection.clone().projectOnPlane(radialUp);
    this.slidingIntensity = 0;
    this.sliding = false;
    if (desired.lengthSq() < 0.0001) {
      this.velocity.copy(tangentVelocity);
      return;
    }

    const desiredDirection = desired.clone().normalize();
    const currentSpeed = tangentVelocity.length();
    const currentDirection = currentSpeed > 0.0001 ? tangentVelocity.clone().normalize() : desiredDirection.clone();
    const turnAngle = currentDirection.angleTo(desiredDirection);
    const normalForceN = this.getNormalForceLbf() * 4.4482216152605;
    const staticLimit = this.options.staticFrictionCoefficient * normalForceN / Math.max(this.playerMassKg, 0.001);
    const kineticLimit = this.options.kineticFrictionCoefficient * normalForceN / Math.max(this.playerMassKg, 0.001);
    const driveAccel = this.driveAccelerationForSpeed(currentSpeed);
    const headingSlack = currentSpeed > 0.001 ? (staticLimit * dt) / Math.max(currentSpeed, 0.001) : Math.PI;
    const turnSlip = currentSpeed > 0.001 && turnAngle > headingSlack + 0.02;
    const accelLimited = driveAccel > staticLimit + 0.0001;
    const useSliding = turnSlip || accelLimited;
    const availableAccel = Math.min(driveAccel, useSliding ? kineticLimit : staticLimit);
    this.velocity.copy(tangentVelocity.addScaledVector(desiredDirection, availableAccel * dt));

    if (useSliding) {
      this.sliding = true;
      const speedSlip = THREE.MathUtils.clamp((driveAccel - staticLimit) / Math.max(staticLimit, 0.001), 0, 1);
      const turnSlipIntensity = THREE.MathUtils.clamp((turnAngle - headingSlack) / Math.max(Math.PI / 2, 0.001), 0, 1);
      this.slidingIntensity = Math.max(speedSlip, turnSlipIntensity);
    }
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
    this.sliding = false;
    this.slidingIntensity = 0;
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

  private resolveBlockingCollisions(): void {
    const blockingVolumes = this.options.blockingVolumes;
    if (!blockingVolumes?.length) {
      return;
    }

    for (const blocker of blockingVolumes) {
      resolveSphereAgainstPlanetBox(this.position, this.velocity, 0.78, blocker, {
        restitution: blocker.restitution,
        friction: blocker.friction,
      });
    }
  }

  private getNormalForceLbf(): number {
    const radialUp = getRadialUp(this.position);
    const tangentSpeed = this.velocity.clone().projectOnPlane(radialUp).length();
    const groundDistance = this.getGroundDistance(this.position);
    const orbitalReduction = (this.playerMassKg * tangentSpeed * tangentSpeed) / Math.max(groundDistance, 0.001);
    const gravityForce = this.restingNormalForceLbf;
    return THREE.MathUtils.clamp(gravityForce - orbitalReduction / 4.4482216152605, 0, gravityForce);
  }

  private driveAccelerationForSpeed(speed: number): number {
    const baseAcceleration = this.options.baselineAcceleration;
    const referenceSpeed = Math.max(this.options.referenceSpeed, 0.001);
    const falloff = Math.max(0, 1 - Math.pow(speed / referenceSpeed, PLAYER_SPEED_FALLOFF_EXPONENT));
    return baseAcceleration * falloff;
  }
}
