// Low-floor bus voxel layout (GAME_DESIGN: Grafika → Model autobusu). Pure data, no Three.js.
// Coordinates: x = length (front at +x), y = width (y = 4 is the right side, with doors), z = up.

export const BUS_VOXELS_X = 18;
export const BUS_VOXELS_Y = 5;
export const BUS_VOXELS_Z = 8;

export type BusPart =
  | 'body'
  | 'bodyDark'
  | 'window'
  | 'windshield'
  | 'door'
  | 'tire'
  | 'hub'
  | 'bumper'
  | 'headlight'
  | 'taillight'
  | 'sign'
  | 'ac'
  | 'stain'
  | 'crack';

export interface Voxel {
  x: number;
  y: number;
  z: number;
  part: BusPart;
}

/** 0 = clean, 1 = stains, 2 = more stains and cracked windows (GAME_DESIGN: Smród na autobusie). */
export type StinkStage = 0 | 1 | 2;

const WHEELS_X = [1, 12];
const DOORS_X = [4, 5, 8, 9, 15, 16];

function basePart(x: number, y: number, z: number): BusPart | null {
  const side = y === 0 || y === 4;
  for (const w of WHEELS_X) {
    if (side && x >= w && x <= w + 2 && z <= 2) return x === w + 1 && z === 1 ? 'hub' : 'tire';
  }
  if (z === 0) return null;
  if (z === 7) return x >= 6 && x <= 11 && y >= 1 && y <= 3 ? 'ac' : null;
  if (x === 17) {
    if (z === 1) return 'bumper';
    if (z === 2) return side ? 'headlight' : 'body';
    if (z <= 5) return 'windshield';
    return side ? 'body' : 'sign';
  }
  if (x === 0) {
    if (z === 1) return 'bumper';
    if (z === 2) return side ? 'taillight' : 'body';
    if (z === 5) return side ? 'body' : 'window';
    return 'body';
  }
  if (y === 4 && DOORS_X.includes(x) && z <= 5) return 'door';
  if (z === 1) return 'bodyDark';
  if (z === 2 || z === 6) return 'body';
  return side && x % 4 !== 2 ? 'window' : 'body';
}

/** Deterministic per-voxel hash, so stains stay put when the stage changes. */
function hash(x: number, y: number, z: number): number {
  let n = (x * 374761393 + y * 668265263 + z * 982451653) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (n ^ (n >>> 16)) >>> 0;
}

export function busVoxels(stage: StinkStage = 0): Voxel[] {
  const out: Voxel[] = [];
  for (let x = 0; x < BUS_VOXELS_X; x++) {
    for (let y = 0; y < BUS_VOXELS_Y; y++) {
      for (let z = 0; z < BUS_VOXELS_Z; z++) {
        let part = basePart(x, y, z);
        if (!part) continue;
        const h = hash(x, y, z);
        if (stage > 0 && (part === 'body' || part === 'bodyDark') && h % (stage === 2 ? 3 : 7) === 0) part = 'stain';
        if (stage === 2 && (part === 'window' || part === 'windshield') && h % 4 === 0) part = 'crack';
        out.push({ x, y, z, part });
      }
    }
  }
  return out;
}
