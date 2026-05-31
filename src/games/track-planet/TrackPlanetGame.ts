import * as THREE from 'three';
import { type AchievementHooks, type AchievementPayload } from './achievements';
import { InputController } from '../../engine/input';
import {
  COYOTE_TIME_SECONDS,
  JUMP_BUFFER_SECONDS,
  PLANET_CIRCUMFERENCE_METERS,
  PLANET_RADIUS_METERS,
  PLAYER_CENTER_HEIGHT_METERS,
  PLAYER_HEIGHT_METERS,
  PLAYER_BASELINE_ACCELERATION_METERS_PER_SECOND_SQUARED,
  PLAYER_KINETIC_FRICTION_COEFFICIENT,
  PLAYER_RUN_REFERENCE_SPEED_METERS_PER_SECOND,
  PLAYER_STATIC_FRICTION_COEFFICIENT,
  SHADOW_MAX_ALTITUDE_METERS,
  SHOT_PUT_ORBIT_LOOKAHEAD_SECONDS,
  SHADOW_SURFACE_OFFSET_METERS,
  SURFACE_GRAVITY,
  TRACK_START_FORWARD,
  TURN_RATE,
} from './constants';
import { Pole } from './entities/Pole';
import { ShotPut } from './entities/ShotPut';
import {
  shouldAwardPlayerEscape,
  shouldAwardPlayerOrbit,
  shouldAwardShotPutEscape,
  shouldAwardShotPutOrbit,
} from './achievementRules';
import { PlayerPhysics, type PlayerPhysicsSnapshot } from './physics/playerPhysics';
import { createRampSurface } from './physics/rampSurface';
import { createBleacherColliderVolume, type PlanetBoxCollider } from './physics/planetCollision';
import { computeShotPutReleaseVelocity } from './physics/throwPhysics';
import { createTrackPlanetScene, getTrackStartUp, type TrackPlanetScene } from './scene';

export type TrackPlanetGameOptions = {
  container: HTMLElement;
  velocityDisplay: HTMLElement | null;
  orbitalDisplay: HTMLElement | null;
  throwChargeDisplay: HTMLElement | null;
  longitudeDisplay: HTMLElement | null;
  latitudeDisplay: HTMLElement | null;
  altitudeDisplay: HTMLElement | null;
  throwDisplay: HTMLElement | null;
  achievements?: AchievementHooks;
};

export class TrackPlanetGame {
  private readonly container: HTMLElement;
  private readonly velocityDisplay: HTMLElement | null;
  private readonly orbitalDisplay: HTMLElement | null;
  private readonly throwChargeDisplay: HTMLElement | null;
  private readonly longitudeDisplay: HTMLElement | null;
  private readonly latitudeDisplay: HTMLElement | null;
  private readonly altitudeDisplay: HTMLElement | null;
  private readonly throwDisplay: HTMLElement | null;
  private readonly achievements: AchievementHooks;
  private readonly input = new InputController();
  private readonly clock = new THREE.Clock();
  private readonly world: TrackPlanetScene;
  private playerPhysics: PlayerPhysics | null = null;
  private blockingVolumes: PlanetBoxCollider[] = [];
  private readonly shotPuts: ShotPut[] = [];
  private latestShotPut: ShotPut | null = null;
  private pole: Pole | null = null;
  private readonly slideSparks: Array<{ position: THREE.Vector3; velocity: THREE.Vector3; ttl: number }> = [];
  private readonly slideSparkMesh = new THREE.Points(
    new THREE.BufferGeometry(),
    new THREE.PointsMaterial({ color: 0xf7e38a, size: 0.08, transparent: true, opacity: 0.95 }),
  );
  private heading = TRACK_START_FORWARD.clone();
  private cameraPitch = 0.24;
  private cameraOrbitYaw = 0;
  private animationHandle = 0;
  private elapsed = 0;
  private lastGroundedTime = 0;
  private lastJumpPressedTime = Number.NEGATIVE_INFINITY;
  private throwCharge = 0;
  private throwWasPressed = false;
  private firstThrowFired = false;
  private tenSecondAirtimeFired = false;
  private orbitThrowFired = false;
  private bounceFiveFired = false;
  private orbitHookFired = false;
  private escapeHookFired = false;
  private readonly resizeAbortController = new AbortController();

  constructor(options: TrackPlanetGameOptions) {
    this.container = options.container;
    this.velocityDisplay = options.velocityDisplay;
    this.orbitalDisplay = options.orbitalDisplay;
    this.throwChargeDisplay = options.throwChargeDisplay;
    this.longitudeDisplay = options.longitudeDisplay;
    this.latitudeDisplay = options.latitudeDisplay;
    this.altitudeDisplay = options.altitudeDisplay;
    this.throwDisplay = options.throwDisplay;
    this.achievements = options.achievements ?? {};
    this.world = createTrackPlanetScene(this.container, PLANET_RADIUS_METERS, PLAYER_HEIGHT_METERS);
  }

  async start(): Promise<void> {
    this.input.bind();
    window.addEventListener('resize', () => this.world.resize(), { signal: this.resizeAbortController.signal });
    this.world.resize();
    this.world.scene.add(this.slideSparkMesh);
    this.blockingVolumes = [createBleacherColliderVolume(PLANET_RADIUS_METERS)];
    this.playerPhysics = new PlayerPhysics({
      planetRadius: PLANET_RADIUS_METERS,
      surfaceGravity: SURFACE_GRAVITY,
      bodyCenterHeight: PLAYER_CENTER_HEIGHT_METERS,
      baselineAcceleration: PLAYER_BASELINE_ACCELERATION_METERS_PER_SECOND_SQUARED,
      referenceSpeed: PLAYER_RUN_REFERENCE_SPEED_METERS_PER_SECOND,
      staticFrictionCoefficient: PLAYER_STATIC_FRICTION_COEFFICIENT,
      kineticFrictionCoefficient: PLAYER_KINETIC_FRICTION_COEFFICIENT,
      jumpSpeed: 1.4,
      initialUp: getTrackStartUp(PLANET_RADIUS_METERS),
      blockingVolumes: this.blockingVolumes,
      groundSurfaces: [createRampSurface(PLANET_RADIUS_METERS)],
    });
    const snapshot = this.playerPhysics.getSnapshot();
    this.updatePlayer(snapshot);
    this.updatePlayerShadow(snapshot);
    this.updateCamera(snapshot, true);
    this.updateReadout(snapshot);
    this.updateThrowChargeReadout();
    this.updateThrowReadout();
    this.container.focus();
    this.animationHandle = window.requestAnimationFrame(() => this.frame());
  }

  stop(): void {
    window.cancelAnimationFrame(this.animationHandle);
    this.input.dispose();
    this.resizeAbortController.abort();
    this.world.dispose();
  }

  private frame(): void {
    if (!this.playerPhysics) {
      return;
    }

    const dt = Math.min(this.clock.getDelta(), 1 / 30);
    this.elapsed += dt;
    const snapshotBefore = this.playerPhysics.getSnapshot();
    this.updateAim(snapshotBefore, dt);
    if (snapshotBefore.grounded) {
      this.lastGroundedTime = this.elapsed;
    }
    if (this.input.consumeJump()) {
      this.lastJumpPressedTime = this.elapsed;
    }

    const desiredTangentDirection = this.getDesiredTangentDirection(snapshotBefore);
    const jumpRequested = this.shouldJump(snapshotBefore);
    const poleVaultRequested = false;
    const wasThrowPressed = this.throwWasPressed;
    this.updateThrowCharge(dt);
    this.playerPhysics.beforePhysicsStep({
      dt,
      desiredTangentDirection,
      jumpRequested,
      poleVaultRequested,
    });
    for (const shotPut of this.shotPuts) {
      shotPut.physics.beforePhysicsStep(dt);
    }
    this.releaseThrowIfNeeded(wasThrowPressed, snapshotBefore);
    const snapshot = this.playerPhysics.getSnapshot();
    this.transportHeading(snapshotBefore.radialUp, snapshot.radialUp);
    this.resolveShotPutPlayerCollisions(snapshot);
    this.resolveShotPutShotPutCollisions();

    if (snapshot.jumped) {
      if (poleVaultRequested) {
        this.pole?.dispose();
        this.pole = null;
      }
      this.lastJumpPressedTime = Number.NEGATIVE_INFINITY;
      this.lastGroundedTime = Number.NEGATIVE_INFINITY;
      this.achievements.onJump?.(this.payload(snapshot));
    }

    this.updatePlayer(snapshot);
    this.updatePlayerShadow(snapshot);
    this.updateSlidingVfx(snapshot, dt);
    for (const shotPut of this.shotPuts) {
      shotPut.updateFromPhysics();
    }
    this.pole?.updateFromPhysics();
    this.updateCamera(snapshot);
    this.updateReadout(snapshot);
    this.updateThrowChargeReadout();
    this.updateThrowReadout();
    this.checkThrowHooks(snapshot);
    this.checkAchievementHooks(snapshot);
    this.world.rotatingObject.rotation.x += dt * 0.8;
    this.world.rotatingObject.rotation.y += dt * 1.2;
    this.world.renderer.render(this.world.scene, this.world.camera);
    this.animationHandle = window.requestAnimationFrame(() => this.frame());
  }

  private shouldJump(snapshot: PlayerPhysicsSnapshot): boolean {
    const jumpIsBuffered = this.elapsed - this.lastJumpPressedTime <= JUMP_BUFFER_SECONDS;
    const jumpIsAllowed = snapshot.grounded || this.elapsed - this.lastGroundedTime <= COYOTE_TIME_SECONDS;
    return jumpIsBuffered && jumpIsAllowed;
  }

  private updateThrowCharge(dt: number): void {
    const pressed = this.input.isPressed('KeyF');
    if (pressed) {
      this.throwCharge = Math.min(1, this.throwCharge + dt / 1.3);
    }
    if (this.input.isPressed('KeyP') && !this.pole) {
      this.spawnPole();
    }
    this.throwWasPressed = pressed;
  }

  private releaseThrowIfNeeded(wasThrowPressed: boolean, snapshot: PlayerPhysicsSnapshot): void {
    if (!wasThrowPressed || this.input.isPressed('KeyF')) {
      return;
    }
    this.throwShotPut(snapshot);
    this.throwCharge = 0;
  }

  private throwShotPut(snapshot: PlayerPhysicsSnapshot): void {
    const forward = this.heading.clone().projectOnPlane(snapshot.radialUp).normalize();
    const releasePosition = snapshot.position
      .clone()
      .addScaledVector(snapshot.radialUp, 1.2)
      .addScaledVector(forward, 1.4);
    const releaseVelocity = computeShotPutReleaseVelocity({
      playerVelocity: snapshot.velocity,
      forward,
      radialUp: snapshot.radialUp,
      charge: this.throwCharge,
    });
    const shotPut = new ShotPut({
      scene: this.world.scene,
      position: releasePosition,
      velocity: releaseVelocity,
      planetRadius: PLANET_RADIUS_METERS,
      surfaceGravity: SURFACE_GRAVITY,
      startTime: this.elapsed,
      collisionVolumes: this.blockingVolumes,
    });
    this.shotPuts.push(shotPut);
    this.latestShotPut = shotPut;
    this.firstThrowFired = true;
  }

  private spawnPole(): void {
    if (!this.playerPhysics) {
      return;
    }
    const snapshot = this.playerPhysics.getSnapshot();
    const forward = this.heading.clone().projectOnPlane(snapshot.radialUp).normalize();
    const right = new THREE.Vector3().crossVectors(snapshot.radialUp, forward).normalize();
    const position = snapshot.position.clone().addScaledVector(snapshot.radialUp, 1).addScaledVector(right, 1.6);
    const orientation = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, snapshot.radialUp, forward));
    orientation.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.55));
    this.pole = new Pole({ scene: this.world.scene, position, orientation });
  }

  private transportHeading(previousUp: THREE.Vector3, nextUp: THREE.Vector3): void {
    const rotation = new THREE.Quaternion().setFromUnitVectors(previousUp, nextUp);
    this.heading.applyQuaternion(rotation).projectOnPlane(nextUp);
    if (this.heading.lengthSq() < 0.0001) {
      this.heading.copy(new THREE.Vector3().crossVectors(nextUp, new THREE.Vector3(0, 1, 0)));
      if (this.heading.lengthSq() < 0.0001) {
        this.heading.copy(new THREE.Vector3().crossVectors(nextUp, new THREE.Vector3(1, 0, 0)));
      }
    }
    this.heading.normalize();
  }

  private updateAim(snapshot: PlayerPhysicsSnapshot, dt: number): void {
    const up = snapshot.radialUp;
    const turn = Number(this.input.isPressed('ArrowLeft')) - Number(this.input.isPressed('ArrowRight'));
    if (snapshot.grounded && turn !== 0) {
      this.heading.applyAxisAngle(up, turn * TURN_RATE * dt).projectOnPlane(up).normalize();
    }
    if (!snapshot.grounded && turn !== 0) {
      this.cameraOrbitYaw += turn * TURN_RATE * dt;
    }
    if (snapshot.grounded) {
      this.cameraOrbitYaw = THREE.MathUtils.lerp(this.cameraOrbitYaw, 0, 0.12);
    }
    if (this.input.isPressed('ArrowUp')) {
      this.cameraPitch = Math.min(1.42, this.cameraPitch + 1.4 * dt);
    }
    if (this.input.isPressed('ArrowDown')) {
      this.cameraPitch = Math.max(-1.18, this.cameraPitch - 1.4 * dt);
    }
    if (this.heading.lengthSq() < 0.1) {
      this.heading.set(1, 0, 0).projectOnPlane(up).normalize();
    }
  }

  private getDesiredTangentDirection(snapshot: PlayerPhysicsSnapshot): THREE.Vector3 {
    const up = snapshot.radialUp;
    const forward = this.heading.clone().projectOnPlane(up).normalize();
    const right = new THREE.Vector3().crossVectors(forward, up).normalize();
    const input = new THREE.Vector3();
    input.addScaledVector(forward, Number(this.input.isPressed('KeyW')) - Number(this.input.isPressed('KeyS')));
    input.addScaledVector(right, Number(this.input.isPressed('KeyD')) - Number(this.input.isPressed('KeyA')));
    if (input.lengthSq() > 1) {
      input.normalize();
    }
    return input.lengthSq() > 0 ? input.normalize() : input;
  }

  private updatePlayer(snapshot: PlayerPhysicsSnapshot): void {
    const up = snapshot.radialUp;
    const forward = this.heading.clone().projectOnPlane(up).normalize();
    this.world.player.position.copy(snapshot.position);
    this.world.player.quaternion.setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(forward, up, new THREE.Vector3().crossVectors(forward, up).normalize()),
    );
  }

  private updatePlayerShadow(snapshot: PlayerPhysicsSnapshot): void {
    const up = snapshot.radialUp;
    const forward = this.heading.clone().projectOnPlane(up).normalize();
    const right = new THREE.Vector3().crossVectors(up, forward).normalize();
    const altitudeFactor = THREE.MathUtils.clamp(snapshot.altitudeAboveGround / SHADOW_MAX_ALTITUDE_METERS, 0, 1);
    const scale = THREE.MathUtils.lerp(0.68, 2.4, altitudeFactor);

    this.world.playerShadow.position.copy(
      up.clone().multiplyScalar(PLANET_RADIUS_METERS + snapshot.groundHeight + SHADOW_SURFACE_OFFSET_METERS),
    );
    this.world.playerShadow.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, forward));
    this.world.playerShadow.scale.set(scale, scale, 1);
    this.world.playerShadow.material.opacity = THREE.MathUtils.lerp(0.62, 0.14, altitudeFactor);
    this.world.playerShadow.visible = snapshot.altitudeAboveGround < SHADOW_MAX_ALTITUDE_METERS * 1.4;
  }

  private updateCamera(snapshot: PlayerPhysicsSnapshot, immediate = false): void {
    const up = snapshot.radialUp;
    const forward = this.heading.clone().projectOnPlane(up).normalize();
    const orbitForward = forward.clone().applyAxisAngle(up, this.cameraOrbitYaw).normalize();
    const target = snapshot.position.clone().addScaledVector(up, 1.4);
    const chase = target
      .clone()
      .addScaledVector(orbitForward, -18)
      .addScaledVector(up, 10 + Math.sin(this.cameraPitch) * 12);
    if (immediate) {
      this.world.camera.position.copy(chase);
    } else {
      this.world.camera.position.lerp(chase, 0.22);
    }
    this.world.camera.up.copy(up);
    this.world.camera.lookAt(target);
  }

  private updateReadout(snapshot: PlayerPhysicsSnapshot): void {
    if (this.velocityDisplay) {
      this.velocityDisplay.textContent = `${snapshot.speed.toFixed(1)} m/s`;
    }
    if (this.orbitalDisplay) {
      this.orbitalDisplay.textContent = `orbital ${snapshot.orbitalSpeed.toFixed(1)} m/s`;
    }
    if (this.longitudeDisplay) {
      this.longitudeDisplay.textContent = `normal ${snapshot.normalForceLbf.toFixed(0)} lbf`;
    }
    if (this.latitudeDisplay) {
      this.latitudeDisplay.textContent = '';
    }
    if (this.altitudeDisplay) {
      this.altitudeDisplay.textContent = `alt ${snapshot.altitude.toFixed(1)} m`;
    }
  }

  private updateThrowReadout(): void {
    if (!this.throwDisplay) {
      return;
    }
    const shotPut = this.latestShotPut;
    if (!shotPut) {
      this.throwDisplay.textContent = 'throw stats';
      return;
    }
    const airtime = this.elapsed - shotPut.physics.startTime;
    this.throwDisplay.textContent = `throw ${shotPut.physics.getVelocity().length().toFixed(1)} m/s ${airtime.toFixed(1)}s max ${shotPut.physics.maxAltitude.toFixed(1)}m dist ${shotPut.physics.getSurfaceDistance().toFixed(1)}m`;
  }

  private updateThrowChargeReadout(): void {
    if (!this.throwChargeDisplay) {
      return;
    }
    this.throwChargeDisplay.textContent = `throw charge ${(this.throwCharge * 100).toFixed(0)}%`;
  }

  private updateSlidingVfx(snapshot: PlayerPhysicsSnapshot, dt: number): void {
    const up = snapshot.radialUp;
    const forward = this.heading.clone().projectOnPlane(up).normalize();
    const right = new THREE.Vector3().crossVectors(forward, up).normalize();
    const footBase = snapshot.position.clone().addScaledVector(up, -0.92);

    if (snapshot.sliding && snapshot.grounded) {
      const slipDirection = snapshot.velocity.clone().projectOnPlane(up);
      if (slipDirection.lengthSq() > 0.000001) {
        slipDirection.normalize();
      } else {
        slipDirection.copy(forward).negate();
      }

      const sparkCount = 2 + Math.round(snapshot.slidingIntensity * 4);
      for (let i = 0; i < sparkCount; i += 1) {
        const lateral = (Math.random() - 0.5) * 0.55;
        const offset = right.clone().multiplyScalar(lateral);
        const position = footBase.clone().add(offset).addScaledVector(up, 0.08 + Math.random() * 0.05);
        const velocity = slipDirection
          .clone()
          .multiplyScalar(2.8 + Math.random() * 2.2)
          .addScaledVector(up, 0.9 + Math.random() * 0.7)
          .addScaledVector(right, (Math.random() - 0.5) * 0.7);
        this.slideSparks.push({ position, velocity, ttl: 0.42 + Math.random() * 0.2 });
      }
    }

    for (const spark of this.slideSparks) {
      spark.ttl -= dt;
      spark.velocity.addScaledVector(up, -6.5 * dt);
      spark.position.addScaledVector(spark.velocity, dt);
      spark.velocity.multiplyScalar(Math.max(0, 1 - 3.4 * dt));
    }

    while (this.slideSparks.length && this.slideSparks[0].ttl <= 0) {
      this.slideSparks.shift();
    }

    const positions = new Float32Array(this.slideSparks.length * 3);
    this.slideSparks.forEach((spark, index) => {
      positions[index * 3] = spark.position.x;
      positions[index * 3 + 1] = spark.position.y;
      positions[index * 3 + 2] = spark.position.z;
    });
    this.slideSparkMesh.geometry.dispose();
    this.slideSparkMesh.geometry = new THREE.BufferGeometry();
    this.slideSparkMesh.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = this.slideSparkMesh.material as THREE.PointsMaterial;
    material.opacity = this.slideSparks.length > 0 ? 0.95 : 0;
    this.slideSparkMesh.visible = this.slideSparks.length > 0;
  }

  private resolveShotPutPlayerCollisions(snapshot: PlayerPhysicsSnapshot): void {
    const playerCollisionRadius = 0.78;
    for (const shotPut of this.shotPuts) {
      shotPut.physics.applySphereContact({
        center: snapshot.position,
        radius: playerCollisionRadius,
        restitution: 0.46,
        friction: 0.35,
        surfaceVelocity: snapshot.velocity,
        bounceThreshold: 0.12,
      });
    }
  }

  private resolveShotPutShotPutCollisions(): void {
    for (let i = 0; i < this.shotPuts.length; i += 1) {
      for (let j = i + 1; j < this.shotPuts.length; j += 1) {
        this.shotPuts[i].physics.resolveSphereContact(this.shotPuts[j].physics);
      }
    }
  }

  private checkThrowHooks(snapshot: PlayerPhysicsSnapshot): void {
    let firstThrowSeen = false;
    for (const shotPut of this.shotPuts) {
      if (!firstThrowSeen) {
        firstThrowSeen = true;
        if (this.firstThrowFired) {
          this.firstThrowFired = false;
          console.info('Track Planet event: first throw');
        }
      }

      const airtime = this.elapsed - shotPut.physics.startTime;
      if (!this.tenSecondAirtimeFired && airtime >= 10) {
        this.tenSecondAirtimeFired = true;
        console.info('Track Planet event: 10 second airtime');
      }
      if (!this.orbitThrowFired && shotPut.physics.getSurfaceDistance() >= PLANET_CIRCUMFERENCE_METERS) {
        this.orbitThrowFired = true;
        console.info('Track Planet event: complete one orbit throw');
      }

      const orbitMetrics = shotPut.physics.getOrbitMetrics();
      if (!shotPut.physics.orbitAchievementFired && shouldAwardShotPutOrbit({
        boundOrbit: orbitMetrics.boundOrbit,
        perigeeDistance: orbitMetrics.perigeeDistance,
        minimumPerigeeDistance: PLANET_RADIUS_METERS + 0.42,
        hasTouchedSurface: shotPut.physics.hasTouchedSurface,
      }) && !shotPut.physics.willTouchSurfaceWithin(SHOT_PUT_ORBIT_LOOKAHEAD_SECONDS)) {
        shotPut.physics.orbitAchievementFired = true;
        this.achievements.onShotPutOrbitReached?.(this.payload(snapshot, orbitMetrics.perigeeAltitude));
      }
      if (!shotPut.physics.escapeAchievementFired && shouldAwardShotPutEscape({
        boundOrbit: orbitMetrics.boundOrbit,
        hasTouchedSurface: shotPut.physics.hasTouchedSurface,
      })) {
        shotPut.physics.escapeAchievementFired = true;
        this.achievements.onShotPutEscapeReached?.(this.payload(snapshot, orbitMetrics.perigeeAltitude));
      }
      if (!this.bounceFiveFired && shotPut.physics.bounceCount >= 5) {
        this.bounceFiveFired = true;
        console.info('Track Planet event: bounce 5 times');
      }
    }
  }

  private checkAchievementHooks(snapshot: PlayerPhysicsSnapshot): void {
    if (!this.orbitHookFired && shouldAwardPlayerOrbit(snapshot)) {
      this.orbitHookFired = true;
      this.achievements.onPlayerOrbitReached?.(this.payload(snapshot, snapshot.orbitPerigeeAltitude));
    }
    if (!this.escapeHookFired && shouldAwardPlayerEscape(snapshot)) {
      this.escapeHookFired = true;
      this.achievements.onPlayerEscapeReached?.(this.payload(snapshot, snapshot.orbitPerigeeAltitude));
    }
  }

  private payload(snapshot: PlayerPhysicsSnapshot, orbitPerigeeAltitude?: number): AchievementPayload {
    return {
      speed: snapshot.speed,
      altitude: snapshot.altitude,
      elapsed: this.elapsed,
      orbitPerigeeAltitude,
    };
  }
}
