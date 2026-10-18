import { describe, expect, it } from 'vitest';
import { CITY_OSM_ENABLED } from '../shared/config';
import type { World } from '../shared/types';
import { OSM_WARSZAWA } from '../data/osmWarszawa';
import { osmNetwork } from './osm';
import { generateWorld } from './world';

const osmWorld = (seed: number, players: number) => generateWorld(seed, players, true, true);

/** Number of 4-connected pieces of drivable tiles. */
function drivablePieces(w: World): number {
  const seen = new Uint8Array(w.size * w.size);
  let pieces = 0;
  w.tiles.forEach((t, start) => {
    if (t.kind === 'building' || seen[start]) return;
    pieces++;
    const queue = [start];
    seen[start] = 1;
    while (queue.length) {
      const idx = queue.pop()!;
      const x = idx % w.size, z = Math.floor(idx / w.size);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, nz = z + dz, n = nz * w.size + nx;
        if (nx < 0 || nz < 0 || nx >= w.size || nz >= w.size || seen[n] || w.tiles[n].kind === 'building') continue;
        seen[n] = 1;
        queue.push(n);
      }
    }
  });
  return pieces;
}

describe('OSM city (card 014)', () => {
  it('is off by default, so the default game keeps the random city', () => {
    expect(CITY_OSM_ENABLED).toBe(false);
  });

  it('extract is small and carries the ODbL attribution', () => {
    expect(OSM_WARSZAWA.attribution).toContain('OpenStreetMap');
    expect(JSON.stringify(OSM_WARSZAWA).length).toBeLessThan(300_000);
    expect(OSM_WARSZAWA.edges.length / 4).toBeGreaterThan(50);
  });

  it('keeps the real streets: same network for every seed, Rondo Dmowskiego on the big map', () => {
    const a = osmNetwork(114, () => 0.3), b = osmNetwork(114, () => 0.7);
    expect(a.edges.map((e) => [e.a, e.b, e.kind])).toEqual(b.edges.map((e) => [e.a, e.b, e.kind]));
    expect(a.edges.some((e) => e.kind === 'avenue')).toBe(true);
    expect(a.roundabouts.length).toBe(1);
  });

  it('every drivable tile is connected, for many seeds and map sizes', () => {
    for (const players of [1, 2, 4, 8]) {
      for (let seed = 1; seed <= 10; seed++) {
        const w = osmWorld(seed * 7919, players);
        expect(w.streets!.length).toBeGreaterThan(3);
        if (players >= 4) expect(w.tiles.some((t) => t.kind === 'building')).toBe(true);
        expect(drivablePieces(w)).toBe(1);
      }
    }
  });

  it('puts the Palace of Culture west of Marszałkowska and stops on the road', () => {
    const w = osmWorld(5, 8);
    const palace = w.buildings!.findIndex((b) => b.style === 'palace');
    expect(palace).toBeGreaterThanOrEqual(0);
    const at = w.tiles.findIndex((t) => t.building === palace);
    expect(at % w.size).toBeLessThan(w.size / 2);
    expect(w.stops!.length).toBeGreaterThan(0);
    for (const s of w.stops!) expect(w.tiles[Math.floor(s.z) * w.size + Math.floor(s.x)].kind).toBe('road');
  });

  it('is deterministic per seed', () => {
    const kinds = (w: World) => w.tiles.map((t) => t.kind).join();
    expect(kinds(osmWorld(3, 6))).toBe(kinds(osmWorld(3, 6)));
  });
});
