import * as THREE from 'three';

/** A voxel in model grid space (y up), with the colour of its faces (null = not in this mesh). */
export interface GridVoxel {
  x: number;
  y: number;
  z: number;
  color: THREE.Color | null;
}

// Unit cube faces: outward normal and corners in counter-clockwise order seen from outside.
const FACES: { n: [number, number, number]; c: [number, number, number][] }[] = [
  { n: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
  { n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
];

/**
 * One merged geometry with vertex colours. Faces between two voxels of the model are skipped,
 * also when the neighbour is in another mesh (null colour), so split meshes stay hollow.
 * Grid cell (x, y, z) covers [x, x+1) × … scaled by `size`, shifted by `origin` (in cells).
 */
export function buildVoxelGeometry(voxels: GridVoxel[], size: number, origin: [number, number, number]): THREE.BufferGeometry {
  const filled = new Set(voxels.map((v) => `${v.x},${v.y},${v.z}`));
  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const [ox, oy, oz] = origin;
  for (const v of voxels) {
    if (!v.color) continue;
    for (const f of FACES) {
      if (filled.has(`${v.x + f.n[0]},${v.y + f.n[1]},${v.z + f.n[2]}`)) continue;
      const base = pos.length / 3;
      for (const [cx, cy, cz] of f.c) {
        pos.push((v.x + cx + ox) * size, (v.y + cy + oy) * size, (v.z + cz + oz) * size);
        nor.push(...f.n);
        col.push(v.color.r, v.color.g, v.color.b);
      }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  return geo;
}
