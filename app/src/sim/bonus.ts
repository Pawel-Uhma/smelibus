import {
  BONUS_RADIUS, BONUS_RESPAWN_S, BONUS_STINK, BUS_RADIUS, BUS_STOPS_PER_TILE,
  CONTROLLER_PATROL_LENGTH, CONTROLLER_RESPAWN_S, CONTROLLER_WALK_SPEED, CONTROLLERS_PER_TILE, DROPPED_STINK_PICKUP_DELAY_S, DROPPED_STINK_TTL_S,
  STINK_DECAY_PER_S, STINK_MAX, STOP_ZUL_CHANCE, TRASH_CANS_PER_TILE,
  TRASH_RESPAWN_S, ZUL_DECAY_MULT, ZUL_SIT_SECONDS,
} from '../shared/config';
import { countPickup } from './cargo';
import { curbSpot, sidewalkPatrol } from './sidewalk';
import { nearestDrivable } from './world';
import type { Bonus, BonusKind, BonusSpot, Bus, GameState } from '../shared/types';

const clampStink = (v: number) => Math.max(0, Math.min(STINK_MAX, v));

/** mulberry32 step on state.bonusRng; returns [0, 1). */
export function rand(state: GameState): number {
  let t = (state.bonusRng = ((state.bonusRng ?? 1) + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** What appears on a spot when it (re)spawns. Regular bonuses (kebab, dog…) are gone (card 041),
 *  so a stop only ever holds a drunk; an old 'map' spot keeps whatever it had. */
function kindFor(spot: BonusSpot, current: BonusKind): BonusKind {
  switch (spot) {
    case 'stop': return 'zul';
    case 'map': return current;
    case 'trash': return 'trash';
    case 'controller': return 'controller';
    case 'dropped': return 'dropped';
    case 'zabka': return 'zul';
    case 'paczkomat': return 'parcel';
  }
}

function respawnTime(spot: BonusSpot): number {
  if (spot === 'trash') return TRASH_RESPAWN_S;
  if (spot === 'controller') return CONTROLLER_RESPAWN_S;
  return BONUS_RESPAWN_S;
}

export function nextId(state: GameState): number {
  return (state.bonuses ?? []).reduce((m, b) => Math.max(m, b.id), -1) + 1;
}

function activate(state: GameState, b: Bonus): void {
  // A stop is empty part of the time: it tries again for a drunk after BONUS_RESPAWN_S.
  if (b.spot === 'stop' && rand(state) >= STOP_ZUL_CHANCE) {
    b.kind = 'zul';
    b.active = false;
    b.respawnAt = state.time + BONUS_RESPAWN_S;
    return;
  }
  b.kind = kindFor(b.spot, b.kind);
  b.amount = b.kind === 'dropped' ? b.amount : BONUS_STINK[b.kind];
  b.active = true;
  b.respawnAt = 0;
}

/**
 * Scatters bonus spots over the map: bus stops (a drunk or nobody), trash cans, ticket controllers.
 * Counts scale with map area. Card 002 may later pass real stop positions instead.
 */
export function spawnBonuses(state: GameState): void {
  state.bonusRng ??= state.world.seed ^ 0x5eed;
  state.bonuses = [];
  const size = state.world.size;
  const area = size * size;
  const margin = 2;
  const counts: [BonusSpot, number][] = [
    ['stop', BUS_STOPS_PER_TILE],
    ['trash', TRASH_CANS_PER_TILE],
    ['controller', CONTROLLERS_PER_TILE],
  ];
  for (const [spot, perTile] of counts) {
    const n = Math.max(1, Math.round(area * perTile));
    for (let i = 0; i < n; i++) {
      const rx = margin + rand(state) * (size - 2 * margin);
      const rz = margin + rand(state) * (size - 2 * margin);
      // City map: stops sit at the generated bus stops, trash cans on the kerb, controllers walk
      // a stretch of sidewalk; the flat map (no streets) puts them anywhere drivable.
      const r = () => rand(state);
      const stop = spot === 'stop' ? state.world.stops?.[i] : undefined;
      const curb = spot === 'trash' ? curbSpot(state.world, r) : null;
      const patrol = spot === 'controller' ? sidewalkPatrol(state.world, r, CONTROLLER_PATROL_LENGTH) : null;
      const { x, z } = stop ?? curb ?? (patrol ? { x: patrol.ax, z: patrol.az } : nearestDrivable(state.world, rx, rz));
      const b: Bonus = {
        id: state.bonuses.length, spot, kind: 'zul', amount: 0, active: false, respawnAt: 0, x, z,
      };
      if (patrol) b.patrol = { ...patrol, speed: CONTROLLER_WALK_SPEED };
      activate(state, b);
      state.bonuses.push(b);
    }
  }
}

/** Puts knocked-out stink (StinkDrop from collideBuses, card 007) on the ground as a one-off bonus. */
export function dropStink(state: GameState, x: number, z: number, amount: number): Bonus | null {
  if (amount <= 0) return null;
  state.bonuses ??= [];
  const b: Bonus = {
    id: nextId(state), spot: 'dropped', kind: 'dropped', x, z, amount,
    active: true, respawnAt: state.time + DROPPED_STINK_TTL_S,
    pickableAt: state.time + DROPPED_STINK_PICKUP_DELAY_S,
  };
  state.bonuses.push(b);
  return b;
}

/** Where a bonus is at game time `time`: walking drunks and controllers move, the rest stays put. */
export function bonusPosition(b: Bonus, time: number): { x: number; z: number } {
  const p = b.patrol;
  if (p) {
    const len = Math.hypot(p.bx - p.ax, p.bz - p.az);
    if (len <= 0) return { x: p.ax, z: p.az };
    const d = (p.speed * time) % (2 * len);
    const k = (d <= len ? d : 2 * len - d) / len;
    return { x: p.ax + (p.bx - p.ax) * k, z: p.az + (p.bz - p.az) * k };
  }
  const w = b.walk;
  if (!w || time >= w.until) return { x: b.x, z: b.z };
  const k = Math.max(0, (time - w.from) / (w.until - w.from));
  return { x: w.x + (b.x - w.x) * k, z: w.z + (b.z - w.z) * k };
}

/** Applies one bonus to a bus. */
export function collect(state: GameState, bus: Bus, b: Bonus): void {
  bus.stink = clampStink(bus.stink + b.amount);
  countPickup(state, bus, b.kind);
  if (b.kind === 'zul') bus.slowDecayUntil = state.time + ZUL_SIT_SECONDS;
  b.active = false;
  b.respawnAt = state.time + respawnTime(b.spot);
}

/** Decay, pickups and respawns. Call once per sim step after buses moved. */
export function updateBonuses(state: GameState, dt: number): void {
  for (const bus of state.buses) {
    const slow = bus.slowDecayUntil !== undefined && state.time < bus.slowDecayUntil;
    bus.stink = clampStink(bus.stink - STINK_DECAY_PER_S * (slow ? ZUL_DECAY_MULT : 1) * dt);
  }

  const bonuses = state.bonuses;
  if (!bonuses) return;
  const reach = BUS_RADIUS + BONUS_RADIUS;
  for (const b of bonuses) {
    if (!b.active) {
      if (state.time >= b.respawnAt) activate(state, b);
      continue;
    }
    if (b.pickableAt !== undefined && state.time < b.pickableAt) continue;
    // Only driven buses pick things up; a parked empty bus doesn't hoard bonuses.
    const at = bonusPosition(b, state.time);
    for (const bus of state.buses) {
      if (bus.driverId === null) continue;
      if (Math.hypot(bus.x - at.x, bus.z - at.z) > reach) continue;
      collect(state, bus, b);
      break;
    }
  }
  // Dropped stink, locker drops and Żabka drunks are one-offs: gone once collected (or expired).
  state.bonuses = bonuses.filter((b) => {
    if (b.spot === 'dropped' || b.spot === 'paczkomat') return b.active && state.time < b.respawnAt;
    if (b.spot === 'zabka') return b.active;
    return true;
  });
}
