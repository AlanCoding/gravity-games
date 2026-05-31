import * as THREE from 'three';
import { ProjectilePhysics } from '../physics/projectilePhysics';
import { type PlanetBoxCollider } from '../physics/planetCollision';
import { PLANET_RADIUS_METERS } from '../constants';

export class ShotPut {
  readonly mesh: THREE.Mesh;
  readonly trail: THREE.Line;
  readonly physics: ProjectilePhysics;

  private readonly trailPoints: THREE.Vector3[] = [];

  constructor(options: {
    scene: THREE.Scene;
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    planetRadius: number;
    surfaceGravity: number;
    startTime: number;
    collisionVolumes: ReadonlyArray<PlanetBoxCollider>;
  }) {
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 24, 16),
      new THREE.MeshStandardMaterial({ color: 0x3f454a, metalness: 0.25, roughness: 0.38 }),
    );
    this.trail = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0xeac460, transparent: true, opacity: 0.75 }),
    );
    this.physics = new ProjectilePhysics({
      position: options.position,
      velocity: options.velocity,
      radius: 0.42,
      mass: 7.26,
      restitution: 0.58,
      friction: 0.65,
      planetRadius: options.planetRadius ?? PLANET_RADIUS_METERS,
      surfaceGravity: options.surfaceGravity,
      startTime: options.startTime,
      collisionVolumes: options.collisionVolumes,
    });

    options.scene.add(this.trail, this.mesh);
  }

  updateFromPhysics(): void {
    const position = this.physics.getPosition();
    this.mesh.position.copy(position);
    this.trailPoints.push(position.clone());
    if (this.trailPoints.length > 90) {
      this.trailPoints.shift();
    }
    this.trail.geometry.dispose();
    this.trail.geometry = new THREE.BufferGeometry().setFromPoints(this.trailPoints);
  }
}
