import {
  BONUS_STINK, ZABKA_SPAWN_MIN_S, ZABKA_SPAWN_SPEEDUP_PER_MIN, ZABKA_SPAWN_START_S,
  ZABKA_ZUL_FALLEN_STINK, ZABKA_ZUL_WALK_MAX, ZABKA_ZUL_WALK_MIN, ZABKA_ZUL_WALK_SPEED,
  ZABKA_ZULS_MAX, ZABKA_ZULS_START, ZABKA_ZULS_STEP_S, ZABKAS_PER_TILE,
} from '../shared/config';
import type { Bus, GameState, World } from '../shared/types';
import { nextId, rand } from './bonus';
import { bounceOff, corners } from './bus';
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

/** Unit direction the shop door faces: a neighbouring road, else the map centre. */
export function zabkaFront(world: World, shop: { x: number; z: number }): { x: number; z: number } {
  const { size, tiles } = world;
  const tx = Math.floor(shop.x);
  const tz = Math.floor(shop.z);
  for (const [dx, dz] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
    const x = tx + dx;
    const z = tz + dz;
    if (x >= 0 && z >= 0 && x < size && z < size && tiles[z * size + x].kind === 'road') return { x: dx, z: dz };
  }
  const dx = size / 2 - shop.x;
  const dz = size / 2 - shop.z;
  const len = Math.hypot(dx, dz);
  return len < 1e-6 ? { x: 0, z: 1 } : { x: dx / len, z: dz / len };
}

/** Puts the shops on the map and staggers their first drunk. Call once after spawnBonuses. */
export function spawnZabkas(state: GameState): void {
  state.world.zabkas ??= placeZabkas(state.world);
  state.zabkaNextAt = state.world.zabkas.map(() => zabkaInterval(0) * (0.5 + 0.5 * rand(state)));
}

/**
 * Lets drunks out of shops that are due, up to the per-shop limit: each walks out of the door a
 * little way in a random direction and falls over, which makes him stink more. Call once per step.
 */
export function updateZabkas(state: GameState): void {
  const shops = state.world.zabkas;
  const next = state.zabkaNextAt;
  if (!shops || !next) return;
  const bonuses = (state.bonuses ??= []);
  for (const b of bonuses) {
    if (b.spot === 'zabka' && b.walk && state.time >= b.walk.until) b.amount = ZABKA_ZUL_FALLEN_STINK;
  }
  shops.forEach((shop, i) => {
    if (state.time < next[i]) return;
    next[i] = state.time + zabkaInterval(state.time);
    const waiting = bonuses.filter((b) => b.spot === 'zabka' && b.zabka === i && b.active).length;
    if (waiting >= zabkaLimit(state.time)) return;
    // Out of the door (just past the kiosk), then away from the shop, up to 90° off the door line.
    const front = zabkaFront(state.world, shop);
    const door = { x: shop.x + front.x * 0.7, z: shop.z + front.z * 0.7 };
    const a = Math.atan2(front.x, front.z) + (rand(state) - 0.5) * Math.PI;
    const dist = ZABKA_ZUL_WALK_MIN + (ZABKA_ZUL_WALK_MAX - ZABKA_ZUL_WALK_MIN) * rand(state);
    const size = state.world.size;
    const clampIn = (v: number) => Math.max(0.5, Math.min(size - 0.5, v));
    const end = nearestDrivable(state.world, clampIn(door.x + Math.sin(a) * dist), clampIn(door.z + Math.cos(a) * dist));
    const walkTime = Math.hypot(end.x - door.x, end.z - door.z) / ZABKA_ZUL_WALK_SPEED;
    bonuses.push({
      id: nextId(state), spot: 'zabka', kind: 'zul', amount: BONUS_STINK.zul,
      active: true, respawnAt: 0, x: end.x, z: end.z, zabka: i,
      walk: { x: door.x, z: door.z, from: state.time, until: state.time + walkTime },
    });
  });
}

/** Half the side of a kiosk (render/zabka.ts): it fills its tile. */
const KIOSK_HALF = 0.5;

/**
 * Keeps the bus rectangle out of the kiosks (square, axis-aligned): pushes it out along the axis
 * of least overlap (separating axis test) and bounces it off that side, like the map edge.
 * Runs on the server after updateBus and in the client's own-bus prediction.
 */
export function collideZabkas(bus: Bus, shops: readonly { x: number; z: number }[] | undefined): void {
  if (!shops) return;
  for (const shop of shops) {
    const cs = corners(bus);
    const fx = Math.sin(bus.angle), fz = Math.cos(bus.angle);
    let best: { nx: number; nz: number; depth: number } | null = null;
    for (const [nx, nz] of [[1, 0], [0, 1], [fx, fz], [fz, -fx]]) {
      const proj = cs.map(([x, z]) => x * nx + z * nz);
      const c = shop.x * nx + shop.z * nz;
      const r = KIOSK_HALF * (Math.abs(nx) + Math.abs(nz));
      const depth = Math.min(Math.max(...proj), c + r) - Math.max(Math.min(...proj), c - r);
      if (depth <= 0) {
        best = null;
        break;
      }
      if (!best || depth < best.depth) best = { nx, nz, depth };
    }
    if (!best) continue;
    // Point the axis from the kiosk towards the bus.
    const away = (bus.x - shop.x) * best.nx + (bus.z - shop.z) * best.nz < 0 ? -1 : 1;
    const nx = best.nx * away, nz = best.nz * away;
    bus.x += nx * best.depth;
    bus.z += nz * best.depth;
    bounceOff(bus, -nx, -nz);
  }
}
