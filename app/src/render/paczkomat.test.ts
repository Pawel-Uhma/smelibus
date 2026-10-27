import { describe, expect, it } from 'vitest';
import { PACZKOMAT_HALF_DEPTH, PACZKOMAT_HALF_WIDTH } from '../sim/paczkomat';
import { BONUS_VOXEL_SIZE } from './bonusModels';
import { lockerVoxels } from './paczkomat';

describe('parcel locker model', () => {
  const voxels = lockerVoxels();
  const body = voxels.filter((v) => v.y < Math.max(...voxels.map((u) => u.y)));

  it('matches the sim box', () => {
    const w = (Math.max(...body.map((v) => v.x)) + 1) * BONUS_VOXEL_SIZE;
    const d = (Math.max(...body.map((v) => v.z)) + 1) * BONUS_VOXEL_SIZE;
    expect(Math.abs(w / 2 - PACZKOMAT_HALF_WIDTH)).toBeLessThan(0.05);
    expect(Math.abs(d / 2 - PACZKOMAT_HALF_DEPTH)).toBeLessThan(0.05);
  });

  it('is white with compartments, a screen and the yellow logo on the front', () => {
    const zMax = Math.max(...body.map((v) => v.z));
    const front = body.filter((v) => v.z === zMax).map((v) => v.color);
    expect(front.filter((c) => c === 0xf2f2ee).length).toBeGreaterThan(front.length / 3);
    expect(front).toContain(0x1c1f24);
    expect(front).toContain(0xc4c7c9);
    expect(front).toContain(0xffcd00);
  });
});
