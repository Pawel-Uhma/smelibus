import { describe, expect, it } from 'vitest';
import { CITY_ROAD_WIDTH, MAX_PLAYERS } from '../shared/config';
import type { World } from '../shared/types';
import { generateWorld, isDrivable, mapSizeFor, nearestDrivable } from './world';

const kinds = (w: World) => w.tiles.map((t) => t.kind ?? 'grass').join(',');

/** Drivable tiles reachable from tile (0, 0), 4-neighbour flood fill. */
function reachable(w: World): Set<number> {
  const seen = new Set<number>([0]);
  const queue = [0];
  while (queue.length) {
    const idx = queue.pop()!;
    const x = idx % w.size;
    const z = Math.floor(idx / w.size);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const nz = z + dz;
      const n = nz * w.size + nx;
      if (nx < 0 || nz < 0 || nx >= w.size || nz >= w.size || seen.has(n)) continue;
      if (w.tiles[n].kind === 'building') continue;
      seen.add(n);
      queue.push(n);
    }
  }
  return seen;
}

describe('generateWorld', () => {
  it('grows with the player count', () => {
    expect(mapSizeFor(2)).toBeGreaterThan(mapSizeFor(1));
    expect(generateWorld(1, MAX_PLAYERS).size).toBe(mapSizeFor(MAX_PLAYERS));
  });

  it('stays a flat field without the city flag', () => {
    const w = generateWorld(1, 4, false);
    expect(w.tiles.every((t) => t.kind === undefined)).toBe(true);
    expect(w.stops).toBeUndefined();
  });
});

describe('city', () => {
  const seeds = Array.from({ length: 40 }, (_, k) => k * 7919 + 1);

  it('is the same for the same seed and differs between seeds', () => {
    expect(kinds(generateWorld(7, 8, true))).toBe(kinds(generateWorld(7, 8, true)));
    expect(kinds(generateWorld(7, 8, true))).not.toBe(kinds(generateWorld(8, 8, true)));
  });

  it('has a road ring along the edge', () => {
    for (const players of [1, 4, 8]) {
      const w = generateWorld(5, players, true);
      for (let k = 0; k < w.size; k++) {
        for (let d = 0; d < CITY_ROAD_WIDTH; d++) {
          expect(w.tiles[d * w.size + k].kind).toBe('road');
          expect(w.tiles[k * w.size + d].kind).toBe('road');
        }
      }
    }
  });

  it('connects every drivable tile, so no bus or bonus gets walled in', () => {
    for (const seed of seeds) {
      for (const players of [1, 3, 8]) {
        const w = generateWorld(seed, players, true);
        const drivable = w.tiles.filter((t) => t.kind !== 'building').length;
        expect(reachable(w).size).toBe(drivable);
      }
    }
  });

  it('is a city, not an empty field or a solid wall', () => {
    for (const seed of seeds) {
      const w = generateWorld(seed, 8, true);
      const share = (k: string) => w.tiles.filter((t) => (t.kind ?? 'grass') === k).length / w.tiles.length;
      expect(share('building')).toBeGreaterThan(0.2);
      expect(share('road')).toBeGreaterThan(0.25);
      expect(w.tiles.filter((t) => t.kind === 'building').every((t) => (t.height ?? 0) >= 1)).toBe(true);
    }
  });

  it('puts stops on roads next to buildings, not on top of each other', () => {
    for (const seed of seeds) {
      const w = generateWorld(seed, 8, true);
      expect(w.stops!.length).toBeGreaterThan(0);
      for (const s of w.stops!) {
        expect(w.tiles[Math.floor(s.z) * w.size + Math.floor(s.x)].kind).toBe('road');
      }
      const keys = new Set(w.stops!.map((s) => `${s.x},${s.z}`));
      expect(keys.size).toBe(w.stops!.length);
    }
  });
});

describe('isDrivable / nearestDrivable', () => {
  const w = generateWorld(3, 8, true);
  const building = w.tiles.findIndex((t) => t.kind === 'building');
  const bx = (building % w.size) + 0.5;
  const bz = Math.floor(building / w.size) + 0.5;

  it('blocks buildings and the outside of the map', () => {
    expect(isDrivable(w, bx, bz)).toBe(false);
    expect(isDrivable(w, 0.5, 0.5)).toBe(true);
    expect(isDrivable(w, -1, 5)).toBe(false);
    expect(isDrivable(w, 5, w.size + 1)).toBe(false);
  });

  it('moves a point out of a building, keeps a drivable one', () => {
    const p = nearestDrivable(w, bx, bz);
    expect(isDrivable(w, p.x, p.z)).toBe(true);
    expect(nearestDrivable(w, 0.5, 0.5)).toEqual({ x: 0.5, z: 0.5 });
  });
});
