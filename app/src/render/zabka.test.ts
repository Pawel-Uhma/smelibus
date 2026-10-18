import { describe, expect, it } from 'vitest';
import { kioskVoxels } from './zabka';

describe('Żabka kiosk', () => {
  const voxels = kioskVoxels();

  it('fits one tile and has a door and windows on the front', () => {
    for (const v of voxels) {
      for (const c of [v.x, v.y, v.z]) {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThan(6);
      }
    }
    const front = voxels.filter((v) => v.z === 5);
    expect(front.some((v) => v.color === 0x22303a)).toBe(true);
    expect(front.some((v) => v.color === 0x628598)).toBe(true);
  });

  it('has a green roof with a logo, readable from the top camera', () => {
    const roof = voxels.filter((v) => v.y === 5);
    expect(roof).toHaveLength(36);
    expect(roof.filter((v) => v.color === 0xffffff)).toHaveLength(4);
  });
});
