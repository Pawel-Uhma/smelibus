import {
  BUS_ACCEL, BUS_BOUNCE, BUS_BRAKE, BUS_DRAG, BUS_HIT_WIDTH, BUS_LENGTH, BUS_MAX_REVERSE,
  BUS_MAX_SPEED, BUS_SIDE_FRICTION, BUS_TURN_FULL_SPEED, BUS_TURN_RATE, RAM_MIN_SPEED, RAM_STINK_LOSS,
} from '../shared/config';
import type { Bus, BusInput, World } from '../shared/types';

export const NO_INPUT: BusInput = { throttle: 0, steer: 0 };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const HALF_L = BUS_LENGTH / 2;
const HALF_W = BUS_HIT_WIDTH / 2;

/** The four corners of the bus rectangle, as [x, z] pairs. */
export function corners(bus: Bus): [number, number][] {
  const fx = Math.sin(bus.angle), fz = Math.cos(bus.angle);
  const out: [number, number][] = [];
  for (const l of [-HALF_L, HALF_L]) {
    for (const w of [-HALF_W, HALF_W]) out.push([bus.x + fx * l + fz * w, bus.z + fz * l - fx * w]);
  }
  return out;
}

/** How fast `bus` moves along the unit direction (nx, nz): driving plus sideways knock-back. */
const speedAlong = (bus: Bus, nx: number, nz: number) =>
  (Math.sin(bus.angle) * bus.speed + (bus.pushX ?? 0)) * nx + (Math.cos(bus.angle) * bus.speed + (bus.pushZ ?? 0)) * nz;

function setPush(bus: Bus, px: number, pz: number): void {
  if (Math.abs(px) < 1e-3 && Math.abs(pz) < 1e-3) {
    delete bus.pushX;
    delete bus.pushZ;
  } else {
    bus.pushX = px;
    bus.pushZ = pz;
  }
}

/**
 * Changes the bus velocity by (dvx, dvz): the part along the heading goes into `speed`, the part
 * sideways into the knock-back, which the tyres scrub away over the next moments.
 */
function kick(bus: Bus, dvx: number, dvz: number): void {
  const fx = Math.sin(bus.angle), fz = Math.cos(bus.angle);
  const along = dvx * fx + dvz * fz;
  bus.speed += along;
  setPush(bus, (bus.pushX ?? 0) + dvx - along * fx, (bus.pushZ ?? 0) + dvz - along * fz);
}

/**
 * Bounce off a wall in direction (nx, nz). Only the part of the velocity going into the wall
 * bounces, so a head-on hit reverses at BUS_BOUNCE and a scrape along the wall barely slows down.
 */
export function bounceOff(bus: Bus, nx: number, nz: number): void {
  const into = speedAlong(bus, nx, nz);
  if (into > 0) kick(bus, -(1 + BUS_BOUNCE) * into * nx, -(1 + BUS_BOUNCE) * into * nz);
}

/** Separation passes per step, so a bus wedged between two others ends up clear of both. */
const COLLISION_PASSES = 4;

const isBuilding = (world: World, i: number, j: number) =>
  i >= 0 && j >= 0 && i < world.size && j < world.size && world.tiles[j * world.size + i].kind === 'building';

/**
 * How far to push the bus out of building tile (i, j), separating axes of the bus and the tile.
 * Faces shared with a neighbouring building (or the map edge) are skipped, so a bus sliding along
 * a wall made of several tiles doesn't catch on the seams. Returns the push or null if apart.
 */
interface Push {
  px: number;
  pz: number;
  depth: number;
}

function tilePush(bus: Bus, world: World, i: number, j: number): Push | null {
  const fx = Math.sin(bus.angle), fz = Math.cos(bus.angle);
  const dx = bus.x - (i + 0.5);
  const dz = bus.z - (j + 0.5);
  let best: Push | null = null;
  let fallback: Push | null = null;
  for (const [ax, az] of [[1, 0], [0, 1], [fx, fz], [fz, -fx]]) {
    const reach = HALF_L * Math.abs(fx * ax + fz * az) + HALF_W * Math.abs(fz * ax - fx * az);
    const d = dx * ax + dz * az;
    const depth = reach + 0.5 * (Math.abs(ax) + Math.abs(az)) - Math.abs(d);
    if (depth <= 0) return null;
    const s = d < 0 ? -1 : 1;
    const push: Push = { px: ax * s, pz: az * s, depth };
    if (!fallback || depth < fallback.depth) fallback = push;
    // The neighbour this push points to; a building there (or the map edge) makes it an inner face.
    const [ni, nj] = Math.abs(push.px) > Math.abs(push.pz) ? [i + Math.sign(push.px), j] : [i, j + Math.sign(push.pz)];
    const inner = isBuilding(world, ni, nj) || ni < 0 || nj < 0 || ni >= world.size || nj >= world.size;
    if (!inner && (!best || depth < best.depth)) best = push;
  }
  return best ?? fallback;
}

/** Pushes the bus out of buildings and bounces it off them like off the map edge. */
function keepOffBuildings(bus: Bus, world: World): void {
  for (let pass = 0; pass < COLLISION_PASSES; pass++) {
    const cs = corners(bus);
    const xs = cs.map((c) => c[0]);
    const zs = cs.map((c) => c[1]);
    let best: Push | null = null;
    for (let j = Math.floor(Math.min(...zs)); j <= Math.floor(Math.max(...zs)); j++) {
      for (let i = Math.floor(Math.min(...xs)); i <= Math.floor(Math.max(...xs)); i++) {
        if (!isBuilding(world, i, j)) continue;
        const push = tilePush(bus, world, i, j);
        if (push && (!best || push.depth > best.depth)) best = push;
      }
    }
    if (!best) return;
    bus.x += best.px * best.depth;
    bus.z += best.pz * best.depth;
    bounceOff(bus, -best.px, -best.pz);
  }
}

/** Does the whole bus fit on the map without touching a building? */
function fits(bus: Bus, world: World): boolean {
  const cs = corners(bus);
  if (cs.some(([x, z]) => x < 0 || z < 0 || x > world.size || z > world.size)) return false;
  for (const [x, z] of cs) {
    const i = Math.floor(x), j = Math.floor(z);
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        if (isBuilding(world, i + di, j + dj) && tilePush(bus, world, i + di, j + dj)) return false;
      }
    }
  }
  return true;
}

/**
 * Puts a parked bus at the spot nearest to (x, z) where all of it fits between the buildings,
 * keeping its heading if it can, otherwise lined up with the streets. For spawning.
 */
export function parkBus(bus: Bus, world: World, x: number, z: number): void {
  const angles = [bus.angle, 0, Math.PI / 2, Math.PI, -Math.PI / 2];
  const ci = Math.floor(x), cj = Math.floor(z);
  for (let r = 0; r < world.size; r++) {
    const ring: [number, number][] = [];
    for (let j = cj - r; j <= cj + r; j++) {
      for (let i = ci - r; i <= ci + r; i++) if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) === r) ring.push([i, j]);
    }
    ring.sort((p, q) => (p[0] - ci) ** 2 + (p[1] - cj) ** 2 - (q[0] - ci) ** 2 - (q[1] - cj) ** 2);
    for (const [i, j] of ring) {
      for (const angle of angles) {
        const spot = { ...bus, x: r ? i + 0.5 : x, z: r ? j + 0.5 : z, angle };
        if (fits(spot, world)) {
          Object.assign(bus, { x: spot.x, z: spot.z, angle });
          return;
        }
      }
    }
  }
  Object.assign(bus, { x, z });
}

/**
 * Moves all four corners back inside the map and bounces off the edge that was hit; with `world`
 * also out of its buildings.
 */
function keepInside(bus: Bus, mapSize: number, world?: World): void {
  const cs = corners(bus);
  const xs = cs.map((c) => c[0]);
  const zs = cs.map((c) => c[1]);
  const dx = Math.max(0, -Math.min(...xs)) - Math.max(0, Math.max(...xs) - mapSize);
  const dz = Math.max(0, -Math.min(...zs)) - Math.max(0, Math.max(...zs) - mapSize);
  if (dx) {
    bus.x += dx;
    bounceOff(bus, -Math.sign(dx), 0);
  }
  if (dz) {
    bus.z += dz;
    bounceOff(bus, 0, -Math.sign(dz));
  }
  if (world) keepOffBuildings(bus, world);
}

/**
 * Arcade driving: gas, brake/reverse, steering, bounce off the map edge and, with `world`, off
 * its buildings. Mutates `bus`.
 */
export function updateBus(bus: Bus, input: BusInput, dt: number, mapSize: number, world?: World): void {
  const throttle = clamp(input.throttle, -1, 1);
  const steer = clamp(input.steer, -1, 1);

  if (throttle > 0) {
    bus.speed += (bus.speed < 0 ? BUS_BRAKE : BUS_ACCEL) * throttle * dt;
  } else if (throttle < 0) {
    bus.speed += (bus.speed > 0 ? BUS_BRAKE : BUS_ACCEL) * throttle * dt;
  } else {
    const drag = BUS_DRAG * dt;
    bus.speed = Math.abs(bus.speed) <= drag ? 0 : bus.speed - Math.sign(bus.speed) * drag;
  }
  bus.speed = clamp(bus.speed, -BUS_MAX_REVERSE, BUS_MAX_SPEED);

  // Steering scales with speed and flips in reverse, like a car.
  const grip = clamp(bus.speed / BUS_TURN_FULL_SPEED, -1, 1);
  bus.angle -= steer * BUS_TURN_RATE * grip * dt;

  bus.x += Math.sin(bus.angle) * bus.speed * dt;
  bus.z += Math.cos(bus.angle) * bus.speed * dt;

  if (bus.pushX !== undefined || bus.pushZ !== undefined) {
    const px = bus.pushX ?? 0;
    const pz = bus.pushZ ?? 0;
    bus.x += px * dt;
    bus.z += pz * dt;
    const k = Math.max(0, 1 - (BUS_SIDE_FRICTION * dt) / Math.hypot(px, pz));
    setPush(bus, px * k, pz * k);
  }

  keepInside(bus, mapSize, world);
}

/** Stink knocked out of a rammed bus, at the contact point. Becomes a bonus on the ground. */
export interface StinkDrop {
  x: number;
  z: number;
  amount: number;
}

function ram(victim: Bus, x: number, z: number, drops: StinkDrop[]): void {
  const amount = victim.stink * RAM_STINK_LOSS;
  if (amount <= 0) return;
  victim.stink -= amount;
  drops.push({ x, z, amount });
}

interface Contact {
  /** Unit normal from a to b. */
  nx: number;
  nz: number;
  depth: number;
  /** Contact point. */
  x: number;
  z: number;
}

/** Overlap of two bus rectangles by separating axes, or null when they don't touch. */
function contact(a: Bus, b: Bus): Contact | null {
  const axes: [number, number, Bus][] = [];
  for (const bus of [a, b]) {
    const fx = Math.sin(bus.angle), fz = Math.cos(bus.angle);
    axes.push([fx, fz, bus], [fz, -fx, bus]);
  }
  const reach = (bus: Bus, nx: number, nz: number) => {
    const f = Math.abs(Math.sin(bus.angle) * nx + Math.cos(bus.angle) * nz);
    const r = Math.abs(Math.cos(bus.angle) * nx - Math.sin(bus.angle) * nz);
    return HALF_L * f + HALF_W * r;
  };
  let best: Contact | null = null;
  let owner: Bus = a;
  for (const [ax, az, bus] of axes) {
    const d = (b.x - a.x) * ax + (b.z - a.z) * az;
    const depth = reach(a, ax, az) + reach(b, ax, az) - Math.abs(d);
    if (depth <= 0) return null;
    if (!best || depth < best.depth - 1e-9) {
      const s = d < 0 ? -1 : 1;
      best = { nx: ax * s, nz: az * s, depth, x: 0, z: 0 };
      owner = bus;
    }
  }
  const c = best!;
  // Contact point: the corners of the other bus that dig deepest into the face, averaged
  // (a whole edge when the buses touch flat, e.g. nose to tail).
  const other = owner === a ? b : a;
  const sign = owner === a ? 1 : -1;
  const dots = corners(other).map(([x, z]) => ({ x, z, d: sign * (x * c.nx + z * c.nz) }));
  const min = Math.min(...dots.map((p) => p.d));
  const deep = dots.filter((p) => p.d < min + 1e-3);
  c.x = deep.reduce((s, p) => s + p.x, 0) / deep.length;
  c.z = deep.reduce((s, p) => s + p.z, 0) / deep.length;
  return c;
}

/**
 * Resolves one bus–bus overlap: positions are pushed apart until the rectangles just touch, and
 * velocity is traded like two equal masses with restitution BUS_BOUNCE. A rear-end hit shoves the
 * bus in front, a head-on hit bounces both back, a T-bone knocks the victim sideways, a scrape
 * nudges both apart without braking. With `bFixed` only `a` moves and `b` acts like a wall (client
 * prediction, where `b` is someone else's bus). Returns the contact point, how fast each bus drove
 * into the other and their closing speed.
 */
function collidePair(
  a: Bus, b: Bus, bFixed: boolean, mapSize: number, world?: World,
): { x: number; z: number; hitA: number; hitB: number; closing: number } | null {
  const c = contact(a, b);
  if (!c) return null;
  const { nx, nz } = c;
  const pa = bFixed ? c.depth : c.depth / 2;
  a.x -= nx * pa;
  a.z -= nz * pa;
  if (!bFixed) {
    b.x += nx * (c.depth - pa);
    b.z += nz * (c.depth - pa);
  }
  if (mapSize < Infinity) {
    keepInside(a, mapSize, world);
    if (!bFixed) keepInside(b, mapSize, world);
  }

  const hitA = speedAlong(a, nx, nz);
  const hitB = speedAlong(b, -nx, -nz);
  const closing = hitA + hitB;
  if (closing > 0) {
    const impulse = (bFixed ? 1 + BUS_BOUNCE : (1 + BUS_BOUNCE) / 2) * closing;
    kick(a, -impulse * nx, -impulse * nz);
    if (!bFixed) kick(b, impulse * nx, impulse * nz);
  }
  return { x: c.x, z: c.z, hitA, hitB, closing };
}

/**
 * Keeps buses from overlapping (see collidePair); with `mapSize` nobody is pushed off the map,
 * with `world` nobody into a building.
 * When two buses close in at RAM_MIN_SPEED or more, each one that drove into the other knocks
 * RAM_STINK_LOSS of the other's stink out (returned as drops). Pushing a bus along is not a ram.
 */
export function collideBuses(buses: Bus[], mapSize = Infinity, world?: World): StinkDrop[] {
  const drops: StinkDrop[] = [];
  for (let pass = 0; pass < COLLISION_PASSES; pass++) {
    let touched = false;
    for (let i = 0; i < buses.length; i++) {
      for (let j = i + 1; j < buses.length; j++) {
        const hit = collidePair(buses[i], buses[j], false, mapSize, world);
        if (!hit) continue;
        touched = true;
        if (hit.closing < RAM_MIN_SPEED) continue;
        if (hit.hitA > 0) ram(buses[j], hit.x, hit.z, drops);
        if (hit.hitB > 0) ram(buses[i], hit.x, hit.z, drops);
      }
    }
    if (!touched) break;
  }
  return drops;
}

/** Client prediction: pushes `bus` out of buses it doesn't control, which stay where they are. */
export function collideWithOthers(bus: Bus, others: readonly Bus[], mapSize = Infinity, world?: World): void {
  for (let pass = 0; pass < COLLISION_PASSES; pass++) {
    for (const other of others) if (other.id !== bus.id) collidePair(bus, { ...other }, true, mapSize, world);
  }
}
