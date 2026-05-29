import * as THREE from 'three';
import { type AchievementHooks, type AchievementPayload } from './achievements';
import { InputController } from '../../engine/input';
import { RAPIER, RapierPhysicsWorld } from '../../engine/physics/rapierWorld';
import {
  COYOTE_TIME_SECONDS,
  JUMP_BUFFER_SECONDS,
  PLANET_CIRCUMFERENCE_METERS,
  PLANET_RADIUS_METERS,
  PHYSICS_DEBUG_ENABLED,
  PLAYER_CENTER_HEIGHT_METERS,
  PLAYER_HEIGHT_METERS,
  SHADOW_MAX_ALTITUDE_METERS,
  SHADOW_SURFACE_OFFSET_METERS,
  SURFACE_GRAVITY,
  TRACK_START_FORWARD,
  TURN_RATE,
  WALK_SPEED,
} from './constants';
import { Pole } from './entities/Pole';
import { ShotPut } from './entities/ShotPut';
import { PlayerPhysics, type PlayerPhysicsSnapshot } from './physics/playerPhysics';
import { createRampSurface } from './physics/rampSurface';
import { createWorldPropColliders } from './physics/worldColliders';
import { createTrackPlanetScene, getTrackStartUp, type TrackPlanetScene } from './scene';

export type TrackPlanetGameOptions = {
  container: HTMLElement;
  velocityDisplay: HTMLElement | null;
  orbitalDisplay: HTMLElement | null;
  escapeDisplay: HTMLElement | null;
  coordinateDisplay: HTMLElement | null;
  throwDisplay: HTMLElement | null;
  achievements?: AchievementHooks;
};

export class TrackPlanetGame {
  private readonly container: HTMLElement;
  private readonly velocityDisplay: HTMLElement | null;
  private readonly orbitalDisplay: HTMLElement | null;
  private readonly escapeDisplay: HTMLElement | null;
  private readonly coordinateDisplay: HTMLElement | null;
  private readonly throwDisplay: HTMLElement | null;
  private readonly achievements: AchievementHooks;
  private readonly input = new InputController();
  private readonly clock = new THREE.Clock();
  private readonly world: TrackPlanetScene;
  private rapier: RapierPhysicsWorld | null = null;
  private playerPhysics: PlayerPhysics | null = null;
  private planetCollider: RAPIER.Collider | null = null;
  private blockingColliderHandles = new Set<number>();
  private shotPut: ShotPut | null = null;
  private pole: Pole | null = null;
  private heading = TRACK_START_FORWARD.clone();
  private cameraPitch = 0.24;
  private animationHandle = 0;
  private elapsed = 0;
  private lastGroundedTime = 0;
  private lastJumpPressedTime = Number.NEGATIVE_INFINITY;
  private throwCharge = 0;
  private throwWasPressed = false;
  private firstThrowFired = false;
  private tenSecondAirtimeFired = false;
  private orbitThrowFired = false;
  private escapeThrowFired = false;
  private bounceFiveFired = false;
  private orbitHookFired = false;
  private escapeHookFired = false;
  private readonly resizeAbortController = new AbortController();

  constructor(options: TrackPlanetGameOptions) {
    this.container = options.container;
    this.velocityDisplay = options.velocityDisplay;
    this.orbitalDisplay = options.orbitalDisplay;
    this.escapeDisplay = options.escapeDisplay;
    this.coordinateDisplay = options.coordinateDisplay;
    this.throwDisplay = options.throwDisplay;
    this.achievements = options.achievements ?? {};
    this.world = createTrackPlanetScene(this.container, PLANET_RADIUS_METERS, PLAYER_HEIGHT_METERS);
  }

  async start(): Promise<void> {
    this.input.bind();
    window.addEventListener('resize', () => this.world.resize(), { signal: this.resizeAbortController.signal });
    this.world.resize();
    this.rapier = await RapierPhysicsWorld.create({ debugEnabled: PHYSICS_DEBUG_ENABLED });
    this.planetCollider = this.rapier.world.createCollider(
      RAPIER.ColliderDesc.ball(PLANET_RADIUS_METERS).setFriction(0.95).setRestitution(0.42),
    );
    this.blockingColliderHandles = createWorldPropColliders(this.rapier, PLANET_RADIUS_METERS);
    this.playerPhysics = new PlayerPhysics(this.rapier, {
      planetRadius: PLANET_RADIUS_METERS,
      surfaceGravity: SURFACE_GRAVITY,
      bodyCenterHeight: PLAYER_CENTER_HEIGHT_METERS,
      tangentAcceleration: 4.2,
      groundedFriction: 2.6,
      jumpSpeed: 1.4,
      initialUp: getTrackStartUp(PLANET_RADIUS_METERS),
      blockingColliderHandles: this.blockingColliderHandles,
      groundSurfaces: [createRampSurface(PLANET_RADIUS_METERS)],
    });
    const snapshot = this.playerPhysics.getSnapshot();
    this.updatePlayer(snapshot);
    this.updatePlayerShadow(snapshot);
    this.updateCamera(snapshot, true);
    this.updateReadout(snapshot);
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
    if (!this.rapier || !this.playerPhysics) {
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

    const desiredTangentVelocity = this.getDesiredTangentVelocity(snapshotBefore);
    const jumpRequested = this.shouldJump(snapshotBefore);
    const wasThrowPressed = this.throwWasPressed;
    this.updateThrowCharge(dt);
    this.rapier.step(dt, fixedDt => {
      this.playerPhysics?.beforePhysicsStep({
        dt: fixedDt,
        desiredTangentVelocity,
        jumpRequested,
      });
      this.shotPut?.physics.beforePhysicsStep();
      this.applyPoleGravity();
    });
    this.handleCollisionEvents();
    this.rapier.updateDebugLines(this.world.scene);
    this.releaseThrowIfNeeded(wasThrowPressed, snapshotBefore);
    const snapshot = this.playerPhysics.getSnapshot();
    this.transportHeading(snapshotBefore.radialUp, snapshot.radialUp);

    if (snapshot.jumped) {
      this.lastJumpPressedTime = Number.NEGATIVE_INFINITY;
      this.lastGroundedTime = Number.NEGATIVE_INFINITY;
      this.achievements.onJump?.(this.payload(snapshot));
    }

    this.updatePlayer(snapshot);
    this.updatePlayerShadow(snapshot);
    this.shotPut?.updateFromPhysics();
    this.pole?.updateFromPhysics();
    this.updateCamera(snapshot);
    this.updateReadout(snapshot);
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
    if (!this.rapier || !wasThrowPressed || this.input.isPressed('KeyF')) {
      return;
    }
    this.throwShotPut(snapshot);
    this.throwCharge = 0;
  }

  private throwShotPut(snapshot: PlayerPhysicsSnapshot): void {
    if (!this.rapier) {
      return;
    }
    const forward = this.heading.clone().projectOnPlane(snapshot.radialUp).normalize();
    const speed = THREE.MathUtils.lerp(8, 23, this.throwCharge);
    const releasePosition = snapshot.position
      .clone()
      .addScaledVector(snapshot.radialUp, 1.2)
      .addScaledVector(forward, 1.4);
    const releaseVelocity = snapshot.velocity.clone().addScaledVector(forward, speed).addScaledVector(snapshot.radialUp, speed * 0.38);
    this.shotPut = new ShotPut({
      scene: this.world.scene,
      rapier: this.rapier,
      position: releasePosition,
      velocity: releaseVelocity,
      planetRadius: PLANET_RADIUS_METERS,
      surfaceGravity: SURFACE_GRAVITY,
      startTime: this.elapsed,
    });
    this.firstThrowFired = true;
  }

  private spawnPole(): void {
    if (!this.rapier || !this.playerPhysics) {
      return;
    }
    const snapshot = this.playerPhysics.getSnapshot();
    const forward = this.heading.clone().projectOnPlane(snapshot.radialUp).normalize();
    const right = new THREE.Vector3().crossVectors(snapshot.radialUp, forward).normalize();
    const position = snapshot.position.clone().addScaledVector(snapshot.radialUp, 1).addScaledVector(right, 1.6);
    const orientation = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, snapshot.radialUp, forward));
    this.pole = new Pole({ scene: this.world.scene, rapier: this.rapier, position, orientation });
  }

  private applyPoleGravity(): void {
    if (!this.pole) {
      return;
    }
    const position = this.pole.body.translation();
    const vector = new THREE.Vector3(position.x, position.y, position.z);
    const gravity = vector
      .clone()
      .normalize()
      .multiplyScalar((-SURFACE_GRAVITY * PLANET_RADIUS_METERS * PLANET_RADIUS_METERS) / Math.max(vector.lengthSq(), 0.001));
    this.pole.body.addForce(
      { x: gravity.x * this.pole.body.mass(), y: gravity.y * this.pole.body.mass(), z: gravity.z * this.pole.body.mass() },
      true,
    );
  }

  private handleCollisionEvents(): void {
    if (!this.rapier || !this.planetCollider || !this.shotPut) {
      return;
    }
    const shotCollider = this.shotPut.physics.collider;
    for (const event of this.rapier.getCollisionEvents()) {
      if (!event.started) {
        continue;
      }
      const hitPlanet =
        (event.colliderA === shotCollider.handle && event.colliderB === this.planetCollider.handle) ||
        (event.colliderB === shotCollider.handle && event.colliderA === this.planetCollider.handle);
      if (hitPlanet) {
        this.shotPut.physics.bounceCount += 1;
      }
    }
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
    if (turn !== 0) {
      this.heading.applyAxisAngle(up, turn * TURN_RATE * dt).projectOnPlane(up).normalize();
    }
    if (this.input.isPressed('ArrowUp')) {
      this.cameraPitch = Math.min(0.78, this.cameraPitch + 1.4 * dt);
    }
    if (this.input.isPressed('ArrowDown')) {
      this.cameraPitch = Math.max(-0.2, this.cameraPitch - 1.4 * dt);
    }
    if (this.heading.lengthSq() < 0.1) {
      this.heading.set(1, 0, 0).projectOnPlane(up).normalize();
    }
  }

  private getDesiredTangentVelocity(snapshot: PlayerPhysicsSnapshot): THREE.Vector3 {
    const up = snapshot.radialUp;
    const forward = this.heading.clone().projectOnPlane(up).normalize();
    const right = new THREE.Vector3().crossVectors(forward, up).normalize();
    const input = new THREE.Vector3();
    input.addScaledVector(forward, Number(this.input.isPressed('KeyW')) - Number(this.input.isPressed('KeyS')));
    input.addScaledVector(right, Number(this.input.isPressed('KeyD')) - Number(this.input.isPressed('KeyA')));
    if (input.lengthSq() > 1) {
      input.normalize();
    }
    return input.multiplyScalar(WALK_SPEED);
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
    const target = snapshot.position.clone().addScaledVector(up, 1.4);
    const chase = target
      .clone()
      .addScaledVector(forward, -18)
      .addScaledVector(up, 10 + Math.sin(this.cameraPitch) * 12);
    if (immediate) {
      this.world.camera.position.copy(chase);
    } else {
      this.world.camera.position.lerp(chase, 0.22);
    }
    this.world.camera.up.copy(up);
    this.world.camera.lookAt(target.clone().addScaledVector(forward, 12));
  }

  private updateReadout(snapshot: PlayerPhysicsSnapshot): void {
    if (this.velocityDisplay) {
      this.velocityDisplay.textContent = `${snapshot.speed.toFixed(1)} m/s`;
    }
    if (this.orbitalDisplay) {
      this.orbitalDisplay.textContent = `orbital ${snapshot.orbitalSpeed.toFixed(1)} m/s`;
    }
    if (this.escapeDisplay) {
      this.escapeDisplay.textContent = `escape ${snapshot.escapeSpeed.toFixed(1)} m/s`;
    }
    if (this.coordinateDisplay) {
      const coordinates = this.getPlanetCoordinates(snapshot);
      this.coordinateDisplay.textContent = `lon ${coordinates.longitude.toFixed(1)} lat ${coordinates.latitude.toFixed(1)} alt ${coordinates.altitude.toFixed(1)} m`;
    }
  }

  private updateThrowReadout(): void {
    if (!this.throwDisplay) {
      return;
    }
    if (!this.shotPut) {
      this.throwDisplay.textContent = `throw charge ${(this.throwCharge * 100).toFixed(0)}%`;
      return;
    }
    const airtime = this.elapsed - this.shotPut.physics.startTime;
    this.throwDisplay.textContent = `throw ${this.shotPut.physics.getVelocity().length().toFixed(1)} m/s ${airtime.toFixed(1)}s max ${this.shotPut.physics.maxAltitude.toFixed(1)}m dist ${this.shotPut.physics.getSurfaceDistance().toFixed(1)}m`;
  }

  private getPlanetCoordinates(snapshot: PlayerPhysicsSnapshot): { longitude: number; latitude: number; altitude: number } {
    const up = snapshot.radialUp;
    const longitude = THREE.MathUtils.radToDeg(Math.atan2(up.z, up.x));
    const latitude = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(up.y, -1, 1)));
    return {
      longitude: longitude < 0 ? longitude + 360 : longitude,
      latitude,
      altitude: snapshot.altitude,
    };
  }

  private checkThrowHooks(snapshot: PlayerPhysicsSnapshot): void {
    if (!this.shotPut) {
      return;
    }
    const airtime = this.elapsed - this.shotPut.physics.startTime;
    const throwSpeed = this.shotPut.physics.getVelocity().length();
    if (this.firstThrowFired) {
      this.firstThrowFired = false;
      console.info('Track Planet event: first throw');
    }
    if (!this.tenSecondAirtimeFired && airtime >= 10) {
      this.tenSecondAirtimeFired = true;
      console.info('Track Planet event: 10 second airtime');
    }
    if (!this.orbitThrowFired && this.shotPut.physics.getSurfaceDistance() >= PLANET_CIRCUMFERENCE_METERS) {
      this.orbitThrowFired = true;
      console.info('Track Planet event: complete one orbit throw');
    }
    if (!this.escapeThrowFired && throwSpeed >= snapshot.escapeSpeed) {
      this.escapeThrowFired = true;
      console.info('Track Planet event: escape velocity throw');
    }
    if (!this.bounceFiveFired && this.shotPut.physics.bounceCount >= 5) {
      this.bounceFiveFired = true;
      console.info('Track Planet event: bounce 5 times');
    }
  }

  private checkAchievementHooks(snapshot: PlayerPhysicsSnapshot): void {
    if (!this.orbitHookFired && snapshot.speed >= snapshot.orbitalSpeed) {
      this.orbitHookFired = true;
      this.achievements.onOrbitSpeedReached?.(this.payload(snapshot));
    }
    if (!this.escapeHookFired && snapshot.speed >= snapshot.escapeSpeed) {
      this.escapeHookFired = true;
      this.achievements.onEscapeSpeedReached?.(this.payload(snapshot));
    }
  }

  private payload(snapshot: PlayerPhysicsSnapshot): AchievementPayload {
    return {
      speed: snapshot.speed,
      altitude: snapshot.altitude,
      elapsed: this.elapsed,
    };
  }
}
