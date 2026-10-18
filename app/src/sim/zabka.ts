import {
  BONUS_STINK, ZABKA_SPAWN_MIN_S, ZABKA_SPAWN_SPEEDUP_PER_MIN, ZABKA_SPAWN_START_S,
  ZABKA_ZUL_FALLEN_STINK, ZABKA_ZUL_WALK_MAX, ZABKA_ZUL_WALK_MIN, ZABKA_ZUL_WALK_SPEED,
  ZABKA_TILES, ZABKA_ZULS_MAX, ZABKA_ZULS_START, ZABKA_ZULS_STEP_S, ZABKAS_PER_TILE,
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

const SIDES = [[0, 1], [1, 0], [0, -1], [-1, 0]] as const;
/** Half the side of a kiosk (render/zabka.ts): it fills its lot. */
const KIOSK_HALF = ZABKA_TILES / 2;

/** Tiles just outside one side (dx, dz) of the lot whose corner tile is (bx, bz). */
function sideTiles(bx: number, bz: number, dx: number, dz: number): [number, number][] {
  const n = ZABKA_TILES;
  return Array.from({ length: n }, (_, i) => {
    if (dz === 1) return [bx + i, bz + n];
    if (dz === -1) return [bx + i, bz - 1];
    return dx === 1 ? [bx + n, bz + i] : [bx - 1, bz + i];
  });
}

function isRoad(world: World, x: number, z: number): boolean {
  return x >= 0 && z >= 0 && x < world.size && z < world.size && world.tiles[z * world.size + x].kind === 'road';
}

/**
 * Shop spots (centre of a ZABKA_TILES × ZABKA_TILES lot) from the world seed, spread out, away from
 * the map edge. On the city map they stand on free lots (not road, not building) next to a road;
 * on the flat map anywhere.
 */
export function placeZabkas(world: World): { x: number; z: number }[] {
  const rand = rng(world.seed ^ 0x2abca);
  const { size, tiles } = world;
  const n = ZABKA_TILES;
  const city = tiles.some((t) => t.kind === 'road');
  const margin = 2;
  const candidates: number[] = [];
  for (let z = margin; z <= size - margin - n; z++) {
    for (let x = margin; x <= size - margin - n; x++) {
      let free = true;
      for (let i = 0; i < n * n && free; i++) {
        const k = tiles[(z + Math.floor(i / n)) * size + x + (i % n)].kind;
        free = k !== 'road' && k !== 'building';
      }
      if (!free) continue;
      if (city && !SIDES.some(([dx, dz]) => sideTiles(x, z, dx, dz).some(([tx, tz]) => isRoad(world, tx, tz)))) continue;
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
    const p = { x: (idx % size) + n / 2, z: Math.floor(idx / size) + n / 2 };
    if (shops.every((s) => (s.x - p.x) ** 2 + (s.z - p.z) ** 2 >= gap * gap)) shops.push(p);
  }
  return shops;
}

/** Unit direction the shop door faces: a side of the lot touching a road, else the map centre. */
export function zabkaFront(world: World, shop: { x: number; z: number }): { x: number; z: number } {
  const { size } = world;
  const bx = Math.round(shop.x - ZABKA_TILES / 2);
  const bz = Math.round(shop.z - ZABKA_TILES / 2);
  for (const [dx, dz] of SIDES) {
    if (sideTiles(bx, bz, dx, dz).some(([x, z]) => isRoad(world, x, z))) return { x: dx, z: dz };
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
    const door = { x: shop.x + front.x * (KIOSK_HALF + 0.2), z: shop.z + front.z * (KIOSK_HALF + 0.2) };
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
    for (const [ax, az] of [[1, 0], [0, 1], [fx, fz], [fz, -fx]]) {
      const proj = cs.map(([x, z]) => x * ax + z * az);
      const c = shop.x * ax + shop.z * az;
      const r = KIOSK_HALF * (Math.abs(ax) + Math.abs(az));
      // How far the bus has to move along +axis or -axis to clear the kiosk. Both count, because
      // the bus (BUS_LENGTH) is longer than the kiosk and can stick out on both sides of it.
      const plus = c + r - Math.min(...proj);
      const minus = Math.max(...proj) - (c - r);
      if (plus <= 0 || minus <= 0) {
        best = null;
        break;
      }
      const depth = Math.min(plus, minus);
      const sign = plus < minus ? 1 : -1;
      if (!best || depth < best.depth) best = { nx: ax * sign, nz: az * sign, depth };
    }
    if (!best) continue;
    const { nx, nz } = best;
    bus.x += nx * best.depth;
    bus.z += nz * best.depth;
    bounceOff(bus, -nx, -nz);
  }
}
