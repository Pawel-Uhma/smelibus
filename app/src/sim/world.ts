import { CITY_ENABLED, CITY_OSM_ENABLED, CITY_STOPS_PER_ROAD_TILE, MAX_PLAYERS, TILES_PER_PLAYER } from '../shared/config';
import type { Tile, World } from '../shared/types';
import { generateCity as buildCity } from './city';
import { OSM_ATTRIBUTION, osmNetwork, osmStops } from './osm';

export function mapSizeFor(playerCount: number): number {
  return Math.ceil(Math.sqrt(TILES_PER_PLAYER * Math.max(1, Math.min(playerCount, MAX_PLAYERS))));
}

/**
 * Map for a party. Flat field unless `city`: then streets, blocks of buildings and parks
 * (sim/city.ts), the same for the same seed. With `osm` the streets are real central Warsaw
 * (sim/osm.ts, card 014) and only the buildings depend on the seed.
 */
export function generateWorld(seed: number, playerCount: number, city = CITY_ENABLED, osm = CITY_OSM_ENABLED): World {
  const size = mapSizeFor(playerCount);
  const tiles: Tile[] = Array.from({ length: size * size }, () => ({ ownerId: null }));
  const world: World = { seed, size, tiles };
  if (city) generateCity(world, osm);
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

function generateCity(world: World, osm: boolean): void {
  const rand = rng(world.seed ^ 0xc17e);
  buildCity(world, rand, osm ? osmNetwork(world.size, rand) : undefined);
  const real = osm ? osmStops(world) : [];
  if (osm) world.attribution = OSM_ATTRIBUTION;
  world.stops = real.length ? real : placeStops(world, rand);
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
