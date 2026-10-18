import { describe, expect, it } from 'vitest';
import { PACZKOMAT_HALF_DEPTH, PACZKOMAT_HALF_WIDTH } from '../sim/paczkomat';
import { BUS_VOXEL_SIZE } from './models/bus';
import { lockerVoxels } from './paczkomat';

describe('InPost locker model', () => {
  const voxels = lockerVoxels();

  it('matches the sim collision box', () => {
    const w = (Math.max(...voxels.map((v) => v.x)) + 1) * BUS_VOXEL_SIZE;
    const d = (Math.max(...voxels.map((v) => v.z)) + 1) * BUS_VOXEL_SIZE;
    expect(Math.abs(w / 2 - PACZKOMAT_HALF_WIDTH)).toBeLessThan(0.05);
    expect(Math.abs(d / 2 - PACZKOMAT_HALF_DEPTH)).toBeLessThan(0.05);
  });

  it('is InPost yellow with locker doors and a screen on the front', () => {
    const zMax = Math.max(...voxels.map((v) => v.z));
    const front = voxels.filter((v) => v.z === zMax).map((v) => v.color);
    expect(voxels.filter((v) => v.color === 0xffcd00).length).toBeGreaterThan(voxels.length / 3);
    expect(front).toContain(0x1d2b3a);
    expect(front).toContain(0x8a8a8a);
  });
});
