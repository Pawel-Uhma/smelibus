import {
  BONUS_STINK, ZABKA_SPAWN_MIN_S, ZABKA_SPAWN_SPEEDUP_PER_MIN, ZABKA_SPAWN_START_S, ZABKA_ZUL_RADIUS,
  ZABKA_ZULS_MAX, ZABKA_ZULS_START, ZABKA_ZULS_STEP_S, ZABKAS_PER_TILE,
} from '../shared/config';
import type { GameState, World } from '../shared/types';
import { nextId, rand } from './bonus';
import { nearestDrivable } from './world';

/** Seconds between drunks from one shop at game time `time`: shrinks as the match goes on. */
export function zabkaInterval(time: number): number {
  return Math.max(ZABKA_SPAWN_MIN_S, ZABKA_SPAWN_START_S - (ZABKA_SPAWN_SPEEDUP_PER_MIN * time) / 60);
}

/** How many drunks may wait at one shop at game time `time`: grows as the match goes on. */
export function zabkaLimit(time: number): number {
  return Math.min(ZABKA_ZULS_MAX, ZABKA_ZULS_START + Math.floor(time / ZABKA_ZULS_STEP_S));
}

/** Mulberry32, seeded from the map, so every client places the same shops. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Shop spots from the world seed, spread out, away from the map edge. On the city map they stand
 * on free lots (not road, not building) next to a road; on the flat map anywhere.
 */
export function placeZabkas(world: World): { x: number; z: number }[] {
  const rand = rng(world.seed ^ 0x2abca);
  const { size, tiles } = world;
  const kindAt = (x: number, z: number) =>
    x < 0 || z < 0 || x >= size || z >= size ? undefined : tiles[z * size + x].kind;
  const city = tiles.some((t) => t.kind === 'road');
  const margin = 2;
  const candidates: number[] = [];
  for (let z = margin; z < size - margin; z++) {
    for (let x = margin; x < size - margin; x++) {
      const k = kindAt(x, z);
      if (k === 'road' || k === 'building') continue;
      if (city && ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => kindAt(x + dx, z + dz) === 'road')) continue;
      candidates.push(z * size + x);
    }
  }
  // Fisher–Yates with the seeded rng, then greedy picks at least `gap` apart.
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const want = Math.max(1, Math.round(size * size * ZABKAS_PER_TILE));
  const gap = Math.sqrt((size * size) / want) * 0.6;
  const shops: { x: number; z: number }[] = [];
  for (const idx of candidates) {
    if (shops.length >= want) break;
    const p = { x: (idx % size) + 0.5, z: Math.floor(idx / size) + 0.5 };
    if (shops.every((s) => (s.x - p.x) ** 2 + (s.z - p.z) ** 2 >= gap * gap)) shops.push(p);
  }
  return shops;
}

/** Puts the shops on the map and staggers their first drunk. Call once after spawnBonuses. */
export function spawnZabkas(state: GameState): void {
  state.world.zabkas ??= placeZabkas(state.world);
  state.zabkaNextAt = state.world.zabkas.map(() => zabkaInterval(0) * (0.5 + 0.5 * rand(state)));
}

/** Lets drunks out of shops that are due, up to the per-shop limit. Call once per sim step. */
export function updateZabkas(state: GameState): void {
  const shops = state.world.zabkas;
  const next = state.zabkaNextAt;
  if (!shops || !next) return;
  const bonuses = (state.bonuses ??= []);
  shops.forEach((shop, i) => {
    if (state.time < next[i]) return;
    next[i] = state.time + zabkaInterval(state.time);
    const waiting = bonuses.filter((b) => b.spot === 'zabka' && b.zabka === i && b.active).length;
    if (waiting >= zabkaLimit(state.time)) return;
    const a = rand(state) * 2 * Math.PI;
    const r = ZABKA_ZUL_RADIUS * (0.6 + 0.4 * rand(state));
    const { x, z } = nearestDrivable(state.world, shop.x + Math.cos(a) * r, shop.z + Math.sin(a) * r);
    bonuses.push({
      id: nextId(state), spot: 'zabka', kind: 'zul', amount: BONUS_STINK.zul,
      active: true, respawnAt: 0, x, z, zabka: i,
    });
  });
}
