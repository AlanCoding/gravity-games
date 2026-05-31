import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { PLANET_RADIUS_METERS, SURFACE_GRAVITY } from '../constants';
import { computeOrbitMetrics } from './gravity';
import { ShotPutMotion } from './shotPutMotion';

function longitudeDegrees(position: THREE.Vector3): number {
  const longitude = THREE.MathUtils.radToDeg(Math.atan2(position.z, position.x));
  return longitude < 0 ? longitude + 360 : longitude;
}

function latitudeDegrees(position: THREE.Vector3): number {
  return THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(position.y / position.length(), -1, 1)));
}

describe('ShotPutMotion', () => {
  it('settles a low-speed surface launch within a bounded region', () => {
    const radius = 0.42;
    const motion = new ShotPutMotion({
      position: new THREE.Vector3(PLANET_RADIUS_METERS + radius, 0, 0),
      velocity: new THREE.Vector3(0.9, 0, 0.08),
      radius,
      mass: 7.26,
      planetRadius: PLANET_RADIUS_METERS,
      surfaceGravity: SURFACE_GRAVITY,
      restitution: 0.42,
      friction: 0.72,
      startTime: 0,
      atmosphereHeight: 120,
      dragCoefficient: 0.028,
      restingSpeed: 0.1,
    });

    let elapsed = 0;
    while (!motion.resting && elapsed < 30) {
      motion.step(1 / 60);
      elapsed += 1 / 60;
    }

    const position = motion.getPosition();
    expect(motion.resting).toBe(true);
    expect(elapsed).toBeLessThan(30);
    expect(motion.getVelocity().length()).toBeLessThan(0.05);
    expect(position.length()).toBeCloseTo(PLANET_RADIUS_METERS + radius, 3);
    expect(longitudeDegrees(position)).toBeGreaterThanOrEqual(0);
    expect(longitudeDegrees(position)).toBeLessThan(30);
    expect(latitudeDegrees(position)).toBeGreaterThanOrEqual(-1);
    expect(latitudeDegrees(position)).toBeLessThanOrEqual(1);
  });

  it('predicts a future surface contact for a shallow launch', () => {
    const radius = 0.42;
    const motion = new ShotPutMotion({
      position: new THREE.Vector3(PLANET_RADIUS_METERS + radius + 0.05, 0, 0),
      velocity: new THREE.Vector3(1.8, 0, 0.22),
      radius,
      mass: 7.26,
      planetRadius: PLANET_RADIUS_METERS,
      surfaceGravity: SURFACE_GRAVITY,
      restitution: 0.42,
      friction: 0.72,
      startTime: 0,
      atmosphereHeight: 120,
      dragCoefficient: 0.028,
      restingSpeed: 0.1,
    });

    expect(motion.willTouchSurfaceWithin(20)).toBe(true);
  });

  it('bounces off the planet at higher impact speed', () => {
    const radius = 0.42;
    const surfaceRadius = PLANET_RADIUS_METERS + radius;
    const motion = new ShotPutMotion({
      position: new THREE.Vector3(surfaceRadius + 0.18, 0, 0),
      velocity: new THREE.Vector3(-4.4, 0, 0.18),
      radius,
      mass: 7.26,
      planetRadius: PLANET_RADIUS_METERS,
      surfaceGravity: SURFACE_GRAVITY,
      restitution: 0.42,
      friction: 0.72,
      startTime: 0,
      atmosphereHeight: 120,
      dragCoefficient: 0.028,
      restingSpeed: 0.1,
    });

    motion.step(1 / 30);

    expect(motion.bounceCount).toBeGreaterThan(0);
    expect(motion.getVelocity().dot(motion.getPosition().clone().normalize())).toBeGreaterThan(0);
  });

  it('bounces on a simple downward impact', () => {
    const radius = 0.42;
    const surfaceRadius = PLANET_RADIUS_METERS + radius;
    const motion = new ShotPutMotion({
      position: new THREE.Vector3(surfaceRadius + 0.12, 0, 0),
      velocity: new THREE.Vector3(-3.6, 0, 0),
      radius,
      mass: 7.26,
      planetRadius: PLANET_RADIUS_METERS,
      surfaceGravity: SURFACE_GRAVITY,
      restitution: 0.52,
      friction: 0.24,
      startTime: 0,
      atmosphereHeight: 120,
      dragCoefficient: 0.01,
      restingSpeed: 0.05,
    });

    let elapsed = 0;
    while (motion.bounceCount === 0 && elapsed < 2) {
      motion.step(1 / 240);
      elapsed += 1 / 240;
    }

    expect(motion.getVelocity().x).toBeGreaterThan(0);
    expect(motion.resting).toBe(false);
    expect(elapsed).toBeLessThan(2);
  });

  it('rises back above the surface after a bounce', () => {
    const radius = 0.42;
    const surfaceRadius = PLANET_RADIUS_METERS + radius;
    const motion = new ShotPutMotion({
      position: new THREE.Vector3(surfaceRadius + 0.18, 0, 0),
      velocity: new THREE.Vector3(-4.1, 0, 0),
      radius,
      mass: 7.26,
      planetRadius: PLANET_RADIUS_METERS,
      surfaceGravity: SURFACE_GRAVITY,
      restitution: 0.56,
      friction: 0.18,
      startTime: 0,
      atmosphereHeight: 120,
      dragCoefficient: 0.01,
      restingSpeed: 0.04,
    });

    let bouncedAt = -1;
    let velocityAfterBounce = 0;
    let maxAltitudeAfterBounce = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < 480; i += 1) {
      motion.step(1 / 240);
      if (bouncedAt < 0 && motion.bounceCount > 0) {
        bouncedAt = i;
        velocityAfterBounce = motion.getVelocity().x;
      }
      if (bouncedAt >= 0) {
        maxAltitudeAfterBounce = Math.max(maxAltitudeAfterBounce, motion.getAltitude());
      }
    }

    expect(bouncedAt).toBeGreaterThanOrEqual(0);
    expect(velocityAfterBounce).toBeGreaterThan(0);
    expect(maxAltitudeAfterBounce).toBeGreaterThan(0);
  });

  it('bounces off a moving sphere contact', () => {
    const radius = 0.42;
    const playerRadius = 0.78;
    const combinedRadius = radius + playerRadius;
    const motion = new ShotPutMotion({
      position: new THREE.Vector3(combinedRadius - 0.01, 0, 0),
      velocity: new THREE.Vector3(-1.8, 0, 0),
      radius,
      mass: 7.26,
      planetRadius: PLANET_RADIUS_METERS,
      surfaceGravity: SURFACE_GRAVITY,
      restitution: 0.42,
      friction: 0.72,
      startTime: 0,
    });

    const collided = motion.applySphereContact({
      center: new THREE.Vector3(),
      radius: playerRadius,
      restitution: 0.5,
      friction: 0,
      surfaceVelocity: new THREE.Vector3(0, 0, 2.2),
      bounceThreshold: 0.1,
    });

    expect(collided).toBe(true);
    expect(motion.getVelocity().x).toBeGreaterThan(0);
  });

  it('holds the initial release velocity when thrown from a moving runner', () => {
    const radius = 0.42;
    const motion = new ShotPutMotion({
      position: new THREE.Vector3(PLANET_RADIUS_METERS + radius, 0, 0),
      velocity: new THREE.Vector3(6.1, 0, 4.9),
      radius,
      mass: 7.26,
      planetRadius: PLANET_RADIUS_METERS,
      surfaceGravity: SURFACE_GRAVITY,
      restitution: 0.42,
      friction: 0.72,
      startTime: 0,
      atmosphereHeight: 120,
      dragCoefficient: 0.02,
      restingSpeed: 0.05,
    });

    expect(motion.getVelocity().length()).toBeGreaterThan(7.5);
    expect(motion.getVelocity().dot(new THREE.Vector3(1, 0, 0))).toBeGreaterThan(0);
  });

  it('bounces off another shot put', () => {
    const radius = 0.42;
    const a = new ShotPutMotion({
      position: new THREE.Vector3(radius, 0, 0),
      velocity: new THREE.Vector3(-1.6, 0, 0),
      radius,
      mass: 7.26,
      planetRadius: PLANET_RADIUS_METERS,
      surfaceGravity: SURFACE_GRAVITY,
      restitution: 0.48,
      friction: 0.12,
      startTime: 0,
    });
    const b = new ShotPutMotion({
      position: new THREE.Vector3(-radius, 0, 0),
      velocity: new THREE.Vector3(0.7, 0, 0),
      radius,
      mass: 7.26,
      planetRadius: PLANET_RADIUS_METERS,
      surfaceGravity: SURFACE_GRAVITY,
      restitution: 0.48,
      friction: 0.12,
      startTime: 0,
    });

    const collided = a.resolveSphereContact(b, { restitution: 0.48, friction: 0, bounceThreshold: 0.01 });

    expect(collided).toBe(true);
    expect(a.getVelocity().x).toBeGreaterThan(0);
    expect(b.getVelocity().x).toBeLessThan(0);
  });

  it('classifies orbit and escape launches by orbital shape rather than raw speed alone', () => {
    const radius = 0.42;
    const surfaceRadius = PLANET_RADIUS_METERS + radius;
    const mu = SURFACE_GRAVITY * PLANET_RADIUS_METERS * PLANET_RADIUS_METERS;
    const circularSpeed = Math.sqrt(mu / surfaceRadius);

    const orbitMotion = new ShotPutMotion({
      position: new THREE.Vector3(surfaceRadius + 1.5, 0, 0),
      velocity: new THREE.Vector3(0, 0, circularSpeed * 1.06),
      radius,
      mass: 7.26,
      planetRadius: PLANET_RADIUS_METERS,
      surfaceGravity: SURFACE_GRAVITY,
      restitution: 0.42,
      friction: 0.72,
      startTime: 0,
    });

    const escapeSpeed = Math.sqrt((2 * mu) / surfaceRadius);

    const escapeMotion = new ShotPutMotion({
      position: new THREE.Vector3(surfaceRadius + 1.5, 0, 0),
      velocity: new THREE.Vector3(0, 0, escapeSpeed * 1.1),
      radius,
      mass: 7.26,
      planetRadius: PLANET_RADIUS_METERS,
      surfaceGravity: SURFACE_GRAVITY,
      restitution: 0.42,
      friction: 0.72,
      startTime: 0,
    });

    expect(orbitMotion.getOrbitMetrics().boundOrbit).toBe(true);
    expect(orbitMotion.getOrbitMetrics().perigeeAltitude).toBeGreaterThan(0);
    expect(escapeMotion.getOrbitMetrics().boundOrbit).toBe(false);
  });
});

describe('computeOrbitMetrics', () => {
  it('matches the shot put orbit classification at rest altitude', () => {
    const radius = 0.42;
    const surfaceRadius = PLANET_RADIUS_METERS + radius;
    const metrics = computeOrbitMetrics({
      position: new THREE.Vector3(surfaceRadius + 5, 0, 0),
      velocity: new THREE.Vector3(0, 0, 0.2),
      planetRadius: PLANET_RADIUS_METERS,
      surfaceGravity: SURFACE_GRAVITY,
    });

    expect(metrics.boundOrbit).toBe(true);
    expect(metrics.perigeeAltitude).toBeLessThan(0);
  });
});
