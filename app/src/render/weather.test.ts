import { describe, expect, it } from 'vitest';
import type { WeatherCell } from '../shared/types';
import { cloudVoxels, weatherFade } from './weather';

const cell: WeatherCell = { id: 4, kind: 'rain', x: 0, z: 0, radius: 8, vx: 0, vz: 0, bornAt: 10, endsAt: 40 };

describe('weather render', () => {
  it('fades in after the cloud appears and out before it dissolves', () => {
    expect(weatherFade(cell, 10)).toBe(0);
    expect(weatherFade(cell, 11)).toBeCloseTo(0.5);
    expect(weatherFade(cell, 25)).toBe(1);
    expect(weatherFade(cell, 39)).toBeCloseTo(0.5);
    expect(weatherFade(cell, 41)).toBe(0);
  });

  it('keeps the cloud inside its radius and stable for the same id', () => {
    const voxels = cloudVoxels(cell);
    expect(voxels.length).toBeGreaterThan(20);
    for (const v of voxels) expect(Math.hypot(v.x, v.z)).toBeLessThanOrEqual(cell.radius);
    expect(cloudVoxels(cell)).toEqual(voxels);
  });
});
