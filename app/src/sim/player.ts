import {
  BUS_HIT_WIDTH, BUS_LENGTH, PEDESTRIAN_ENTER_RANGE, PEDESTRIAN_HIT_SPEED, PEDESTRIAN_RADIUS,
  PEDESTRIAN_SPEED, STUN_SECONDS,
} from '../shared/config';
import type { Bus, BusInput, GameState, Player, PlayerId } from '../shared/types';

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

export const isOnFoot = (p: Player): p is Player & { x: number; z: number } =>
  p.busId === null && p.x !== undefined && p.z !== undefined;

export const isStunned = (p: Player, time: number) => (p.stunnedUntil ?? 0) > time;

/** Gets out by the front door: right side of the bus, next to the driver's seat. Frees the bus. */
export function leaveBus(state: GameState, player: Player): void {
  const bus = state.buses.find((b) => b.id === player.busId);
  player.busId = null;
  if (!bus) return;
  bus.driverId = null;
  const at = toWorld(bus, HALF_L - 0.5, -(HALF_W + PEDESTRIAN_RADIUS + 0.15));
  const size = state.world.size;
  player.x = clamp(at.x, PEDESTRIAN_RADIUS, size - PEDESTRIAN_RADIUS);
  player.z = clamp(at.z, PEDESTRIAN_RADIUS, size - PEDESTRIAN_RADIUS);
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

/** Walks in screen directions: the camera looks along +z, so right on screen is -x. */
export function walk(player: Player, input: BusInput, dt: number, mapSize: number): void {
  if (!isOnFoot(player)) return;
  const dx = -(input.steer || 0);
  const dz = input.throttle || 0;
  const len = Math.hypot(dx, dz);
  if (len < 1e-6) return;
  const step = (PEDESTRIAN_SPEED * dt) / len;
  player.x = clamp(player.x + dx * step, PEDESTRIAN_RADIUS, mapSize - PEDESTRIAN_RADIUS);
  player.z = clamp(player.z + dz * step, PEDESTRIAN_RADIUS, mapSize - PEDESTRIAN_RADIUS);
  player.angle = Math.atan2(dx, dz);
}

/** Use key (E) presses and walking. Runs before the buses move. */
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
    if (player.busId === null && !isStunned(player, state.time)) walk(player, input, dt, state.world.size);
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
      const at = toWorld(bus, pu, pv);
      player.x = at.x;
      player.z = at.z;
      if (bus.driverId !== null && Math.abs(bus.speed) >= PEDESTRIAN_HIT_SPEED && !isStunned(player, state.time)) {
        player.stunnedUntil = state.time + STUN_SECONDS;
      }
    }
  }
}
