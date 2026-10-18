import {
  BONUS_STINK, PACZKOMAT_COOLDOWN_S, PACZKOMAT_DROP_DIST, PACZKOMAT_DROP_PICKUP_DELAY_S,
  PACZKOMAT_DROP_TTL_S, PACZKOMAT_HIT_MIN_SPEED, PACZKOMAT_POOP_CHANCE, PACZKOMATS_PER_TILE,
} from '../shared/config';
import type { Bus, GameState, World } from '../shared/types';
import { nextId, rand } from './bonus';
import { bounceOff, corners } from './bus';
import { nearestDrivable } from './world';

export type Paczkomat = NonNullable<World['paczkomats']>[number];

/** Half extents of a locker: wide along its front, shallow front to back (render/paczkomat.ts). */
export const PACZKOMAT_HALF_WIDTH = 0.42;
export const PACZKOMAT_HALF_DEPTH = 0.17;

/** Lockers keep at least this far (tiles) from Żabka shops, so the two never overlap. */
const ZABKA_GAP = 2.5;

/** Mulberry32, seeded from the map, so every client places the same lockers. */
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

/** Axis-aligned half extents of a locker in world x and z. */
export function paczkomatHalf(p: Paczkomat): { hx: number; hz: number } {
  return p.fx !== 0
    ? { hx: PACZKOMAT_HALF_DEPTH, hz: PACZKOMAT_HALF_WIDTH }
    : { hx: PACZKOMAT_HALF_WIDTH, hz: PACZKOMAT_HALF_DEPTH };
}

/**
 * Locker spots from the world seed, spread out, away from the edge and the Żabkas. On the city
 * map they stand on free lots next to a road with the doors to it; on the flat map anywhere,
 * doors towards the map centre (snapped to an axis).
 */
export function placePaczkomats(world: World): Paczkomat[] {
  const rand = rng(world.seed ^ 0x1a9057);
  const { size, tiles } = world;
  const kindAt = (x: number, z: number) =>
    x < 0 || z < 0 || x >= size || z >= size ? undefined : tiles[z * size + x].kind;
  const city = tiles.some((t) => t.kind === 'road');
  const zabkas = world.zabkas ?? [];
  const margin = 2;
  const candidates: number[] = [];
  for (let z = margin; z < size - margin; z++) {
    for (let x = margin; x < size - margin; x++) {
      const k = kindAt(x, z);
      if (k === 'road' || k === 'building') continue;
      if (city && ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => kindAt(x + dx, z + dz) === 'road')) continue;
      if (zabkas.some((s) => (s.x - x - 0.5) ** 2 + (s.z - z - 0.5) ** 2 < ZABKA_GAP * ZABKA_GAP)) continue;
      candidates.push(z * size + x);
    }
  }
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const want = Math.max(1, Math.round(size * size * PACZKOMATS_PER_TILE));
  const gap = Math.sqrt((size * size) / want) * 0.6;
  const out: Paczkomat[] = [];
  for (const idx of candidates) {
    if (out.length >= want) break;
    const tx = idx % size;
    const tz = Math.floor(idx / size);
    const x = tx + 0.5, z = tz + 0.5;
    if (!out.every((p) => (p.x - x) ** 2 + (p.z - z) ** 2 >= gap * gap)) continue;
    const road = [[0, 1], [1, 0], [0, -1], [-1, 0]].find(([dx, dz]) => kindAt(tx + dx, tz + dz) === 'road');
    let fx: number, fz: number;
    if (road) [fx, fz] = road;
    else {
      const dx = size / 2 - x, dz = size / 2 - z;
      [fx, fz] = Math.abs(dx) > Math.abs(dz) ? [Math.sign(dx) || 1, 0] : [0, Math.sign(dz) || 1];
    }
    out.push({ x, z, fx, fz });
  }
  return out;
}

/** Puts the lockers on the map. Call once after spawnZabkas (lockers keep clear of the shops). */
export function spawnPaczkomats(state: GameState): void {
  state.world.paczkomats ??= placePaczkomats(state.world);
  state.paczkomatReadyAt = state.world.paczkomats.map(() => 0);
}

/** A locker the bus ran into: its index and the unit normal from the locker towards the bus. */
export interface PaczkomatHit {
  index: number;
  nx: number;
  nz: number;
}

/**
 * Keeps the bus rectangle out of the lockers (axis-aligned boxes): pushes it out along the axis
 * of least overlap (separating axis test) and bounces it off, like the Żabka kiosks.
 * Runs on the server after updateBus and in the client's own-bus prediction.
 */
export function collidePaczkomats(bus: Bus, lockers: readonly Paczkomat[] | undefined): PaczkomatHit[] {
  const hits: PaczkomatHit[] = [];
  if (!lockers) return hits;
  lockers.forEach((p, index) => {
    const { hx, hz } = paczkomatHalf(p);
    const cs = corners(bus);
    const fx = Math.sin(bus.angle), fz = Math.cos(bus.angle);
    let best: { nx: number; nz: number; depth: number } | null = null;
    for (const [nx, nz] of [[1, 0], [0, 1], [fx, fz], [fz, -fx]]) {
      const proj = cs.map(([x, z]) => x * nx + z * nz);
      const c = p.x * nx + p.z * nz;
      const r = hx * Math.abs(nx) + hz * Math.abs(nz);
      const depth = Math.min(Math.max(...proj), c + r) - Math.max(Math.min(...proj), c - r);
      if (depth <= 0) return;
      if (!best || depth < best.depth) best = { nx, nz, depth };
    }
    if (!best) return;
    const b: { nx: number; nz: number; depth: number } = best;
    const away = (bus.x - p.x) * b.nx + (bus.z - p.z) * b.nz < 0 ? -1 : 1;
    const nx = b.nx * away, nz = b.nz * away;
    bus.x += nx * b.depth;
    bus.z += nz * b.depth;
    bounceOff(bus, -nx, -nz);
    hits.push({ index, nx, nz });
  });
  return hits;
}

/** World velocity of a bus (tiles/s): driving plus knock-back. */
export function busVelocity(bus: Bus): { x: number; z: number } {
  return {
    x: Math.sin(bus.angle) * bus.speed + (bus.pushX ?? 0),
    z: Math.cos(bus.angle) * bus.speed + (bus.pushZ ?? 0),
  };
}

/**
 * A driven bus moving at `v` (busVelocity before the bounce) rammed lockers: each one hit
 * head-on hard enough and not on cooldown drops a parcel, or with PACZKOMAT_POOP_CHANCE a poop,
 * on the side it was hit from. Scraping along the side doesn't count.
 */
export function hitPaczkomats(
  state: GameState, bus: Bus, hits: readonly PaczkomatHit[], v: { x: number; z: number },
): void {
  const lockers = state.world.paczkomats;
  if (!lockers || bus.driverId === null) return;
  const ready = (state.paczkomatReadyAt ??= lockers.map(() => 0));
  for (const h of hits) {
    if (-(v.x * h.nx + v.z * h.nz) < PACZKOMAT_HIT_MIN_SPEED) continue;
    if (state.time < (ready[h.index] ?? 0)) continue;
    ready[h.index] = state.time + PACZKOMAT_COOLDOWN_S;
    const p = lockers[h.index];
    const kind = rand(state) < PACZKOMAT_POOP_CHANCE ? 'poop' : 'parcel';
    const size = state.world.size;
    const clampIn = (v: number) => Math.max(0.5, Math.min(size - 0.5, v));
    const at = nearestDrivable(state.world, clampIn(p.x + h.nx * PACZKOMAT_DROP_DIST), clampIn(p.z + h.nz * PACZKOMAT_DROP_DIST));
    (state.bonuses ??= []).push({
      id: nextId(state), spot: 'paczkomat', kind, amount: BONUS_STINK[kind], x: at.x, z: at.z,
      active: true, respawnAt: state.time + PACZKOMAT_DROP_TTL_S,
      pickableAt: state.time + PACZKOMAT_DROP_PICKUP_DELAY_S,
    });
  }
}
