import { describe, expect, it } from 'vitest';
import { BUS_VOXELS_Z } from './busVoxels';
import { PEDESTRIAN_VOXELS_Z, pedestrianVoxels } from './pedestrianVoxels';

describe('pedestrianVoxels', () => {
  const voxels = pedestrianVoxels();
  const topOf = (x: number, y: number) =>
    voxels.filter((v) => v.x === x && v.y === y).reduce((a, b) => (b.z > a.z ? b : a));

  it('has no duplicates and is not taller than the bus', () => {
    expect(new Set(voxels.map((v) => `${v.x},${v.y},${v.z}`)).size).toBe(voxels.length);
    expect(PEDESTRIAN_VOXELS_Z).toBeLessThanOrEqual(BUS_VOXELS_Z);
  });

  it('shows the player colour on top from every column', () => {
    for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) expect(topOf(x, y).part).toBe('capTop');
  });

  it('has a face with eyes looking forward (+x)', () => {
    const eyes = voxels.filter((v) => v.part === 'eye');
    expect(eyes).toHaveLength(2);
    expect(eyes.every((v) => v.x === 1)).toBe(true);
  });
});
