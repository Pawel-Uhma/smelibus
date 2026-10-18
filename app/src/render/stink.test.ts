import { describe, expect, it } from 'vitest';
import { STINK_MAX, STINK_STAGE_LIMITS } from '../shared/config';
import { BUS_VOXEL_SIZE as VOXEL } from './models/bus';
import { CLOUD_FILL_MIN, CLOUD_REACH, cloudCells, cloudFill, puffRate } from './stink';

const [CLEAN_MAX, SMELLY_MAX] = STINK_STAGE_LIMITS;

describe('stink effect strength', () => {
  it('shows nothing while clean, puffs when smelly, a cloud only when filthy', () => {
    expect(cloudFill(0)).toBe(0);
    expect(puffRate(0)).toBe(0);
    expect(puffRate(CLEAN_MAX)).toBe(0);
    expect(puffRate(CLEAN_MAX + 1)).toBeGreaterThan(0);
    expect(cloudFill(SMELLY_MAX)).toBe(0);
    expect(cloudFill(SMELLY_MAX + 1)).toBeGreaterThan(0);
  });

  it('grows with stink up to a clear cloud at max', () => {
    expect(cloudFill(STINK_MAX)).toBeGreaterThan(cloudFill(SMELLY_MAX + 1));
    expect(puffRate(STINK_MAX)).toBeGreaterThan(puffRate(CLEAN_MAX + 1));
  });
});

describe('cloudCells', () => {
  const cells = cloudCells();

  it('stays outside the bus body, above ground, within reach', () => {
    const halfL = 9 * VOXEL;
    const halfW = 2.5 * VOXEL;
    const top = 8 * VOXEL;
    for (const c of cells) {
      const inside = Math.abs(c.x) < halfW && Math.abs(c.z) < halfL && c.y < top;
      expect(inside).toBe(false);
      expect(c.y).toBeGreaterThan(0);
      expect(c.dist).toBeGreaterThanOrEqual(1);
      expect(c.dist).toBeLessThanOrEqual(CLOUD_REACH);
    }
  });

  it('is stable and fills the nearest shell first', () => {
    expect(cloudCells()).toEqual(cells);
    const first = cells.slice(0, Math.round(cells.length * CLOUD_FILL_MIN));
    expect(first.every((c) => c.dist === 1)).toBe(true);
  });
});
