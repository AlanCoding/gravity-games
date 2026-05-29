import * as THREE from 'three';

export function createRampSegmentGeometry(width: number, length: number, startHeight: number, endHeight: number): THREE.BufferGeometry {
  const halfWidth = width / 2;
  const halfLength = length / 2;
  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    -halfWidth, 0, -halfLength,
    halfWidth, 0, -halfLength,
    -halfWidth, startHeight, -halfLength,
    halfWidth, startHeight, -halfLength,
    -halfWidth, 0, halfLength,
    halfWidth, 0, halfLength,
    -halfWidth, endHeight, halfLength,
    halfWidth, endHeight, halfLength,
  ]);
  const indices = [
    0, 1, 2, 1, 3, 2,
    4, 6, 5, 5, 6, 7,
    0, 4, 1, 1, 4, 5,
    2, 3, 6, 3, 7, 6,
    0, 2, 4, 2, 6, 4,
    1, 5, 3, 3, 5, 7,
    2, 6, 3, 3, 6, 7,
  ];
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
