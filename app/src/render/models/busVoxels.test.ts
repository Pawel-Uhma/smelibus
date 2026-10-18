import { describe, expect, it } from 'vitest';
import { BUS_VOXELS_X, BUS_VOXELS_Y, BUS_VOXELS_Z, busVoxels } from './busVoxels';

describe('busVoxels', () => {
  it('fits the 18 × 5 × 8 grid without duplicates', () => {
    const voxels = busVoxels();
    const keys = new Set(voxels.map((v) => `${v.x},${v.y},${v.z}`));
    expect(keys.size).toBe(voxels.length);
    for (const v of voxels) {
      expect(v.x).toBeGreaterThanOrEqual(0);
      expect(v.x).toBeLessThan(BUS_VOXELS_X);
      expect(v.y).toBeLessThan(BUS_VOXELS_Y);
      expect(v.z).toBeLessThan(BUS_VOXELS_Z);
    }
    expect(Math.max(...voxels.map((v) => v.z))).toBe(BUS_VOXELS_Z - 1);
  });

  it('has doors only on the right side (y = 4)', () => {
    const doors = busVoxels().filter((v) => v.part === 'door');
    expect(doors.length).toBe(6 * 5);
    expect(doors.every((v) => v.y === 4)).toBe(true);
  });

  it('is clean at stage 0 and gets dirtier with stage', () => {
    const count = (stage: 0 | 1 | 2, part: string) => busVoxels(stage).filter((v) => v.part === part).length;
    expect(count(0, 'stain') + count(0, 'crack')).toBe(0);
    expect(count(1, 'stain')).toBeGreaterThan(0);
    expect(count(1, 'crack')).toBe(0);
    expect(count(2, 'stain')).toBeGreaterThan(count(1, 'stain'));
    expect(count(2, 'crack')).toBeGreaterThan(0);
  });

  it('keeps the same voxel positions at every stage', () => {
    const pos = (stage: 0 | 1 | 2) => busVoxels(stage).map((v) => `${v.x},${v.y},${v.z}`).join(';');
    expect(pos(1)).toBe(pos(0));
    expect(pos(2)).toBe(pos(0));
  });
});
