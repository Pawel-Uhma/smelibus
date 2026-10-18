import {
  BUS_ACCEL, BUS_BOUNCE, BUS_BRAKE, BUS_CAPSULE_RADIUS, BUS_DRAG, BUS_LENGTH, BUS_MAX_REVERSE,
  BUS_MAX_SPEED, BUS_TURN_FULL_SPEED, BUS_TURN_RATE, RAM_MIN_SPEED, RAM_STINK_LOSS,
} from '../shared/config';
import type { Bus, BusInput } from '../shared/types';

export const NO_INPUT: BusInput = { throttle: 0, steer: 0 };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Half length of the capsule's inner segment, so the rounded ends reach the bumpers. */
const CAPSULE_HALF = BUS_LENGTH / 2 - BUS_CAPSULE_RADIUS;

/** Rear and front centres of the bus capsule: [rx, rz, fx, fz]. */
function capsule(bus: Bus): [number, number, number, number] {
  const hx = Math.sin(bus.angle) * CAPSULE_HALF;
  const hz = Math.cos(bus.angle) * CAPSULE_HALF;
  return [bus.x - hx, bus.z - hz, bus.x + hx, bus.z + hz];
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

  // Keep both capsule ends inside the map.
  const [rx, rz, fx, fz] = capsule(bus);
  const lo = BUS_CAPSULE_RADIUS;
  const hi = mapSize - BUS_CAPSULE_RADIUS;
  const dx = Math.max(0, lo - Math.min(rx, fx)) - Math.max(0, Math.max(rx, fx) - hi);
  const dz = Math.max(0, lo - Math.min(rz, fz)) - Math.max(0, Math.max(rz, fz) - hi);
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

/** Closest points between segments p1–q1 and p2–q2 (Ericson, Real-Time Collision Detection 5.1.9). */
function closestPoints(
  p1x: number, p1z: number, q1x: number, q1z: number,
  p2x: number, p2z: number, q2x: number, q2z: number,
): [number, number, number, number] {
  const d1x = q1x - p1x, d1z = q1z - p1z;
  const d2x = q2x - p2x, d2z = q2z - p2z;
  const rx = p1x - p2x, rz = p1z - p2z;
  const a = d1x * d1x + d1z * d1z;
  const e = d2x * d2x + d2z * d2z;
  const f = d2x * rx + d2z * rz;
  const c = d1x * rx + d1z * rz;
  const b = d1x * d2x + d1z * d2z;
  const denom = a * e - b * b;
  let s = denom > 1e-9 ? clamp((b * f - c * e) / denom, 0, 1) : 0;
  let t = (b * s + f) / e;
  if (t < 0) {
    t = 0;
    s = clamp(-c / a, 0, 1);
  } else if (t > 1) {
    t = 1;
    s = clamp((b - c) / a, 0, 1);
  }
  return [p1x + d1x * s, p1z + d1z * s, p2x + d2x * t, p2z + d2z * t];
}

/**
 * Pushes overlapping buses apart (capsule shapes). The hit trades speed like two equal masses
 * with restitution BUS_BOUNCE, along each bus's own heading: a rear-end hit shoves the bus in
 * front, a head-on hit bounces both back, a scrape barely slows anyone down. A bus that drove
 * into the other at RAM_MIN_SPEED or more knocks RAM_STINK_LOSS of its stink out (returned as drops).
 */
export function collideBuses(buses: Bus[]): StinkDrop[] {
  const drops: StinkDrop[] = [];
  const minDist = BUS_CAPSULE_RADIUS * 2;
  for (let i = 0; i < buses.length; i++) {
    for (let j = i + 1; j < buses.length; j++) {
      const a = buses[i];
      const b = buses[j];
      const [cax, caz, cbx, cbz] = closestPoints(...capsule(a), ...capsule(b));
      let dx = cbx - cax;
      let dz = cbz - caz;
      let dist = Math.hypot(dx, dz);
      if (dist >= minDist) continue;
      if (dist < 1e-6) {
        // Segments cross: fall back to the centre-to-centre direction.
        dx = b.x - a.x;
        dz = b.z - a.z;
        dist = 0;
      }
      const len = Math.hypot(dx, dz);
      const nx = len > 1e-6 ? dx / len : 1;
      const nz = len > 1e-6 ? dz / len : 0;
      const push = (minDist - dist) / 2;
      a.x -= nx * push;
      a.z -= nz * push;
      b.x += nx * push;
      b.z += nz * push;

      const hitA = speedAlong(a, nx, nz);
      const hitB = speedAlong(b, -nx, -nz);
      const closing = hitA + hitB;
      if (closing <= 0) continue;
      const impulse = ((1 + BUS_BOUNCE) / 2) * closing;
      a.speed -= impulse * facing(a, nx, nz);
      b.speed += impulse * facing(b, nx, nz);

      const cx = (cax + cbx) / 2;
      const cz = (caz + cbz) / 2;
      if (hitA >= RAM_MIN_SPEED) ram(b, cx, cz, drops);
      if (hitB >= RAM_MIN_SPEED) ram(a, cx, cz, drops);
    }
  }
  return drops;
}
