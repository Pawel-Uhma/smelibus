import {
  CITY_BLOCK_MAX, CITY_BLOCK_MIN, CITY_EMPTY_LOT_CHANCE, CITY_ENABLED, CITY_HEIGHT_MAX,
  CITY_HEIGHT_MIN, CITY_LOT_MAX, CITY_LOT_MIN, CITY_PARK_CHANCE, CITY_ROAD_WIDTH,
  CITY_STOPS_PER_ROAD_TILE, MAX_PLAYERS, TILES_PER_PLAYER,
} from '../shared/config';
import type { Tile, TileKind, World } from '../shared/types';

export function mapSizeFor(playerCount: number): number {
  return Math.ceil(Math.sqrt(TILES_PER_PLAYER * Math.max(1, Math.min(playerCount, MAX_PLAYERS))));
}

/**
 * Map for a party. Flat field (DECISIONS: MVP on a flat map) unless `city`: then a street
 * grid with building blocks and parks, the same for the same seed.
 */
export function generateWorld(seed: number, playerCount: number, city = CITY_ENABLED): World {
  const size = mapSizeFor(playerCount);
  const tiles: Tile[] = Array.from({ length: size * size }, () => ({ ownerId: null }));
  const world: World = { seed, size, tiles };
  if (city) generateCity(world);
  return world;
}

/** Mulberry32: small, fast, and identical on server and clients. */
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

interface Rect { x0: number; z0: number; x1: number; z1: number } // [x0, x1) × [z0, z1)

function generateCity(world: World): void {
  const { size, tiles } = world;
  const rand = rng(world.seed ^ 0xc17e);
  const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
  const set = (r: Rect, kind: TileKind) => {
    for (let z = r.z0; z < r.z1; z++) for (let x = r.x0; x < r.x1; x++) tiles[z * size + x].kind = kind;
  };
  const W = CITY_ROAD_WIDTH;

  // Ring road along the edge, then cut the inside into blocks. Every cut is a road spanning
  // its parent rect, whose border is already road, so the whole network is connected.
  set({ x0: 0, z0: 0, x1: size, z1: size }, 'road');
  const blocks: Rect[] = [];
  const split = (r: Rect) => {
    const w = r.x1 - r.x0;
    const h = r.z1 - r.z0;
    const canX = w > CITY_BLOCK_MAX && w >= 2 * CITY_BLOCK_MIN + W;
    const canZ = h > CITY_BLOCK_MAX && h >= 2 * CITY_BLOCK_MIN + W;
    if (!canX && !canZ) { blocks.push(r); return; }
    const alongX = canX && (!canZ || (w === h ? rand() < 0.5 : w > h));
    const [lo, hi] = alongX ? [r.x0, r.x1] : [r.z0, r.z1];
    const cut = int(lo + CITY_BLOCK_MIN, hi - CITY_BLOCK_MIN - W);
    if (alongX) {
      split({ ...r, x1: cut });
      split({ ...r, x0: cut + W });
    } else {
      split({ ...r, z1: cut });
      split({ ...r, z0: cut + W });
    }
  };
  split({ x0: W, z0: W, x1: size - W, z1: size - W });

  for (const b of blocks) {
    if (rand() < CITY_PARK_CHANCE) { set(b, 'park'); continue; }
    // Lots: cut the block into a grid of strips along each axis, one building per cell.
    const cuts = (lo: number, hi: number) => {
      const out = [lo];
      while (hi - out[out.length - 1] > CITY_LOT_MAX) {
        const rest = hi - out[out.length - 1];
        out.push(out[out.length - 1] + Math.min(int(CITY_LOT_MIN, CITY_LOT_MAX), rest - CITY_LOT_MIN));
      }
      out.push(hi);
      return out;
    };
    const xs = cuts(b.x0, b.x1);
    const zs = cuts(b.z0, b.z1);
    for (let a = 0; a + 1 < xs.length; a++) {
      for (let c = 0; c + 1 < zs.length; c++) {
        const lot = { x0: xs[a], x1: xs[a + 1], z0: zs[c], z1: zs[c + 1] };
        // Only lots on the block edge may stay empty: an inner one would be a walled-in courtyard.
        const onEdge = a === 0 || c === 0 || a + 2 === xs.length || c + 2 === zs.length;
        if (onEdge && rand() < CITY_EMPTY_LOT_CHANCE) { set(lot, 'grass'); continue; }
        set(lot, 'building');
        const height = int(CITY_HEIGHT_MIN, CITY_HEIGHT_MAX);
        for (let z = lot.z0; z < lot.z1; z++) for (let x = lot.x0; x < lot.x1; x++) tiles[z * size + x].height = height;
      }
    }
  }

  world.stops = placeStops(world, rand);
}

/** Road tiles next to a building, spread out so stops don't bunch up. */
function placeStops(world: World, rand: () => number): { x: number; z: number }[] {
  const { size, tiles } = world;
  const kindAt = (x: number, z: number) =>
    x < 0 || z < 0 || x >= size || z >= size ? undefined : tiles[z * size + x].kind;
  const candidates: number[] = [];
  let roads = 0;
  tiles.forEach((t, idx) => {
    if (t.kind !== 'road') return;
    roads++;
    const x = idx % size;
    const z = Math.floor(idx / size);
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => kindAt(x + dx, z + dz) === 'building')) {
      candidates.push(idx);
    }
  });
  // Fisher–Yates with the seeded rng, then greedy picks at least `gap` apart.
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const want = Math.max(1, Math.round(roads * CITY_STOPS_PER_ROAD_TILE));
  const gap = Math.sqrt((size * size) / want) * 0.6;
  const stops: { x: number; z: number }[] = [];
  for (const idx of candidates) {
    if (stops.length >= want) break;
    const p = { x: (idx % size) + 0.5, z: Math.floor(idx / size) + 0.5 };
    if (stops.every((s) => (s.x - p.x) ** 2 + (s.z - p.z) ** 2 >= gap * gap)) stops.push(p);
  }
  return stops;
}

/** Can a bus be at world point (x, z)? False off the map and inside buildings. */
export function isDrivable(world: World, x: number, z: number): boolean {
  if (x < 0 || z < 0 || x >= world.size || z >= world.size) return false;
  return world.tiles[Math.floor(z) * world.size + Math.floor(x)].kind !== 'building';
}

/** (x, z) if drivable, otherwise the center of the nearest drivable tile. For spawning things. */
export function nearestDrivable(world: World, x: number, z: number): { x: number; z: number } {
  if (isDrivable(world, x, z)) return { x, z };
  let best = { x, z };
  let bestD = Infinity;
  world.tiles.forEach((t, idx) => {
    if (t.kind === 'building') return;
    const cx = (idx % world.size) + 0.5;
    const cz = Math.floor(idx / world.size) + 0.5;
    const d = (cx - x) ** 2 + (cz - z) ** 2;
    if (d < bestD) { bestD = d; best = { x: cx, z: cz }; }
  });
  return best;
}
