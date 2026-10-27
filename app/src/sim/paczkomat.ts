import { PACZKOMAT_COOLDOWN_S, PACZKOMATS_PER_TILE } from '../shared/config';
import type { Bus, GameState, World } from '../shared/types';
import { corners } from './bus';
import { startRoll } from './powers';

export type Paczkomat = NonNullable<World['paczkomats']>[number];

/** Half extents of a locker: wide along its front, shallow front to back (render/paczkomat.ts,
 *  20 × 5 voxels of 0.11, card 043). */
export const PACZKOMAT_HALF_WIDTH = 1.1;
export const PACZKOMAT_HALF_DEPTH = 0.275;

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
  // Lockers stand against a block (card 043): spots with a building right behind go first.
  const facing = (idx: number) => [[0, 1], [1, 0], [0, -1], [-1, 0]].find(([dx, dz]) => kindAt(idx % size + dx, Math.floor(idx / size) + dz) === 'road');
  const backed = (idx: number) => {
    const f = facing(idx);
    if (!f) return false;
    const x = idx % size, z = Math.floor(idx / size);
    // Wide along the road: the tiles to both sides must be free too, or it pokes into a wall.
    const side = (k: number) => kindAt(x + f[1] * k, z - f[0] * k) !== 'building';
    return kindAt(x - f[0], z - f[1]) === 'building' && side(1) && side(-1);
  };
  candidates.sort((a, b) => Number(backed(b)) - Number(backed(a)));
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
    // Back against the wall behind, when there is one.
    const shift = kindAt(tx - fx, tz - fz) === 'building' ? 0.5 - PACZKOMAT_HALF_DEPTH : 0;
    out.push({ x: x - fx * shift, z: z - fz * shift, fx, fz });
  }
  return out;
}

/** Puts the lockers on the map. Call once after spawnZabkas (lockers keep clear of the shops). */
export function spawnPaczkomats(state: GameState): void {
  state.world.paczkomats ??= placePaczkomats(state.world);
  state.paczkomatReadyAt = state.world.paczkomats.map(() => 0);
}

/** Does the bus rectangle overlap the locker box? (separating axis test; no push, card 043) */
export function overlapsPaczkomat(bus: Bus, p: Paczkomat): boolean {
  const { hx, hz } = paczkomatHalf(p);
  const cs = corners(bus);
  const fx = Math.sin(bus.angle), fz = Math.cos(bus.angle);
  for (const [nx, nz] of [[1, 0], [0, 1], [fx, fz], [fz, -fx]]) {
    const proj = cs.map(([x, z]) => x * nx + z * nz);
    const c = p.x * nx + p.z * nz;
    const r = hx * Math.abs(nx) + hz * Math.abs(nz);
    if (Math.min(Math.max(...proj), c + r) - Math.max(Math.min(...proj), c - r) <= 0) return false;
  }
  return true;
}

/**
 * Lockers have no collision (card 043): a driven bus that goes through one that isn't cooling
 * down starts a roll (sim/powers.ts). The locker is then empty for PACZKOMAT_COOLDOWN_S.
 */
export function driveThroughPaczkomats(state: GameState, bus: Bus): void {
  const lockers = state.world.paczkomats;
  if (!lockers || bus.driverId === null) return;
  const ready = (state.paczkomatReadyAt ??= lockers.map(() => 0));
  lockers.forEach((p, i) => {
    if (state.time < (ready[i] ?? 0) || !overlapsPaczkomat(bus, p)) return;
    ready[i] = state.time + PACZKOMAT_COOLDOWN_S;
    startRoll(state, bus);
  });
}
