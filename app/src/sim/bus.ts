import {
  BUS_ACCEL, BUS_BOUNCE, BUS_BRAKE, BUS_DRAG, BUS_HIT_WIDTH, BUS_LENGTH, BUS_MAX_REVERSE,
  BUS_MAX_SPEED, BUS_TURN_FULL_SPEED, BUS_TURN_RATE, RAM_MIN_SPEED, RAM_STINK_LOSS,
} from '../shared/config';
import type { Bus, BusInput } from '../shared/types';

export const NO_INPUT: BusInput = { throttle: 0, steer: 0 };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const HALF_L = BUS_LENGTH / 2;
const HALF_W = BUS_HIT_WIDTH / 2;

/** The four corners of the bus rectangle, as [x, z] pairs. */
function corners(bus: Bus): [number, number][] {
  const fx = Math.sin(bus.angle), fz = Math.cos(bus.angle);
  const out: [number, number][] = [];
  for (const l of [-HALF_L, HALF_L]) {
    for (const w of [-HALF_W, HALF_W]) out.push([bus.x + fx * l + fz * w, bus.z + fz * l - fx * w]);
  }
  return out;
}

/** How much the bus heading points along the unit direction (nx, nz), -1..1. */
const facing = (bus: Bus, nx: number, nz: number) => Math.sin(bus.angle) * nx + Math.cos(bus.angle) * nz;

/** How fast `bus` moves along the unit direction (nx, nz). */
const speedAlong = (bus: Bus, nx: number, nz: number) => bus.speed * facing(bus, nx, nz);

/**
 * Bounce off a wall in direction (nx, nz). Only the part of the speed going into the wall bounces,
 * so a head-on hit reverses at BUS_BOUNCE and a scrape along the wall barely slows down.
 */
function bounceOff(bus: Bus, nx: number, nz: number): void {
  const into = speedAlong(bus, nx, nz);
  if (into > 0) bus.speed -= (1 + BUS_BOUNCE) * into * facing(bus, nx, nz);
}

/** Arcade driving on a flat map: gas, brake/reverse, steering, edge bounce. Mutates `bus`. */
export function updateBus(bus: Bus, input: BusInput, dt: number, mapSize: number): void {
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

  // Keep all four corners inside the map.
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
 * Resolves one bus–bus overlap. Positions are pushed apart until the rectangles just touch, the
 * bus that can't roll along the normal (hit side-on) moving less. Speed is traded like two equal
 * masses with restitution BUS_BOUNCE, along each bus's own heading (buses don't slide sideways):
 * a rear-end hit shoves the bus in front, a head-on or side-on hit bounces the rammer back, a
 * scrape barely slows anyone down. With `bFixed` only `a` moves (client prediction, where `b` is
 * someone else's bus). Returns the contact point and how fast each bus drove into the other.
 */
function collidePair(a: Bus, b: Bus, bFixed: boolean): { x: number; z: number; hitA: number; hitB: number } | null {
  const c = contact(a, b);
  if (!c) return null;
  const { nx, nz } = c;
  const fa = facing(a, nx, nz);
  const fb = facing(b, nx, nz);
  const wa = fa * fa + 0.1;
  const wb = bFixed ? 0 : fb * fb + 0.1;
  const pa = (c.depth * wa) / (wa + wb);
  const pb = c.depth - pa;
  a.x -= nx * pa;
  a.z -= nz * pa;
  if (!bFixed) {
    b.x += nx * pb;
    b.z += nz * pb;
  }

  const hitA = speedAlong(a, nx, nz);
  const hitB = speedAlong(b, -nx, -nz);
  const closing = hitA + hitB;
  if (closing > 0) {
    const impulse = ((1 + BUS_BOUNCE) * closing) / Math.max(fa * fa + fb * fb, 1e-3);
    a.speed -= impulse * fa;
    if (!bFixed) b.speed += impulse * fb;
  }
  return { x: c.x, z: c.z, hitA, hitB };
}

/** Separation passes per step, so a bus wedged between two others ends up clear of both. */
const COLLISION_PASSES = 4;

/**
 * Keeps buses from overlapping (see collidePair). A bus that drove into the other at
 * RAM_MIN_SPEED or more knocks RAM_STINK_LOSS of its stink out (returned as drops).
 */
export function collideBuses(buses: Bus[]): StinkDrop[] {
  const drops: StinkDrop[] = [];
  for (let pass = 0; pass < COLLISION_PASSES; pass++) {
    for (let i = 0; i < buses.length; i++) {
      for (let j = i + 1; j < buses.length; j++) {
        const hit = collidePair(buses[i], buses[j], false);
        if (!hit || hit.hitA + hit.hitB <= 0) continue;
        if (hit.hitA >= RAM_MIN_SPEED) ram(buses[j], hit.x, hit.z, drops);
        if (hit.hitB >= RAM_MIN_SPEED) ram(buses[i], hit.x, hit.z, drops);
      }
    }
  }
  return drops;
}

/** Client prediction: pushes `bus` out of buses it doesn't control, which stay where they are. */
export function collideWithOthers(bus: Bus, others: readonly Bus[]): void {
  for (let pass = 0; pass < COLLISION_PASSES; pass++) {
    for (const other of others) if (other.id !== bus.id) collidePair(bus, { ...other }, true);
  }
}
