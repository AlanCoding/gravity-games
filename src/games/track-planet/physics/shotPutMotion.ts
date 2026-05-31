import * as THREE from 'three';
import { computeOrbitMetrics } from './gravity';

export type ShotPutMotionOptions = {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  radius: number;
  mass: number;
  planetRadius: number;
  surfaceGravity: number;
  restitution: number;
  friction: number;
  startTime: number;
  atmosphereHeight?: number;
  dragCoefficient?: number;
  restingSpeed?: number;
};

export type ShotPutSurfaceContact = {
  normal: THREE.Vector3;
  restitution?: number;
  friction?: number;
};

export type ShotPutSphereContact = {
  center: THREE.Vector3;
  radius: number;
  restitution?: number;
  friction?: number;
  surfaceVelocity?: THREE.Vector3;
  bounceThreshold?: number;
};

export type ShotPutCollisionOptions = {
  restitution?: number;
  friction?: number;
  bounceThreshold?: number;
};

export class ShotPutMotion {
  readonly startUp: THREE.Vector3;
  readonly startTime: number;

  position: THREE.Vector3;
  velocity: THREE.Vector3;

  maxAltitude = 0;
  bounceCount = 0;
  orbitAchievementFired = false;
  escapeAchievementFired = false;
  resting = false;
  hasTouchedSurface = false;

  private touchingSurface = false;

  constructor(private readonly options: ShotPutMotionOptions) {
    this.position = options.position.clone();
    this.velocity = options.velocity.clone();
    this.startUp = options.position.clone().normalize();
    this.startTime = options.startTime;
    this.maxAltitude = this.getAltitude();
  }

  step(dt: number): void {
    if (this.resting) {
      this.maxAltitude = Math.max(this.maxAltitude, this.getAltitude());
      return;
    }

    let remaining = dt;
    const maxStep = 1 / 240;
    while (remaining > 0) {
      const step = Math.min(maxStep, remaining);
      const previousPosition = this.position.clone();
      this.applyPlanetGravity(step);
      this.applyAtmosphericDrag(step);
      this.position.addScaledVector(this.velocity, step);
      this.resolvePlanetContact(previousPosition, step);
      this.maxAltitude = Math.max(this.maxAltitude, this.getAltitude());
      if (this.resting) {
        break;
      }
      remaining -= step;
    }
  }

  applyContact(contact: ShotPutSurfaceContact): void {
    this.applySurfaceContact(contact.normal, {
      restitution: contact.restitution,
      friction: contact.friction,
      surfaceVelocity: new THREE.Vector3(),
      countBounce: false,
      bounceThreshold: 0,
    });
  }

  applySphereContact(contact: ShotPutSphereContact): boolean {
    const toShotPut = this.position.clone().sub(contact.center);
    const combinedRadius = this.options.radius + contact.radius;
    const distance = toShotPut.length();
    if (distance > combinedRadius && distance > 0.000001) {
      return false;
    }

    const normal = distance > 0.000001 ? toShotPut.normalize() : this.startUp.clone();
    const contactPosition = contact.center.clone().addScaledVector(normal, combinedRadius);
    this.position.copy(contactPosition);
    this.applySurfaceContact(normal, {
      restitution: contact.restitution,
      friction: contact.friction,
      surfaceVelocity: contact.surfaceVelocity ?? new THREE.Vector3(),
      countBounce: false,
      bounceThreshold: contact.bounceThreshold ?? 0.1,
    });
    return true;
  }

  resolveSphereContact(other: ShotPutMotion, options: ShotPutCollisionOptions = {}): boolean {
    const offset = this.position.clone().sub(other.position);
    const distance = offset.length();
    const combinedRadius = this.options.radius + other.options.radius;
    if (distance > combinedRadius && distance > 0.000001) {
      return false;
    }

    const normal = distance > 0.000001 ? offset.normalize() : this.startUp.clone();
    const penetration = Math.max(0, combinedRadius - distance);
    if (penetration > 0) {
      const correction = normal.clone().multiplyScalar(penetration / 2 + 0.0005);
      this.position.add(correction);
      other.position.addScaledVector(correction, -1);
    }

    const restitution = options.restitution ?? Math.min(this.options.restitution, other.options.restitution);
    const friction = options.friction ?? Math.min(this.options.friction, other.options.friction);
    const relativeVelocity = this.velocity.clone().sub(other.velocity);
    const normalSpeed = relativeVelocity.dot(normal);
    const impactSpeed = Math.max(0, -normalSpeed);
    const bounceThreshold = options.bounceThreshold ?? 0.08;
    const wasTouchingA = this.touchingSurface;
    const wasTouchingB = other.touchingSurface;

    if (impactSpeed < bounceThreshold) {
      return true;
    }

    const invMassA = 1 / Math.max(this.options.mass, 0.001);
    const invMassB = 1 / Math.max(other.options.mass, 0.001);
    const impulseMagnitude = -(1 + restitution) * normalSpeed / Math.max(invMassA + invMassB, 0.000001);
    const impulse = normal.clone().multiplyScalar(impulseMagnitude);
    this.velocity.addScaledVector(impulse, invMassA);
    other.velocity.addScaledVector(impulse, -invMassB);

    const tangentA = this.velocity.clone().addScaledVector(normal, -this.velocity.dot(normal));
    const tangentB = other.velocity.clone().addScaledVector(normal, -other.velocity.dot(normal));
    const frictionDrop = friction * 0.02;
    if (tangentA.lengthSq() > 0.000001) {
      tangentA.setLength(Math.max(0, tangentA.length() - frictionDrop));
      this.velocity.copy(tangentA.addScaledVector(normal, this.velocity.dot(normal)));
    }
    if (tangentB.lengthSq() > 0.000001) {
      tangentB.setLength(Math.max(0, tangentB.length() - frictionDrop));
      other.velocity.copy(tangentB.addScaledVector(normal, other.velocity.dot(normal)));
    }

    this.touchingSurface = false;
    other.touchingSurface = false;
    this.resting = false;
    other.resting = false;
    this.hasTouchedSurface = true;
    other.hasTouchedSurface = true;
    if (!wasTouchingA) {
      this.bounceCount += 1;
    }
    if (!wasTouchingB) {
      other.bounceCount += 1;
    }
    return true;
  }

  getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  getVelocity(): THREE.Vector3 {
    return this.velocity.clone();
  }

  getAltitude(): number {
    return this.position.length() - this.options.planetRadius - this.options.radius;
  }

  getSurfaceDistance(): number {
    const currentUp = this.position.clone().normalize();
    const angle = Math.acos(THREE.MathUtils.clamp(this.startUp.dot(currentUp), -1, 1));
    return angle * this.options.planetRadius;
  }

  getOrbitMetrics(): ReturnType<typeof computeOrbitMetrics> {
    return computeOrbitMetrics({
      position: this.position,
      velocity: this.velocity,
      planetRadius: this.options.planetRadius,
      surfaceGravity: this.options.surfaceGravity,
    });
  }

  private applyPlanetGravity(dt: number): void {
    const fromCenter = this.position.clone();
    const distance = Math.max(fromCenter.length(), this.options.planetRadius + this.options.radius * 0.9);
    const gravityDirection = fromCenter.lengthSq() > 0.000001 ? fromCenter.normalize() : this.startUp.clone();
    const mu = this.options.surfaceGravity * this.options.planetRadius * this.options.planetRadius;
    const gravity = gravityDirection.multiplyScalar(-mu / (distance * distance));
    this.velocity.addScaledVector(gravity, dt);
  }

  private applyAtmosphericDrag(dt: number): void {
    const speed = this.velocity.length();
    if (speed < 0.001) {
      return;
    }

    const altitude = Math.max(0, this.getAltitude());
    const atmosphereHeight = this.options.atmosphereHeight ?? 120;
    const atmosphereFactor = Math.pow(THREE.MathUtils.clamp(1 - altitude / atmosphereHeight, 0, 1), 2);
    if (atmosphereFactor <= 0) {
      return;
    }

    const dragCoefficient = this.options.dragCoefficient ?? 0.02;
    const dragAccel = dragCoefficient * atmosphereFactor * speed * speed / Math.max(this.options.mass, 0.001);
    this.velocity.addScaledVector(this.velocity.clone().normalize(), -dragAccel * dt);
  }

  private resolvePlanetContact(previousPosition: THREE.Vector3, dt: number): void {
    const surfaceDistance = this.options.planetRadius + this.options.radius;
    const distance = this.position.length();
    const contactBand = 0.08;
    const previousDistance = previousPosition.length();
    const intersectsSurface = this.segmentIntersectsSurface(previousPosition, this.position, surfaceDistance);
    if (!intersectsSurface && distance > surfaceDistance + contactBand && previousDistance > surfaceDistance + contactBand) {
      this.touchingSurface = false;
      return;
    }

    const contactPosition = intersectsSurface ?? (
      this.position.lengthSq() > 0.000001
        ? this.position.clone().normalize().multiplyScalar(surfaceDistance)
        : new THREE.Vector3(0, surfaceDistance, 0)
    );
    const normal = contactPosition.clone().normalize();
    this.position.copy(contactPosition);

    const radialVelocity = this.velocity.dot(normal);
    const tangentialVelocity = this.velocity.clone().addScaledVector(normal, -radialVelocity);
    const gravityMagnitude = this.surfaceGravityMagnitude(this.position);
    const surfaceFriction = this.options.friction * gravityMagnitude * dt;
    const restThreshold = this.options.restingSpeed ?? 0.025;
    const bounceThreshold = 0.0;

    const impactSpeed = Math.max(0, -radialVelocity);
    const tangentialSpeed = tangentialVelocity.length();
    if (tangentialSpeed <= surfaceFriction && impactSpeed <= restThreshold) {
      this.velocity.set(0, 0, 0);
      if (!this.touchingSurface) {
        this.bounceCount += 1;
      }
      this.touchingSurface = true;
      this.hasTouchedSurface = true;
      this.resting = true;
      return;
    }

    const reducedTangentialVelocity = tangentialVelocity.clone();
    if (tangentialSpeed > 0.000001) {
      const reducedTangentSpeed = Math.max(0, tangentialSpeed - surfaceFriction);
      reducedTangentialVelocity.setLength(reducedTangentSpeed);
    }

    this.velocity.copy(reducedTangentialVelocity);
    if (impactSpeed > bounceThreshold) {
      const reboundSpeed = Math.max(impactSpeed * this.options.restitution, 0.72);
      this.velocity.addScaledVector(normal, reboundSpeed);
      this.position.addScaledVector(normal, 0.05);
    }

    const radialAfterBounce = this.velocity.dot(normal);
    if (radialAfterBounce < 0) {
      this.velocity.addScaledVector(normal, -radialAfterBounce);
    }
    if (!this.touchingSurface) {
      this.bounceCount += 1;
    }
    this.touchingSurface = true;
    this.hasTouchedSurface = true;
    this.resting = false;
  }

  private segmentIntersectsSurface(start: THREE.Vector3, end: THREE.Vector3, surfaceDistance: number): THREE.Vector3 | null {
    const delta = end.clone().sub(start);
    const a = delta.lengthSq();
    if (a < 0.0000001) {
      return null;
    }

    const b = 2 * start.dot(delta);
    const c = start.lengthSq() - surfaceDistance * surfaceDistance;
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) {
      return null;
    }

    const sqrtDiscriminant = Math.sqrt(discriminant);
    const t0 = (-b - sqrtDiscriminant) / (2 * a);
    const t1 = (-b + sqrtDiscriminant) / (2 * a);
    const t = [t0, t1].find(value => value >= 0 && value <= 1);
    if (t === undefined) {
      return null;
    }

    return start.clone().addScaledVector(delta, t);
  }

  private surfaceGravityMagnitude(position: THREE.Vector3): number {
    const distance = Math.max(position.length(), this.options.planetRadius + this.options.radius);
    const mu = this.options.surfaceGravity * this.options.planetRadius * this.options.planetRadius;
    return mu / (distance * distance);
  }

  private applySurfaceContact(
    normal: THREE.Vector3,
    options: {
      restitution?: number;
      friction?: number;
      surfaceVelocity?: THREE.Vector3;
      countBounce?: boolean;
      bounceThreshold?: number;
    },
  ): void {
    if (normal.lengthSq() < 0.000001) {
      return;
    }
    normal.normalize();

    const restitution = options.restitution ?? this.options.restitution;
    const friction = options.friction ?? this.options.friction;
    const surfaceVelocity = options.surfaceVelocity ?? new THREE.Vector3();
    const relativeVelocity = this.velocity.clone().sub(surfaceVelocity);
    const normalSpeed = relativeVelocity.dot(normal);
    const bounceThreshold = options.bounceThreshold ?? 0.1;
    const impactSpeed = Math.max(0, -normalSpeed);

    const tangentVelocity = relativeVelocity.clone().addScaledVector(normal, -normalSpeed);
    const tangentSpeed = tangentVelocity.length();
    if (tangentSpeed > 0.000001) {
      const tangentLoss = friction * this.surfaceGravityMagnitude(this.position) * 0.08;
      const reducedSpeed = Math.max(0, tangentSpeed - tangentLoss);
      tangentVelocity.setLength(reducedSpeed);
    }

    if (impactSpeed > bounceThreshold) {
      relativeVelocity.copy(tangentVelocity).addScaledVector(normal, impactSpeed * restitution);
    } else {
      relativeVelocity.copy(tangentVelocity);
      if (impactSpeed > 0) {
        relativeVelocity.addScaledVector(normal, 0.01);
      }
    }

    this.velocity.copy(relativeVelocity.add(surfaceVelocity));
    this.touchingSurface = true;
  }
}
