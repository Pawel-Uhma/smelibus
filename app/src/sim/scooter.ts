import { CITY_STREETS, SCOOTER_SPAWN_S, SCOOTER_SPEED, SCOOTER_TILES_PER_RIDER } from '../shared/config';
import type { Bonus, CityStreet, GameState } from '../shared/types';
import { nextId, rand } from './bonus';

/**
 * Kukuryniarze (card 046): guys on electric scooters. One rides out of a block of flats to the
 * nearest street and then up and down its lane (a `walk` out of the door, then a `patrol`), so
 * clients compute where he is without per-tick updates. A bus that eats him gets top speed.
 */

const maxRiders = (size: number) => Math.max(2, Math.round((size * size) / SCOOTER_TILES_PER_RIDER));

/** Nearest point of a street centreline to (x, z): distance along it and to it. */
function project(s: CityStreet, x: number, z: number): { t: number; d: number; len: number } {
  const len = Math.hypot(s.bx - s.ax, s.bz - s.az);
  const ux = (s.bx - s.ax) / len, uz = (s.bz - s.az) / len;
  const t = Math.max(0, Math.min(len, (x - s.ax) * ux + (z - s.az) * uz));
  return { t, d: Math.hypot(s.ax + ux * t - x, s.az + uz * t - z), len };
}

/** A new rider leaving a random block, or null when the map has no blocks or streets. */
export function spawnScooter(state: GameState): Bonus | null {
  for (let i = 0; i < 10; i++) {
    const rider = tryRider(state);
    if (rider) return rider;
  }
  return null;
}

/** One go at a random block; null when its street has no usable stretch of lane on the map. */
function tryRider(state: GameState): Bonus | null {
  const { world } = state;
  const streets = (world.streets ?? []).filter((s) => Math.hypot(s.bx - s.ax, s.bz - s.az) - s.trimA - s.trimB > 6);
  const blocks: number[] = [];
  world.tiles.forEach((t, i) => {
    if (t.building !== undefined && world.buildings?.[t.building]?.style === 'block') blocks.push(i);
  });
  if (!streets.length || !blocks.length) return null;
  const tile = blocks[Math.floor(rand(state) * blocks.length)];
  const x = (tile % world.size) + 0.5, z = Math.floor(tile / world.size) + 0.5;
  let best = streets[0], bp = project(best, x, z);
  for (const s of streets) {
    const p = project(s, x, z);
    if (p.d < bp.d) { best = s; bp = p; }
  }
  // Right-hand lane of the side the block is on.
  const ux = (best.bx - best.ax) / bp.len, uz = (best.bz - best.az) / bp.len;
  const side = (x - best.ax) * -uz + (z - best.az) * ux >= 0 ? 1 : -1;
  const p = CITY_STREETS[best.kind];
  const off = (p.median + p.road * 0.75) * side;
  const at = (t: number) => ({ x: best.ax + ux * t - uz * off, z: best.az + uz * t + ux * off });
  // Ride only the stretch of the lane that is road inside the map, around where he comes out.
  const onRoad = (t: number) => {
    const q = at(t);
    if (q.x < 1 || q.z < 1 || q.x > world.size - 1 || q.z > world.size - 1) return false;
    return world.tiles[Math.floor(q.z) * world.size + Math.floor(q.x)].kind === 'road';
  };
  let tEnter = Math.max(best.trimA + 1, Math.min(bp.len - best.trimB - 1, bp.t));
  if (!onRoad(tEnter)) return null;
  let t0 = tEnter, t1 = tEnter;
  while (t0 - 0.25 >= best.trimA + 1 && onRoad(t0 - 0.25)) t0 -= 0.25;
  while (t1 + 0.25 <= bp.len - best.trimB - 1 && onRoad(t1 + 0.25)) t1 += 0.25;
  if (t1 - t0 < 4) return null;
  tEnter = Math.max(t0, Math.min(t1, tEnter));
  const a = at(t0), b = at(t1), enter = at(tEnter);
  const len = t1 - t0;
  const walkS = Math.hypot(enter.x - x, enter.z - z) / SCOOTER_SPEED;
  const joinAt = state.time + walkS;
  // On side -1 the lane runs b→a, so start heading that way: half a loop further on.
  const along = side === 1 ? tEnter - t0 : 2 * len - (tEnter - t0);
  const offset = ((along - SCOOTER_SPEED * joinAt) % (2 * len) + 2 * len) % (2 * len);
  const rider: Bonus = {
    id: nextId(state), spot: 'scooter', kind: 'scooter', amount: 0, active: true, respawnAt: 0,
    x: enter.x, z: enter.z,
    walk: { x, z, from: state.time, until: joinAt },
    patrol: { ax: a.x, az: a.z, bx: b.x, bz: b.z, speed: SCOOTER_SPEED, offset },
  };
  (state.bonuses ??= []).push(rider);
  return rider;
}

/** Once per step: lets a new rider out every SCOOTER_SPAWN_S while there are fewer than the most. */
export function updateScooters(state: GameState): void {
  state.scooterNextAt ??= 5;
  if (state.time < state.scooterNextAt) return;
  state.scooterNextAt = state.time + SCOOTER_SPAWN_S;
  const riding = (state.bonuses ?? []).filter((b) => b.spot === 'scooter').length;
  if (riding < maxRiders(state.world.size)) spawnScooter(state);
}
