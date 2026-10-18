import {
  BUS_HIT_WIDTH, BUS_LENGTH, PEDESTRIAN_ENTER_RANGE, PEDESTRIAN_HIT_SPEED, PEDESTRIAN_RADIUS,
  PEDESTRIAN_JUMP_HEIGHT, PEDESTRIAN_JUMP_S, PEDESTRIAN_SPEED, STUN_SECONDS,
} from '../shared/config';
import type { Bus, BusInput, GameState, Player, PlayerId, World } from '../shared/types';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// The bus rectangle, same as sim/bus.ts collisions.
const HALF_L = BUS_LENGTH / 2;
const HALF_W = BUS_HIT_WIDTH / 2;

/** (x, z) in the bus's frame: u along the heading, v sideways (+v is the bus's left, -v its right). */
function toLocal(bus: Bus, x: number, z: number) {
  const fx = Math.sin(bus.angle), fz = Math.cos(bus.angle);
  const dx = x - bus.x, dz = z - bus.z;
  return { u: dx * fx + dz * fz, v: dx * fz - dz * fx };
}

function toWorld(bus: Bus, u: number, v: number) {
  const fx = Math.sin(bus.angle), fz = Math.cos(bus.angle);
  return { x: bus.x + fx * u + fz * v, z: bus.z + fz * u - fx * v };
}

/** Distance from (x, z) to the bus rectangle, 0 inside. */
function distToBus(bus: Bus, x: number, z: number): number {
  const { u, v } = toLocal(bus, x, z);
  return Math.hypot(u - clamp(u, -HALF_L, HALF_L), v - clamp(v, -HALF_W, HALF_W));
}

const isBuilding = (world: World, i: number, j: number) =>
  i >= 0 && j >= 0 && i < world.size && j < world.size && world.tiles[j * world.size + i]?.kind === 'building';

/**
 * Pushes a pedestrian circle at (x, z) out of building tiles. Inside a tile it leaves through the
 * nearest face that isn't shared with another building, so walking along a wall slides smoothly.
 */
function offBuildings(world: World, x: number, z: number): { x: number; z: number } {
  const r = PEDESTRIAN_RADIUS;
  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    for (let j = Math.floor(z - r); j <= Math.floor(z + r); j++) {
      for (let i = Math.floor(x - r); i <= Math.floor(x + r); i++) {
        if (!isBuilding(world, i, j)) continue;
        const cx = clamp(x, i, i + 1);
        const cz = clamp(z, j, j + 1);
        const d = Math.hypot(x - cx, z - cz);
        if (d >= r) continue;
        if (d > 1e-6) {
          x = cx + ((x - cx) / d) * r;
          z = cz + ((z - cz) / d) * r;
        } else {
          // Centre inside the tile: out through the closest open face.
          const faces = [
            { gap: x - i, di: -1, dj: 0, x: i - r, z },
            { gap: i + 1 - x, di: 1, dj: 0, x: i + 1 + r, z },
            { gap: z - j, di: 0, dj: -1, x, z: j - r },
            { gap: j + 1 - z, di: 0, dj: 1, x, z: j + 1 + r },
          ].sort((a, b) => a.gap - b.gap);
          const out = faces.find((f) => !isBuilding(world, i + f.di, j + f.dj)) ?? faces[0];
          x = out.x;
          z = out.z;
        }
        moved = true;
      }
    }
    if (!moved) break;
  }
  return { x, z };
}

/** Is a pedestrian circle at (x, z) on the map and clear of buildings? */
function standable(world: World, x: number, z: number): boolean {
  const r = PEDESTRIAN_RADIUS;
  if (x < r || z < r || x > world.size - r || z > world.size - r) return false;
  const at = offBuildings(world, x, z);
  return Math.abs(at.x - x) < 1e-9 && Math.abs(at.z - z) < 1e-9;
}

export const isOnFoot = (p: Player): p is Player & { x: number; z: number } =>
  p.busId === null && p.x !== undefined && p.z !== undefined;

export const isStunned = (p: Player, time: number) => (p.stunnedUntil ?? 0) > time;

/** Height above the ground (tiles) of a jumping pedestrian, 0 when standing. */
export function jumpHeight(p: Player, time: number): number {
  if (p.jumpAt === undefined) return 0;
  const t = (time - p.jumpAt) / PEDESTRIAN_JUMP_S;
  return t > 0 && t < 1 ? 4 * PEDESTRIAN_JUMP_HEIGHT * t * (1 - t) : 0;
}

/**
 * Gets out by the front door: right side of the bus, next to the driver's seat. With a wall
 * there, by the left side or the back, else the nearest free spot around the bus. Frees the bus.
 */
export function leaveBus(state: GameState, player: Player): void {
  const bus = state.buses.find((b) => b.id === player.busId);
  player.busId = null;
  if (!bus) return;
  bus.driverId = null;
  const world = state.world;
  const side = HALF_W + PEDESTRIAN_RADIUS + 0.15;
  const doors = [
    toWorld(bus, HALF_L - 0.5, -side),
    toWorld(bus, HALF_L - 0.5, side),
    toWorld(bus, -(HALF_L + PEDESTRIAN_RADIUS + 0.15), 0),
    toWorld(bus, HALF_L + PEDESTRIAN_RADIUS + 0.15, 0),
  ];
  let at = doors.find((d) => standable(world, d.x, d.z));
  // Boxed in: spiral out from the front door to the first free spot.
  for (let ring = 1; !at && ring <= 8; ring++) {
    for (let k = 0; k < 8 * ring && !at; k++) {
      const a = (k / (8 * ring)) * Math.PI * 2;
      const p = { x: doors[0].x + Math.sin(a) * ring * 0.5, z: doors[0].z + Math.cos(a) * ring * 0.5 };
      if (standable(world, p.x, p.z) && distToBus(bus, p.x, p.z) >= PEDESTRIAN_RADIUS) at = p;
    }
  }
  at ??= doors[0];
  player.x = clamp(at.x, PEDESTRIAN_RADIUS, world.size - PEDESTRIAN_RADIUS);
  player.z = clamp(at.z, PEDESTRIAN_RADIUS, world.size - PEDESTRIAN_RADIUS);
  player.angle = bus.angle;
}

/**
 * Gets into the nearest empty bus in reach, own or not: an empty bus belongs to whoever drives
 * it next, stink included (GAME_DESIGN). Returns false when no bus is free and close enough.
 */
export function enterBus(state: GameState, player: Player): boolean {
  if (!isOnFoot(player) || isStunned(player, state.time)) return false;
  let best: Bus | null = null;
  let bestDist = PEDESTRIAN_ENTER_RANGE;
  for (const bus of state.buses) {
    if (bus.driverId !== null) continue;
    const d = distToBus(bus, player.x, player.z);
    if (d <= bestDist) {
      best = bus;
      bestDist = d;
    }
  }
  if (!best) return false;
  best.driverId = player.id;
  player.busId = best.id;
  Object.assign(player, { x: undefined, z: undefined, angle: undefined });
  return true;
}

/**
 * Walks in screen directions: the camera looks along +z, so right on screen is -x. With `world`
 * buildings block the way and the pedestrian slides along their walls.
 */
export function walk(player: Player, input: BusInput, dt: number, mapSize: number, world?: World): void {
  if (!isOnFoot(player)) return;
  const dx = -(input.steer || 0);
  const dz = input.throttle || 0;
  const len = Math.hypot(dx, dz);
  if (len < 1e-6) return;
  const dist = PEDESTRIAN_SPEED * dt;
  // Steps shorter than the radius, so a long dt can't jump through a wall.
  const steps = Math.max(1, Math.ceil(dist / PEDESTRIAN_RADIUS));
  const step = dist / steps / len;
  for (let n = 0; n < steps; n++) {
    let x = clamp(player.x + dx * step, PEDESTRIAN_RADIUS, mapSize - PEDESTRIAN_RADIUS);
    let z = clamp(player.z + dz * step, PEDESTRIAN_RADIUS, mapSize - PEDESTRIAN_RADIUS);
    if (world) ({ x, z } = offBuildings(world, x, z));
    player.x = x;
    player.z = z;
  }
  player.angle = Math.atan2(dx, dz);
}

/** Use key (E) and jump (Space) presses, and walking. Runs before the buses move. */
export function updatePlayers(state: GameState, inputs: ReadonlyMap<PlayerId, BusInput>, dt: number): void {
  for (const player of state.players) {
    const input = inputs.get(player.id);
    if (!input) continue;
    // The first counter we see is the baseline, so joining never counts as a press.
    const pressed = input.use !== undefined && player.useSeen !== undefined && input.use !== player.useSeen;
    if (input.use !== undefined) player.useSeen = input.use;
    if (pressed) {
      if (player.busId !== null) leaveBus(state, player);
      else enterBus(state, player);
    }
    const jumped = input.jump !== undefined && player.jumpSeen !== undefined && input.jump !== player.jumpSeen;
    if (input.jump !== undefined) player.jumpSeen = input.jump;
    if (jumped && isOnFoot(player) && !isStunned(player, state.time) && jumpHeight(player, state.time) === 0) {
      player.jumpAt = state.time;
    }
    if (player.busId === null && !isStunned(player, state.time)) walk(player, input, dt, state.world.size, state.world);
  }
}

/**
 * Pedestrians can't walk through buses. A driven bus moving at PEDESTRIAN_HIT_SPEED or more
 * knocks a pedestrian down for STUN_SECONDS (no walking, no getting in). Runs after the buses move.
 */
export function hitPedestrians(state: GameState): void {
  const r = PEDESTRIAN_RADIUS;
  for (const player of state.players) {
    if (!isOnFoot(player)) continue;
    for (const bus of state.buses) {
      const { u, v } = toLocal(bus, player.x, player.z);
      const cu = clamp(u, -HALF_L, HALF_L);
      const cv = clamp(v, -HALF_W, HALF_W);
      const d = Math.hypot(u - cu, v - cv);
      if (d >= r) continue;
      let pu: number, pv: number;
      if (d > 1e-6) {
        // Outside the rectangle but too close: step back along the gap.
        pu = cu + ((u - cu) / d) * r;
        pv = cv + ((v - cv) / d) * r;
      } else if (HALF_L - Math.abs(u) < HALF_W - Math.abs(v)) {
        // Inside: out through the nearest side.
        pu = (u < 0 ? -1 : 1) * (HALF_L + r);
        pv = v;
      } else {
        pu = u;
        pv = (v > 0 ? 1 : -1) * (HALF_W + r);
      }
      // Shoved by the bus, but never into a building.
      const at = toWorld(bus, pu, pv);
      ({ x: player.x, z: player.z } = offBuildings(state.world, at.x, at.z));
      if (bus.driverId !== null && Math.abs(bus.speed) >= PEDESTRIAN_HIT_SPEED && !isStunned(player, state.time)) {
        player.stunnedUntil = state.time + STUN_SECONDS;
      }
    }
  }
}
