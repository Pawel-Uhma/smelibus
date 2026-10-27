import {
  BOT_BANK_STINK_MAX, BOT_BANK_STINK_MIN, BOT_HORN_COOLDOWN_S, BOT_HORN_RANGE, BOT_LOOKAHEAD,
  BOT_RAM_MAX_OWN_STINK, BOT_RAM_MIN_STINK, BOT_REPATH_S, BOT_REVERSE_S, BOT_STUCK_S, BUS_LENGTH, BUS_MAX_SPEED, BUS_TURN_FULL_SPEED,
  RAM_STINK_LOSS, ZABKA_TILES,
} from '../shared/config';
import type { Bus, BusInput, GameState, Player, PlayerId, World } from '../shared/types';
import { bonusPosition } from './bonus';
import { isDrivable } from './world';

/**
 * Computer player (card 037). Lives next to the sim on the server and answers with the same
 * BusInput a client would send, so the sim treats it like anyone else. Plays the game loop of a
 * human: collect stink, drive back into the own zone to turn it into tiles, ram rich rivals.
 */
export interface Bot {
  think(state: GameState, id: PlayerId, dt: number): BusInput;
}

type Goal = { x: number; z: number; tile: number };

/** Moving slower than this (tiles/s) while giving gas counts towards being stuck. */
const STUCK_SPEED = 1;
/** Cost of a road tile next to a building, so paths keep to the middle of the street. */
const WALL_COST = 4;
/** Extra path cost (tiles) of turning around instead of setting off forward. */
const TURN_AROUND_COST = 14;
/** A goal the bot got stuck on twice is ignored this long, seconds. */
const GIVE_UP_S = 15;

export function createBot(seed: number): Bot {
  let rngState = seed >>> 0 || 1;
  const rand = () => {
    rngState = (rngState + 0x6d2b79f5) >>> 0;
    let t = rngState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pickBankAt = () => BOT_BANK_STINK_MIN + rand() * (BOT_BANK_STINK_MAX - BOT_BANK_STINK_MIN);

  let bankAt = pickBankAt();
  let path: number[] = [];
  let goal: Goal | null = null;
  let repathIn = 0;
  let stuckFor = 0;
  let reverseFor = 0;
  let reverseSteer = 0;
  /** The current reverse is a three-point turn (ends once the nose points at the goal). */
  let turningAround = false;
  /** Times stuck on the way to the current goal tile; goals it keeps failing are skipped a while. */
  let stuckHits = 0;
  const giveUp = new Map<number, number>();
  let use = 0;
  let horn = 0;
  let hornIn = BOT_HORN_COOLDOWN_S * rand();
  let wander: number | null = null;

  return {
    think(state, id, dt) {
      const me = state.players.find((p) => p.id === id);
      if (!me) return { throttle: 0, steer: 0, use, horn };
      const bus = state.buses.find((b) => b.id === me.busId);
      if (!bus) return onFoot(state, me);

      if (bus.stink < 1) bankAt = Math.min(bankAt, pickBankAt());
      repathIn -= dt;
      if (goal && wander !== null && Math.hypot(goal.x - bus.x, goal.z - bus.z) < 2) wander = null;
      if (repathIn <= 0 || !goal) {
        repathIn = BOT_REPATH_S;
        plan(state, me, bus);
      }

      hornIn -= dt;
      if (hornIn <= 0 && state.buses.some((b) => b !== bus && b.driverId && Math.hypot(b.x - bus.x, b.z - bus.z) < BOT_HORN_RANGE)) {
        horn++;
        hornIn = BOT_HORN_COOLDOWN_S * (0.5 + rand());
      }

      const aim = steerTarget(state.world, bus);
      const diff = wrapAngle(Math.atan2(aim.x - bus.x, aim.z - bus.z) - bus.angle);

      const turn = Math.abs(diff);
      if (reverseFor > 0) {
        reverseFor -= dt;
        // Backed into something, or the nose already points the right way: drive on.
        stuckFor = Math.abs(bus.speed) < STUCK_SPEED ? stuckFor + dt : 0;
        if (stuckFor > BOT_STUCK_S / 2 || (turningAround && turn < 0.8)) reverseFor = 0;
        return { throttle: -1, steer: reverseSteer, use, horn };
      }
      // Steering: updateBus turns by -steer, so a target to the left (diff > 0) needs steer < 0.
      const steer = clamp(-diff * 2.5, -1, 1);
      // Below BUS_TURN_FULL_SPEED the turning circle doesn't get any tighter, so sharp turns are
      // taken at about that speed and straights at full speed.
      const wanted = turn < 0.4 ? BUS_MAX_SPEED : turn < 1 ? 8 : BUS_TURN_FULL_SPEED;
      const throttle = bus.speed < wanted ? 1 : bus.speed > wanted + 1.5 ? -0.6 : 0;
      stuckFor = Math.abs(bus.speed) < STUCK_SPEED ? stuckFor + dt : 0;
      // A goal behind the bus: a three-point turn instead of a circle wider than the street.
      const behind = turn > 2.2 && Math.abs(bus.speed) < BUS_TURN_FULL_SPEED;
      if (stuckFor > BOT_STUCK_S || behind) {
        stuckFor = 0;
        reverseFor = BOT_REVERSE_S * (0.7 + 0.6 * rand());
        // Reversing flips the steering, so the same sign swings the nose towards the target.
        reverseSteer = diff === 0 ? (rand() < 0.5 ? -1 : 1) : Math.sign(diff);
        turningAround = behind;
        if (!behind && goal) {
          repathIn = 0;
          if (++stuckHits >= 2) {
            giveUp.set(goal.tile, state.time + GIVE_UP_S);
            wander = null;
          }
        }
      }
      return { throttle, steer, use, horn };
    },
  };

  /** Chooses what to go for and finds the path to it. */
  function plan(state: GameState, me: Player, bus: Bus) {
    const { world } = state;
    const start = tileOf(world, bus.x, bus.z);
    const blocked = blockedTiles(state);
    // A street is about as wide as a bus is long, so turning around takes a slow three-point
    // turn. Like a driver, the bot rather goes around the block: paths that start forward are
    // compared with ones that turn around plus TURN_AROUND_COST.
    const ahead = searchFrom(world, start, new Set([...blocked, ...behindTiles(world, bus, start)]));
    const any = searchFrom(world, start, blocked);
    const cost = ahead.cost.map((c, i) => Math.min(c, any.cost[i] + TURN_AROUND_COST));
    const parentOf = (tile: number) => (ahead.cost[tile] <= any.cost[tile] + TURN_AROUND_COST ? ahead.parent : any.parent);
    const owns = world.tiles.some((t) => t.ownerId === me.id);
    const inOwn = world.tiles[start].ownerId === me.id;

    let best: Goal | null = null;
    let bestScore = -Infinity;
    for (const [tile, until] of giveUp) if (until <= state.time) giveUp.delete(tile);
    const consider = (x: number, z: number, value: number) => {
      const tile = tileOf(world, x, z);
      if (!Number.isFinite(cost[tile]) || giveUp.has(tile)) return;
      const score = value / (cost[tile] + 4);
      if (score > bestScore) {
        bestScore = score;
        best = { x, z, tile };
      }
    };

    if (owns && bus.stink >= bankAt) {
      // Stink only turns into land when the bus crosses the border into its own zone.
      world.tiles.forEach((t, idx) => {
        if (inOwn === (t.ownerId === me.id)) return;
        consider((idx % world.size) + 0.5, Math.floor(idx / world.size) + 0.5, 1);
      });
    } else {
      for (const b of state.bonuses ?? []) {
        // A scooter rider gives no stink but speed (card 046): worth a small detour.
        if (!b.active || (b.amount <= 0 && b.kind !== 'scooter')) continue;
        if (b.pickableAt !== undefined && b.pickableAt > state.time + 1) continue;
        const at = bonusPosition(b, state.time);
        consider(at.x, at.z, b.kind === 'scooter' ? 8 : b.amount);
      }
      if (bus.stink < BOT_RAM_MAX_OWN_STINK) {
        for (const other of state.buses) {
          if (other === bus || !other.driverId || other.stink < BOT_RAM_MIN_STINK) continue;
          consider(other.x, other.z, other.stink * RAM_STINK_LOSS * 0.7);
        }
      }
    }

    if (!best) {
      // Nothing worth going for: cruise to a random reachable spot.
      if (wander === null || wander === start || !Number.isFinite(cost[wander])) {
        const near = wallTiles(world);
        const reachable = cost.flatMap((c, idx) => (Number.isFinite(c) && !near[idx] && !giveUp.has(idx) ? [idx] : []));
        wander = reachable[Math.floor(rand() * reachable.length)] ?? start;
      }
      best = { x: (wander % world.size) + 0.5, z: Math.floor(wander / world.size) + 0.5, tile: wander };
    } else wander = null;

    if (goal?.tile !== best.tile) stuckHits = 0;
    goal = best;
    path = [];
    const parent = parentOf(goal.tile);
    for (let t = goal.tile; t !== -1; t = parent[t]) path.push(t);
    path.reverse();
  }

  /** The furthest point along the path, a few tiles ahead, that the bus can see in a straight line. */
  function steerTarget(world: World, bus: Bus): { x: number; z: number } {
    const g = goal!;
    // Drop the tiles already reached; the nearest one of the next few is where the bus is now.
    let at = 0;
    let atD = Infinity;
    for (let k = 0; k < Math.min(path.length, BOT_LOOKAHEAD + 2); k++) {
      const c = centre(world, path[k]);
      const d = Math.hypot(c.x - bus.x, c.z - bus.z);
      if (d < atD) { atD = d; at = k; }
    }
    if (at > 0) path.splice(0, at);
    if (path.length <= 2) return g;
    for (let k = Math.min(path.length - 1, BOT_LOOKAHEAD); k >= 1; k--) {
      const c = k === path.length - 1 ? g : centre(world, path[k]);
      if (clearLine(world, bus.x, bus.z, c.x, c.z)) return c;
    }
    return centre(world, path[1]);
  }

  /** Lost the bus (it never happens on its own, but a rematch could): walk to a free one and get in. */
  function onFoot(state: GameState, me: Player): BusInput {
    if (me.x === undefined || me.z === undefined) return { throttle: 0, steer: 0, use, horn };
    let free: Bus | null = null;
    let freeD = Infinity;
    for (const b of state.buses) {
      const d = Math.hypot(b.x - me.x, b.z - me.z);
      if (b.driverId === null && d < freeD) { free = b; freeD = d; }
    }
    if (!free) return { throttle: 0, steer: 0, use, horn };
    if (freeD < 1.8) use++;
    const dx = free.x - me.x;
    const dz = free.z - me.z;
    const len = Math.hypot(dx, dz) || 1;
    // walk() moves in screen directions: x is -steer, z is throttle.
    return { throttle: dz / len, steer: -dx / len, use, horn };
  }
}

/** Tiles a bot never plans through: next to the ticket controller, kiosks, parked buses (lockers are drive-through, card 043). */
function blockedTiles(state: GameState): Set<number> {
  const { world } = state;
  const out = new Set<number>();
  const mark = (x: number, z: number, r: number) => {
    for (let j = Math.floor(z - r); j <= Math.floor(z + r); j++) {
      for (let i = Math.floor(x - r); i <= Math.floor(x + r); i++) {
        if (i >= 0 && j >= 0 && i < world.size && j < world.size) out.add(j * world.size + i);
      }
    }
  };
  for (const b of state.bonuses ?? []) {
    if (!b.active || b.amount >= 0) continue;
    const at = bonusPosition(b, state.time);
    mark(at.x, at.z, 1);
  }
  for (const s of world.zabkas ?? []) mark(s.x, s.z, ZABKA_TILES / 2 - 0.01);
  // Parked empty buses are walls too (the bot's own bus is always driven).
  for (const b of state.buses) if (b.driverId === null) mark(b.x, b.z, BUS_LENGTH / 2);
  return out;
}

/** Tiles beside and behind the bus, up to 4 tiles away (never its own tile). */
function behindTiles(world: World, bus: Bus, start: number): number[] {
  const hx = Math.sin(bus.angle);
  const hz = Math.cos(bus.angle);
  const out: number[] = [];
  for (let j = Math.floor(bus.z) - 4; j <= Math.floor(bus.z) + 4; j++) {
    for (let i = Math.floor(bus.x) - 4; i <= Math.floor(bus.x) + 4; i++) {
      if (i < 0 || j < 0 || i >= world.size || j >= world.size) continue;
      const dx = i + 0.5 - bus.x;
      const dz = j + 0.5 - bus.z;
      const idx = j * world.size + i;
      if (idx !== start && dx * dx + dz * dz < 16 && dx * hx + dz * hz < 0.2 * Math.hypot(dx, dz)) out.push(idx);
    }
  }
  return out;
}

/** Dijkstra over drivable tiles (4-neighbours); tiles hugging a building cost more. */
export function searchFrom(world: World, start: number, blocked: ReadonlySet<number> = new Set()) {
  const { size, tiles } = world;
  const cost = new Array<number>(tiles.length).fill(Infinity);
  const parent = new Array<number>(tiles.length).fill(-1);
  const near = wallTiles(world);
  // Costs are small integers, so a bucket queue is enough.
  const buckets: number[][] = [[start]];
  cost[start] = 0;
  for (let c = 0; c < buckets.length; c++) {
    for (const idx of buckets[c] ?? []) {
      if (cost[idx] !== c) continue;
      const i = idx % size;
      const j = Math.floor(idx / size);
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = i + di;
        const nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= size || nj >= size) continue;
        const n = nj * size + ni;
        if (tiles[n].kind === 'building' || blocked.has(n)) continue;
        const nc = c + (near[n] ? WALL_COST : 1);
        if (nc >= cost[n]) continue;
        cost[n] = nc;
        parent[n] = idx;
        (buckets[nc] ??= []).push(n);
      }
    }
  }
  return { cost, parent };
}

const wallCache = new WeakMap<World, boolean[]>();
/** Per tile: does a building (8-neighbours) or the map edge touch it? Buildings never change, so it is cached. */
function wallTiles(world: World): boolean[] {
  let near = wallCache.get(world);
  if (near) return near;
  const { size, tiles } = world;
  near = tiles.map((_, idx) => {
    const i = idx % size;
    const j = Math.floor(idx / size);
    if (i === 0 || j === 0 || i === size - 1 || j === size - 1) return true;
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        const ni = i + di;
        const nj = j + dj;
        if (ni >= 0 && nj >= 0 && ni < size && nj < size && tiles[nj * size + ni].kind === 'building') return true;
      }
    }
    return false;
  });
  wallCache.set(world, near);
  return near;
}

/** No building on the segment, sampled every quarter tile and widened by half a bus. */
function clearLine(world: World, x0: number, z0: number, x1: number, z1: number): boolean {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const nx = len ? -(z1 - z0) / len : 0;
  const nz = len ? (x1 - x0) / len : 0;
  for (let s = 0; s <= len; s += 0.25) {
    const k = len ? s / len : 0;
    const x = x0 + (x1 - x0) * k;
    const z = z0 + (z1 - z0) * k;
    for (const w of [-0.6, 0, 0.6]) if (!isDrivable(world, x + nx * w, z + nz * w)) return false;
  }
  return true;
}

const tileOf = (world: World, x: number, z: number) =>
  clamp(Math.floor(z), 0, world.size - 1) * world.size + clamp(Math.floor(x), 0, world.size - 1);
const centre = (world: World, idx: number) => ({ x: (idx % world.size) + 0.5, z: Math.floor(idx / world.size) + 0.5 });
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
