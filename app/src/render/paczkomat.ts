import * as THREE from 'three';
import type { World } from '../shared/types';
import { BONUS_VOXEL_SIZE as VOXEL } from './bonusModels';

// Parcel locker (card 043): white, a grid of compartments, a screen with a keypad in the middle,
// the yellow logo in the top right corner, dark plinth and a roof with a slight overhang.
// W wide, D deep, H high in bonus voxels (≈ the sim box in sim/paczkomat.ts). Local space:
// footprint centred on the origin, doors face +z, y up.
const W = 20;
const D = 5;
const H = 15;
const WHITE = 0xf2f2ee;
const SIDE = 0xe3e4e1;
const SEAM = 0xc4c7c9;
const PLINTH = 0x2a2c30;
const FOOT = 0x1c1d20;
const SCREEN = 0x1c1f24;
const SCREEN_GLOW = 0x3f6d8f;
const KEYPAD = 0x8a8d90;
const LOGO = 0xffcd00;
const LETTERS = 0x5b5f66;
const ROOF = 0xdfe0dd;

export interface LockerVoxel {
  x: number;
  y: number;
  z: number;
  color: number;
}

/** Column seams on the front; the outer columns have small compartments, the inner ones bigger. */
const SEAM_COLS = [4, 8, 11, 15];
const rowsAt = (x: number) => (x < 4 || x > 15 ? 2 : x < 8 || x > 11 ? 3 : 0);

function colorAt(x: number, y: number, z: number): number {
  if (y === 0) return z === D - 1 && x % 3 === 1 ? FOOT : PLINTH;
  const front = z === D - 1;
  if (!front) return SIDE;
  if (y >= 12) {
    // Header band: logo mark and lettering on the right.
    if ((x === 13 || x === 14) && y <= 13) return LOGO;
    if (x === 12 && y === 13) return LOGO;
    if (x >= 15 && x <= 18 && y === 12 + (x % 2)) return LETTERS;
    return WHITE;
  }
  if (x >= 9 && x <= 10) {
    if (y >= 7 && y <= 9) return x === 10 && y === 9 ? SCREEN_GLOW : SCREEN;
    if (y === 5) return KEYPAD;
    if (y === 3) return PLINTH;
    return WHITE;
  }
  if (x === 0 || x === W - 1) return WHITE;
  if (SEAM_COLS.includes(x)) return SEAM;
  const r = rowsAt(x);
  return r && y % r === 0 ? SEAM : WHITE;
}

/** Voxels of one locker (grid coords x 0..W-1, y 0..H-1, z 0..D-1, roof one wider) with colors. */
export function lockerVoxels(): LockerVoxel[] {
  const out: LockerVoxel[] = [];
  for (let y = 0; y < H - 1; y++) for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    out.push({ x, y, z, color: colorAt(x, y, z) });
  }
  for (let z = 0; z <= D; z++) for (let x = -1; x <= W; x++) out.push({ x, y: H - 1, z, color: ROOF });
  return out;
}

/** Static lockers from world.paczkomats. Read-only on the world, built once. Only the shell is drawn. */
export function createPaczkomatRender(scene: THREE.Scene, world: World): void {
  const lockers = world.paczkomats ?? [];
  if (lockers.length === 0) return;
  const all = lockerVoxels();
  const filled = new Set(all.map((v) => `${v.x},${v.y},${v.z}`));
  const voxels = all.filter((v) => [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]
    .some(([dx, dy, dz]) => !filled.has(`${v.x + dx},${v.y + dy},${v.z + dz}`)));
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(VOXEL, VOXEL, VOXEL),
    new THREE.MeshLambertMaterial(),
    voxels.length * lockers.length,
  );
  const local = new THREE.Matrix4();
  const place = new THREE.Matrix4();
  const color = new THREE.Color();
  let k = 0;
  for (const p of lockers) {
    place.makeRotationY(Math.atan2(p.fx, p.fz)).setPosition(p.x, 0, p.z);
    for (const v of voxels) {
      local.makeTranslation((v.x - (W - 1) / 2) * VOXEL, (v.y + 0.5) * VOXEL, (v.z - (D - 1) / 2) * VOXEL);
      mesh.setMatrixAt(k, local.premultiply(place));
      mesh.setColorAt(k, color.setHex(v.color));
      k++;
    }
  }
  mesh.computeBoundingSphere();
  scene.add(mesh);
}
