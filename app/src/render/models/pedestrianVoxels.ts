// Pedestrian voxel layout: the uniformed driver "Służbista" (GAME_DESIGN: Grafika → Model pieszego).
// Pure data, no Three.js. Coordinates: x = depth (front at +x), y = width, z = up.

export const PEDESTRIAN_VOXELS_X = 3;
export const PEDESTRIAN_VOXELS_Y = 3;
export const PEDESTRIAN_VOXELS_Z = 8;

export type PedestrianPart = 'shoe' | 'uniform' | 'button' | 'skin' | 'eye' | 'hair' | 'capBand' | 'capTop';

export interface PedestrianVoxel {
  x: number;
  y: number;
  z: number;
  part: PedestrianPart;
}

function part(x: number, y: number, z: number): PedestrianPart | null {
  // Cap: coloured crown overhanging to the front, black band and peak.
  if (z === 7) return 'capTop';
  if (x === 2) return z === 6 ? 'capBand' : null;
  if (z === 6) return 'capBand';
  if (z === 0) return y === 1 ? null : 'shoe';
  // Uniform with two gold buttons on the chest.
  if (z <= 3) return x === 1 && y === 1 && z >= 2 ? 'button' : 'uniform';
  // Head: hair at the back, eyes in the top row of the face.
  if (x === 0) return 'hair';
  if (z === 5) return y === 1 ? 'skin' : 'eye';
  return 'skin';
}

export function pedestrianVoxels(): PedestrianVoxel[] {
  const out: PedestrianVoxel[] = [];
  for (let x = 0; x < PEDESTRIAN_VOXELS_X; x++) {
    for (let y = 0; y < PEDESTRIAN_VOXELS_Y; y++) {
      for (let z = 0; z < PEDESTRIAN_VOXELS_Z; z++) {
        const p = part(x, y, z);
        if (p) out.push({ x, y, z, part: p });
      }
    }
  }
  return out;
}
