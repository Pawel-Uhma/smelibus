import { describe, expect, it } from 'vitest';
import type { PlayerId, World } from '../shared/types';
import { borderTiles, edgeArrow, nearestBorderTile, toMinimap } from './minimapModel';

/** World from rows of chars: '.' = nobody, any other char = that player id. Row index is j. */
function worldOf(rows: string[]): World {
  const size = rows.length;
  const tiles = rows.flatMap((r) => [...r].map((c) => ({ ownerId: (c === '.' ? null : c) as PlayerId | null })));
  return { seed: 1, size, tiles };
}

describe('nearestBorderTile', () => {
  const world = worldOf([
    'aaaa.',
    'aaaa.',
    'aaaa.',
    'aaaa.',
    'bbbbb',
  ]);

  it('treats only tiles touching someone else as border, not the map edge', () => {
    const ids = borderTiles(world, 'a').map((t) => `${t.i},${t.j}`);
    expect(ids).toContain('3,0');
    expect(ids).toContain('0,3');
    expect(ids).not.toContain('0,0');
    expect(ids).not.toContain('1,1');
  });

  it('picks the closest border tile to the position', () => {
    expect(nearestBorderTile(world, 'a', 4.5, 0.5)).toMatchObject({ i: 3, j: 0, x: 3.5, z: 0.5 });
    expect(nearestBorderTile(world, 'a', 0.5, 4.5)).toMatchObject({ i: 0, j: 3 });
    // From deep inside the zone the nearest border is still found.
    expect(nearestBorderTile(world, 'a', 1.5, 0.5)).toMatchObject({ i: 3, j: 0 });
  });

  it('is null when the player owns nothing or the whole map', () => {
    expect(nearestBorderTile(world, 'c', 2, 2)).toBeNull();
    expect(nearestBorderTile(worldOf(['aa', 'aa']), 'a', 1, 1)).toBeNull();
  });
});

describe('edgeArrow', () => {
  it('is hidden when the point is on screen', () => {
    expect(edgeArrow(800, 600, 40, 400, 300)).toBeNull();
    expect(edgeArrow(800, 600, 40, 0, 600)).toBeNull();
  });

  it('sits on the inset edge in the direction of the point', () => {
    const right = edgeArrow(800, 600, 40, 2000, 300)!;
    expect(right).toMatchObject({ x: 760, y: 300 });
    expect(right.angle).toBeCloseTo(0);
    const up = edgeArrow(800, 600, 40, 400, -500)!;
    expect(up.x).toBeCloseTo(400);
    expect(up.y).toBeCloseTo(40);
    expect(up.angle).toBeCloseTo(-Math.PI / 2);
  });

  it('mirrors a point behind the camera', () => {
    const a = edgeArrow(800, 600, 40, 2000, 300, true)!;
    expect(a.x).toBeCloseTo(40);
  });
});

describe('toMinimap', () => {
  it('flips both axes like the camera (up = +z, right = -x)', () => {
    expect(toMinimap(0, 0, 50, 100)).toEqual({ x: 100, y: 100 });
    expect(toMinimap(50, 50, 50, 100)).toEqual({ x: 0, y: 0 });
  });
});
