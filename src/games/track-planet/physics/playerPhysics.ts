import * as THREE from 'three';
import {
  PLAYER_EFFECTIVE_MASS_KG,
  PLAYER_SPEED_FALLOFF_EXPONENT,
  PLAYER_BASELINE_TIER_ACCELERATION_MULTIPLIERS,
  PLAYER_BASELINE_TIER_REFERENCE_SPEED_MULTIPLIERS,
  POLE_VAULT_CONVERSION_SECONDS,
  POLE_VAULT_MIN_START_SPEED_METERS_PER_SECOND,
} from '../constants';
import { computeOrbitMetrics, computePlanetGravity, getRadialUp } from './gravity';
import { type PlanetBoxCollider, resolveSphereAgainstPlanetBox } from './planetCollision';

export type PlayerPhysicsInput = {
  dt: number;
  desiredTangentDirection: THREE.Vector3;
  jumpRequested: boolean;
  poleVaultHeld: boolean;
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
  poleVaulting: boolean;
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
  private poleVaultActive = false;
  private poleVaultElapsedSeconds = 0;
  private poleVaultInitialTangentSpeed = 0;
  private poleVaultInitialTangentDirection = new THREE.Vector3(0, 0, 1);
  private readonly mu: number;
  private readonly surfaceDistance: number;
  private readonly restingNormalForceLbf = 150;
  private readonly playerMassKg: number;
  private runnerTier = 0;

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

    if (!this.poleVaultActive && this.grounded && this.isOnSurface() && input.poleVaultHeld) {
      const radialUp = getRadialUp(this.position);
      const tangentVelocity = this.velocity.clone().projectOnPlane(radialUp);
      const tangentSpeed = tangentVelocity.length();
      if (tangentSpeed >= POLE_VAULT_MIN_START_SPEED_METERS_PER_SECOND) {
        this.startPoleVault(tangentVelocity);
      }
    }

    if (this.poleVaultActive) {
      if (!input.poleVaultHeld) {
        this.endPoleVault();
      } else {
        this.advancePoleVault(input.dt);
      }
    }

    if (this.poleVaultActive) {
      this.integrateAirborne(input.dt);
    } else if (this.grounded) {
      this.airborneJumpConsumed = false;
      this.position.setLength(this.getGroundDistance(this.position));
      this.velocity.projectOnPlane(getRadialUp(this.position));
      this.applyGroundMovement(input.desiredTangentDirection, input.dt);
      this.walkAlongSurface(input.dt);
      if (input.jumpRequested && (this.grounded || !this.airborneJumpConsumed)) {
        this.applyJump();
      }
    } else {
      this.integrateAirborne(input.dt);
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
      poleVaulting: this.poleVaultActive,
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

  setRunnerTier(tier: number): void {
    this.runnerTier = THREE.MathUtils.clamp(Math.round(tier), 0, 2);
  }

  applyVelocityDelta(delta: THREE.Vector3): void {
    this.velocity.add(delta);
  }

  private applyGroundMovement(desiredTangentDirection: THREE.Vector3, dt: number): void {
    const radialUp = getRadialUp(this.position);
    const tangentVelocity = this.velocity.clone().projectOnPlane(radialUp);
    const desired = desiredTangentDirection.clone().projectOnPlane(radialUp);
    this.slidingIntensity = 0;
    this.sliding = false;
    if (desired.lengthSq() < 0.0001) {
      const normalForceN = this.getNormalForceLbf() * 4.4482216152605;
      const kineticLimit = this.options.kineticFrictionCoefficient * normalForceN / Math.max(this.playerMassKg, 0.001);
      const currentSpeed = tangentVelocity.length();
      const slowedSpeed = Math.max(0, currentSpeed - kineticLimit * dt);
      this.velocity.copy(currentSpeed > 0.0001 ? tangentVelocity.setLength(slowedSpeed) : new THREE.Vector3());
      return;
    }

    const desiredDirection = desired.clone().normalize();
    const currentSpeed = tangentVelocity.length();
    const normalForceN = this.getNormalForceLbf() * 4.4482216152605;
    const staticLimit = this.options.staticFrictionCoefficient * normalForceN / Math.max(this.playerMassKg, 0.001);
    const kineticLimit = this.options.kineticFrictionCoefficient * normalForceN / Math.max(this.playerMassKg, 0.001);
    const driveAccel = this.driveAccelerationForSpeed(currentSpeed);
    const forwardSpeed = tangentVelocity.dot(desiredDirection);
    const lateralVelocity = tangentVelocity.clone().addScaledVector(desiredDirection, -forwardSpeed);
    const lateralSpeed = lateralVelocity.length();
    const accelLimited = driveAccel > staticLimit + 0.0001;
    const turnLimited = lateralSpeed > staticLimit * dt + 0.001;
    const useSliding = accelLimited || turnLimited;
    const lateralDrop = Math.min(lateralSpeed, (useSliding ? kineticLimit : staticLimit) * dt);
    const reducedLateral = lateralSpeed > 0.0001
      ? lateralVelocity.setLength(Math.max(0, lateralSpeed - lateralDrop))
      : lateralVelocity.set(0, 0, 0);
    const acceleratedForward = Math.max(0, forwardSpeed) + driveAccel * dt;
    this.velocity.copy(
      desiredDirection.clone().multiplyScalar(acceleratedForward).add(reducedLateral),
    );

    if (useSliding) {
      this.sliding = true;
      const speedSlip = THREE.MathUtils.clamp((driveAccel - staticLimit) / Math.max(staticLimit, 0.001), 0, 1);
      const turnSlipIntensity = THREE.MathUtils.clamp(lateralSpeed / Math.max(currentSpeed, 0.001), 0, 1);
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

  private startPoleVault(tangentVelocity: THREE.Vector3): void {
    const radialUp = getRadialUp(this.position);
    const tangentSpeed = tangentVelocity.length();
    this.poleVaultActive = true;
    this.poleVaultElapsedSeconds = 0;
    this.poleVaultInitialTangentSpeed = tangentSpeed;
    const fallbackAxis = Math.abs(radialUp.y) < 0.9
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(1, 0, 0);
    this.poleVaultInitialTangentDirection = tangentSpeed > 0.0001
      ? tangentVelocity.clone().normalize()
      : new THREE.Vector3().crossVectors(radialUp, fallbackAxis).normalize();
    this.grounded = false;
    this.airborneJumpConsumed = true;
    this.jumpedThisStep = true;
  }

  private advancePoleVault(dt: number): void {
    const radialUp = getRadialUp(this.position);
    const tangentVelocity = this.velocity.clone().projectOnPlane(radialUp);
    const tangentSpeed = tangentVelocity.length();
    const tangentDirection = tangentSpeed > 0.0001
      ? tangentVelocity.clone().normalize()
      : this.poleVaultInitialTangentDirection.clone().projectOnPlane(radialUp).normalize();
    if (tangentDirection.lengthSq() < 0.0001 || tangentSpeed < 0.0001) {
      this.endPoleVault();
      return;
    }

    this.poleVaultElapsedSeconds += dt;
    const progress = THREE.MathUtils.clamp(this.poleVaultElapsedSeconds / POLE_VAULT_CONVERSION_SECONDS, 0, 1);
    const targetTangentSpeed = this.poleVaultInitialTangentSpeed * (1 - progress);
    const convertedSpeed = Math.max(0, tangentSpeed - targetTangentSpeed);
    if (convertedSpeed > 0.0001) {
      this.velocity.addScaledVector(tangentDirection, -convertedSpeed);
      this.velocity.addScaledVector(radialUp, convertedSpeed);
    }
    if (progress >= 1 || targetTangentSpeed <= 0.01) {
      this.endPoleVault();
    }
  }

  private endPoleVault(): void {
    this.poleVaultActive = false;
    this.poleVaultElapsedSeconds = 0;
    this.poleVaultInitialTangentSpeed = 0;
  }

  private integrateAirborne(dt: number): void {
    this.velocity.addScaledVector(
      computePlanetGravity({
        position: this.position,
        planetRadius: this.options.planetRadius,
        surfaceGravity: this.options.surfaceGravity,
      }),
      dt,
    );
    this.position.addScaledVector(this.velocity, dt);
    this.resolvePlanetContact();
  }

  private walkAlongSurface(dt: number): void {
    const radialUp = getRadialUp(this.position);
    const tangentVelocity = this.velocity.clone().projectOnPlane(radialUp);
    const tangentSpeed = tangentVelocity.length();
    if (tangentSpeed < 0.0001) {
      this.position.setLength(this.getGroundDistance(this.position));
      return;
    }

    const direction = tangentVelocity.clone().normalize();
    const rotationAxis = new THREE.Vector3().crossVectors(radialUp, direction).normalize();
    const groundDistance = this.getGroundDistance(this.position);
    const angle = (tangentSpeed * dt) / Math.max(groundDistance, 0.001);
    this.position.applyAxisAngle(rotationAxis, angle).setLength(groundDistance);
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
    if (this.poleVaultActive) {
      this.endPoleVault();
    }
    this.sliding = false;
    this.slidingIntensity = 0;
    this.grounded = true;
    this.airborneJumpConsumed = false;
  }

  private updateGrounded(): void {
    if (this.poleVaultActive) {
      this.grounded = false;
      return;
    }
    if (this.airborneJumpConsumed && getRadialUp(this.position).dot(this.velocity) > 0.1) {
      this.grounded = false;
      return;
    }
    this.grounded = this.position.length() - this.getGroundDistance(this.position) <= 0.08;
  }

  private isOnSurface(): boolean {
    return this.position.length() - this.getGroundDistance(this.position) <= 0.015;
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
    const referenceSpeed = Math.max(
      this.options.referenceSpeed * PLAYER_BASELINE_TIER_REFERENCE_SPEED_MULTIPLIERS[this.runnerTier],
      0.001,
    );
    const falloff = Math.max(0, 1 - Math.pow(speed / referenceSpeed, PLAYER_SPEED_FALLOFF_EXPONENT));
    const accelerationMultiplier = PLAYER_BASELINE_TIER_ACCELERATION_MULTIPLIERS[this.runnerTier];
    return baseAcceleration * accelerationMultiplier * falloff;
  }
}
