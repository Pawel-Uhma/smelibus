import { describe, expect, it } from 'vitest';
import { NEUTRAL_COLOR } from '../shared/config';
import type { Tile } from '../shared/types';
import { SUB, paintZones } from './zones';

const px = (out: Uint8Array, size: number, x: number, z: number) => {
  const p = (z * size * SUB + x) * 4;
  return (out[p] << 16) | (out[p + 1] << 8) | out[p + 2];
};

describe('paintZones', () => {
  const size = 2;
  // Left column owned by a, right column by b.
  const tiles: Tile[] = [{ ownerId: 'a' }, { ownerId: 'b' }, { ownerId: 'a' }, { ownerId: 'b' }];
  const colorOf = (id: string) => (id === 'a' ? 0xff0000 : 0x0000ff);

  it('fills tiles by owner and darkens the shared border', () => {
    const out = new Uint8Array((size * SUB) ** 2 * 4);
    paintZones(out, tiles, size, colorOf);
    const fill = px(out, size, 0, 1);
    const border = px(out, size, SUB - 1, 1);
    expect(fill >> 16).toBeGreaterThan(fill & 255); // reddish
    expect(border >> 16).toBeLessThan(fill >> 16); // darker red on the border
    const blue = px(out, size, SUB + 1, 1);
    expect(blue & 255).toBeGreaterThan(blue >> 16);
  });

  it('paints unowned tiles neutral and repaints after an owner change', () => {
    const out = new Uint8Array((size * SUB) ** 2 * 4);
    const t = tiles.map((x) => ({ ...x }));
    t[1].ownerId = null;
    paintZones(out, t, size, colorOf);
    expect(px(out, size, SUB + 1, 1)).toBe(NEUTRAL_COLOR);
    t[1].ownerId = 'a';
    t[3].ownerId = 'a';
    paintZones(out, t, size, colorOf);
    expect(px(out, size, SUB - 1, 1)).toBe(px(out, size, 1, 1)); // no border inside one zone
  });

  it('glows freshly taken tiles toward white', () => {
    const out = new Uint8Array((size * SUB) ** 2 * 4);
    paintZones(out, tiles, size, colorOf);
    const before = px(out, size, 1, 1);
    const flash = new Float32Array(4);
    flash[0] = 1;
    paintZones(out, tiles, size, colorOf, flash);
    expect(px(out, size, 1, 1) & 255).toBeGreaterThan(before & 255);
  });
});
