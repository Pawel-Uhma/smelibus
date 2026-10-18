import { START_RING, SUDDEN_DEATH, TILES_PER_STINK } from '../shared/config';
import type { GameState, PlayerId, World } from '../shared/types';

/** Index of the tile under world point (x, z), clamped to the map. */
export function tileIndexAt(world: World, x: number, z: number): number {
  const i = Math.max(0, Math.min(world.size - 1, Math.floor(x)));
  const j = Math.max(0, Math.min(world.size - 1, Math.floor(z)));
  return j * world.size + i;
}

export function countTiles(world: World, id: PlayerId): number {
  let n = 0;
  for (const t of world.tiles) if (t.ownerId === id) n++;
  return n;
}

/** Jump size multiplier at game time `time` (GAME_DESIGN: x2 after 8 min, x3 after 10). */
export function suddenDeathMultiplier(time: number): number {
  let m = 1;
  for (const s of SUDDEN_DEATH) if (time >= s.after) m = Math.max(m, s.multiplier);
  return m;
}

/** Start point of player `k` of `count`, evenly spaced on a ring around the center. */
export function startPoint(size: number, k: number, count: number): { x: number; z: number } {
  const c = size / 2;
  if (count <= 1) return { x: c, z: c };
  const a = (k / count) * Math.PI * 2;
  return { x: c + Math.sin(a) * size * START_RING, z: c + Math.cos(a) * size * START_RING };
}

/** Initial split: every tile goes to the nearest start point (Voronoi). */
export function assignStartZones(world: World, ids: readonly PlayerId[]): void {
  if (ids.length === 0) return;
  const points = ids.map((_, k) => startPoint(world.size, k, ids.length));
  for (let idx = 0; idx < world.tiles.length; idx++) {
    const x = (idx % world.size) + 0.5;
    const z = Math.floor(idx / world.size) + 0.5;
    let best = 0;
    let bestD = Infinity;
    points.forEach((p, k) => {
      const d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d < bestD) { bestD = d; best = k; }
    });
    world.tiles[idx].ownerId = ids[best];
  }
}

/**
 * Gives `id` the `n` tiles nearest to tile `from` that match `eligible` (nearest first,
 * ties by index so every client gets the same result). Returns how many were taken.
 */
function claimNearest(world: World, id: PlayerId, from: number, n: number,
  eligible: (owner: PlayerId | null) => boolean): number {
  if (n <= 0) return 0;
  const fx = from % world.size;
  const fz = Math.floor(from / world.size);
  const candidates: { idx: number; d: number }[] = [];
  world.tiles.forEach((t, idx) => {
    if (!eligible(t.ownerId)) return;
    const dx = (idx % world.size) - fx;
    const dz = Math.floor(idx / world.size) - fz;
    candidates.push({ idx, d: dx * dx + dz * dz });
  });
  candidates.sort((a, b) => a.d - b.d || a.idx - b.idx);
  const taken = candidates.slice(0, n);
  for (const c of taken) world.tiles[c.idx].ownerId = id;
  return taken.length;
}

/**
 * Jump: `id` crossed into their own zone at tile `entry` carrying `stink`. Takes
 * N = stink × TILES_PER_STINK × multiplier tiles from the entry point outward, whoever owns them.
 */
export function jump(world: World, id: PlayerId, entry: number, stink: number, multiplier = 1): number {
  const n = Math.floor(stink * TILES_PER_STINK * multiplier);
  return claimNearest(world, id, entry, n, (owner) => owner !== id);
}

/**
 * Checks every driven bus for a border crossing into the driver's zone since `prevTiles`
 * (tile index per bus, taken before the step). On a crossing the stink becomes tiles and drops to 0.
 * A player with 0 tiles has no zone to enter, so they cannot grow.
 */
export function updateZones(state: GameState, prevTiles: ReadonlyMap<number, number>): void {
  if (state.winnerId) return;
  const { world } = state;
  const mult = suddenDeathMultiplier(state.time);
  for (const bus of state.buses) {
    const prev = prevTiles.get(bus.id);
    if (!bus.driverId || prev === undefined) continue;
    const now = tileIndexAt(world, bus.x, bus.z);
    if (world.tiles[prev].ownerId === bus.driverId || world.tiles[now].ownerId !== bus.driverId) continue;
    if (bus.stink > 0) jump(world, bus.driverId, now, bus.stink, mult);
    bus.stink = 0;
  }
  state.winnerId = findWinner(state);
}

/** The player owning 100% of the tiles, or null. Needs at least 2 players (solo is a sandbox). */
export function findWinner(state: GameState): PlayerId | null {
  if (state.players.length < 2) return null;
  const first = state.world.tiles[0]?.ownerId;
  if (!first || !state.world.tiles.every((t) => t.ownerId === first)) return null;
  return state.players.some((p) => p.id === first) ? first : null;
}

/**
 * Start zone for a player joining a running game, carved out of the leader's land
 * (the map does not grow). Takes a fair share (tiles / players), at most half the leader's.
 * With nobody owning land yet, the map is split from scratch among all players.
 */
export function assignJoinZone(state: GameState, id: PlayerId): void {
  const { world, players } = state;
  const others = players.filter((p) => p.id !== id);
  const counts = others.map((p) => ({ id: p.id, n: countTiles(world, p.id) }));
  const leader = counts.reduce<{ id: PlayerId; n: number } | null>(
    (best, c) => (c.n > (best?.n ?? 0) ? c : best), null);
  if (!leader) {
    assignStartZones(world, players.map((p) => p.id));
    return;
  }
  const share = Math.floor(world.tiles.length / Math.max(1, players.length));
  const n = Math.min(share, Math.floor(leader.n / 2));
  // Cut from the leader's tile farthest from their centroid: an edge piece keeps the rest whole.
  let cx = 0;
  let cz = 0;
  world.tiles.forEach((t, idx) => {
    if (t.ownerId !== leader.id) return;
    cx += idx % world.size;
    cz += Math.floor(idx / world.size);
  });
  cx /= leader.n;
  cz /= leader.n;
  let from = -1;
  let fromD = -1;
  world.tiles.forEach((t, idx) => {
    if (t.ownerId !== leader.id) return;
    const d = ((idx % world.size) - cx) ** 2 + (Math.floor(idx / world.size) - cz) ** 2;
    if (d > fromD) { fromD = d; from = idx; }
  });
  claimNearest(world, id, from, n, (owner) => owner === leader.id);
}
