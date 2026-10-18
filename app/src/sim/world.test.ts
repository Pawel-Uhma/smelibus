import { describe, expect, it } from 'vitest';
import { MAX_PLAYERS } from '../shared/config';
import type { World } from '../shared/types';
import { generateWorld, isDrivable, mapSizeFor, nearestDrivable } from './world';

const kinds = (w: World) => w.tiles.map((t) => t.kind ?? 'grass').join(',');

/** Drivable tiles reachable from the first drivable tile, 4-neighbour flood fill. */
function reachable(w: World): Set<number> {
  const start = w.tiles.findIndex((t) => t.kind !== 'building');
  const seen = new Set<number>([start]);
  const queue = [start];
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

  it('has streets at many angles, avenues, roundabouts and Warsaw building types', () => {
    const styles = new Set<string>();
    let roundabouts = 0;
    for (const seed of seeds) {
      const w = generateWorld(seed, 8, true);
      const angles = new Set(w.streets!.map((s) => Math.round((Math.atan2(s.bz - s.az, s.bx - s.ax) * 180) / Math.PI / 5)));
      expect(angles.size).toBeGreaterThan(6);
      expect(w.streets!.some((s) => s.kind === 'avenue')).toBe(true);
      roundabouts += w.roundabouts!.length;
      for (const b of w.buildings!) styles.add(b.style);
      w.tiles.forEach((t) => {
        if (t.kind === 'building') expect(w.buildings![t.building!]).toBeDefined();
      });
    }
    expect(roundabouts).toBeGreaterThanOrEqual(seeds.length);
    expect([...styles].sort()).toEqual(['block', 'mdm', 'office', 'palace', 'pavilion', 'tenement']);
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
      expect(share('building')).toBeGreaterThan(0.08);
      expect(share('road')).toBeGreaterThan(0.25);
      expect(share('road')).toBeLessThan(0.6);
      expect(w.tiles.filter((t) => t.kind === 'building').every((t) => (t.height ?? 0) > 0)).toBe(true);
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

  const open = w.tiles.findIndex((t) => t.kind !== 'building');
  const ox = (open % w.size) + 0.5;
  const oz = Math.floor(open / w.size) + 0.5;

  it('blocks buildings and the outside of the map', () => {
    expect(isDrivable(w, bx, bz)).toBe(false);
    expect(isDrivable(w, ox, oz)).toBe(true);
    expect(isDrivable(w, -1, 5)).toBe(false);
    expect(isDrivable(w, 5, w.size + 1)).toBe(false);
  });

  it('moves a point out of a building, keeps a drivable one', () => {
    const p = nearestDrivable(w, bx, bz);
    expect(isDrivable(w, p.x, p.z)).toBe(true);
    expect(nearestDrivable(w, ox, oz)).toEqual({ x: ox, z: oz });
  });
});
