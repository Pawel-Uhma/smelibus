import { describe, expect, it } from 'vitest';
import { ZABKA_TILES } from '../shared/config';
import { BUS_VOXEL_SIZE } from './models/bus';
import { kioskVoxels } from './zabka';

describe('Żabka kiosk', () => {
  const voxels = kioskVoxels();
  const n = Math.round(ZABKA_TILES / BUS_VOXEL_SIZE);

  it('fills its lot and has a door and windows on the front', () => {
    for (const v of voxels) {
      expect(Math.min(v.x, v.y, v.z)).toBeGreaterThanOrEqual(0);
      expect(Math.max(v.x, v.z)).toBeLessThan(n);
    }
    expect(Math.max(...voxels.map((v) => v.x))).toBe(n - 1);
    const front = voxels.filter((v) => v.z === n - 1);
    expect(front.some((v) => v.color === 0x22303a)).toBe(true);
    expect(front.some((v) => v.color === 0x628598)).toBe(true);
  });

  it('has a frog on the roof with white eyes, readable from the top camera', () => {
    const top = new Map<string, { y: number; color: number }>();
    for (const v of voxels) {
      const k = `${v.x},${v.z}`;
      if (!top.has(k) || top.get(k)!.y < v.y) top.set(k, { y: v.y, color: v.color });
    }
    const seen = [...top.values()].map((t) => t.color);
    expect(seen.filter((c) => c === 0xffffff).length).toBeGreaterThanOrEqual(8);
    expect(seen.filter((c) => c === 0x46a84f).length).toBeGreaterThan(20);
    expect(Math.max(...voxels.map((v) => v.y))).toBeGreaterThan(12);
  });

  it('keeps only voxels that can be seen', () => {
    expect(voxels.length).toBeLessThan(n * n * 12);
  });
});
