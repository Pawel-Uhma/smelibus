import { describe, expect, it, vi } from 'vitest';
import type { Bus, GameState, PlayerId, World } from '../shared/types';
import {
  assignJoinZone, assignStartZones, countTiles, findWinner, jump, suddenDeathMultiplier,
  tileIndexAt, updateZones,
} from './zones';

// The cases below count tiles on tiny maps: one tile per point of stink keeps the numbers readable.
vi.mock('../shared/config', async (original) => ({ ...(await original<object>()), TILES_PER_STINK: 1 }));

function world(size: number, owner: (i: number, j: number) => PlayerId | null = () => null): World {
  const tiles = Array.from({ length: size * size }, (_, idx) => ({
    ownerId: owner(idx % size, Math.floor(idx / size)),
  }));
  return { seed: 1, size, tiles };
}

function bus(x: number, z: number, driverId: PlayerId | null, stink: number): Bus {
  return { id: 0, x, z, angle: 0, speed: 0, driverId, stink };
}

function game(w: World, ids: PlayerId[], buses: Bus[] = []): GameState {
  return {
    tick: 0, time: 0, world: w, buses,
    players: ids.map((id) => ({ id, name: id, color: 0, busId: null, connected: true })),
  };
}

/** Moves the bus to (x, z) as one sim step and runs the zone check. */
function drive(s: GameState, b: Bus, x: number, z: number): void {
  const prev = new Map([[b.id, tileIndexAt(s.world, b.x, b.z)]]);
  b.x = x;
  b.z = z;
  updateZones(s, prev);
}

describe('zones', () => {
  it('splits the map into one Voronoi zone per player', () => {
    const w = world(20);
    assignStartZones(w, ['a', 'b', 'c', 'd']);
    const counts = ['a', 'b', 'c', 'd'].map((id) => countTiles(w, id));
    expect(counts.reduce((s, n) => s + n, 0)).toBe(400);
    for (const n of counts) expect(n).toBeGreaterThan(60);
    expect(w.tiles.every((t) => t.ownerId !== null)).toBe(true);
  });

  it('jump takes the tiles nearest to the entry point and zeroes the stink', () => {
    // a owns the left half (i < 5), b the right half of a 10×10 map.
    const w = world(10, (i) => (i < 5 ? 'a' : 'b'));
    const b = bus(5.5, 5.5, 'a', 3);
    const s = game(w, ['a', 'b'], [b]);
    drive(s, b, 4.5, 5.5); // crosses into a's zone at tile (4, 5)
    expect(b.stink).toBe(0);
    expect(countTiles(w, 'a')).toBe(53);
    // The 3 nearest non-a tiles to (4, 5): (5, 5) at distance 1, then (5, 4) and (5, 6).
    for (const [i, j] of [[5, 5], [5, 4], [5, 6]]) expect(w.tiles[j * 10 + i].ownerId).toBe('a');
    expect(w.tiles[5 * 10 + 6].ownerId).toBe('b');
  });

  it('jump takes neutral and enemy tiles alike, nearest first', () => {
    const w = world(5, (i) => (i === 0 ? 'a' : i === 1 ? null : 'b'));
    jump(w, 'a', 2 * 5 + 0, 10);
    expect(countTiles(w, 'a')).toBe(15);
  });

  it('no jump without crossing the border or without a driver', () => {
    const w = world(10, (i) => (i < 5 ? 'a' : 'b'));
    const inside = bus(2.5, 2.5, 'a', 50);
    const s = game(w, ['a', 'b'], [inside]);
    drive(s, inside, 3.5, 2.5); // moving inside own zone
    expect(inside.stink).toBe(50);
    const empty = bus(5.5, 5.5, null, 50);
    s.buses = [empty];
    drive(s, empty, 4.5, 5.5);
    expect(empty.stink).toBe(50);
    expect(countTiles(w, 'a')).toBe(50);
  });

  it('a player with 0 tiles cannot grow', () => {
    const w = world(10, () => 'b');
    const b = bus(5.5, 5.5, 'a', 80);
    const s = game(w, ['a', 'b'], [b]);
    for (const [x, z] of [[1.5, 1.5], [8.5, 8.5], [4.5, 5.5]]) drive(s, b, x, z);
    expect(countTiles(w, 'a')).toBe(0);
    expect(b.stink).toBe(80);
  });

  it('sudden death multiplies the jump: x2 after 8 min, x3 after 10', () => {
    expect(suddenDeathMultiplier(0)).toBe(1);
    expect(suddenDeathMultiplier(8 * 60 - 1)).toBe(1);
    expect(suddenDeathMultiplier(8 * 60)).toBe(2);
    expect(suddenDeathMultiplier(10 * 60)).toBe(3);

    const w = world(10, (i) => (i < 5 ? 'a' : 'b'));
    const b = bus(5.5, 5.5, 'a', 4);
    const s = game(w, ['a', 'b'], [b]);
    s.time = 10 * 60;
    drive(s, b, 4.5, 5.5);
    expect(countTiles(w, 'a')).toBe(62); // 4 stink × 3
  });

  it('a player owning 100% of the map wins', () => {
    const w = world(4, (i) => (i < 2 ? 'a' : 'b'));
    const b = bus(2.5, 1.5, 'a', 8);
    const s = game(w, ['a', 'b'], [b]);
    drive(s, b, 1.5, 1.5);
    expect(countTiles(w, 'a')).toBe(16);
    expect(s.winnerId).toBe('a');
    expect(findWinner(game(world(4, () => 'a'), ['a']))).toBeNull(); // solo sandbox never wins
  });

  it('no winner below 100%', () => {
    const w = world(4, (i) => (i < 2 ? 'a' : 'b'));
    const b = bus(2.5, 1.5, 'a', 7);
    const s = game(w, ['a', 'b'], [b]);
    drive(s, b, 1.5, 1.5);
    expect(s.winnerId).toBeNull();
  });

  it('a joining player gets a start zone cut from the leader', () => {
    const w = world(20);
    const s = game(w, ['a', 'b', 'c']);
    assignStartZones(w, ['a', 'b', 'c']);
    // Make a the clear leader.
    jump(w, 'a', 0, 60);
    const before = Object.fromEntries(['a', 'b', 'c'].map((id) => [id, countTiles(w, id)]));
    s.players.push({ id: 'd', name: 'd', color: 0, busId: null, connected: true });
    assignJoinZone(s, 'd');
    const got = countTiles(w, 'd');
    expect(got).toBe(100); // 400 tiles / 4 players
    expect(countTiles(w, 'a')).toBe(before.a - got);
    expect(countTiles(w, 'b')).toBe(before.b);
    expect(countTiles(w, 'c')).toBe(before.c);
  });

  it('first player owns the map, the second gets half of it', () => {
    const w = world(10);
    const s = game(w, ['a']);
    assignJoinZone(s, 'a');
    expect(countTiles(w, 'a')).toBe(100);
    s.players.push({ id: 'b', name: 'b', color: 0, busId: null, connected: true });
    assignJoinZone(s, 'b');
    expect(countTiles(w, 'a')).toBe(50);
    expect(countTiles(w, 'b')).toBe(50);
  });
});
