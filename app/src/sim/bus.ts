import {
  BUS_ACCEL, BUS_BOUNCE, BUS_BRAKE, BUS_DRAG, BUS_MAX_REVERSE, BUS_MAX_SPEED,
  BUS_RADIUS, BUS_TURN_FULL_SPEED, BUS_TURN_RATE,
} from '../shared/config';
import type { Bus, BusInput } from '../shared/types';

export const NO_INPUT: BusInput = { throttle: 0, steer: 0 };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

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

  const lo = BUS_RADIUS;
  const hi = mapSize - BUS_RADIUS;
  if (bus.x < lo || bus.x > hi || bus.z < lo || bus.z > hi) {
    bus.x = clamp(bus.x, lo, hi);
    bus.z = clamp(bus.z, lo, hi);
    bus.speed *= -BUS_BOUNCE;
  }
}

/** Pushes overlapping buses apart and bounces them. Card 007 adds ramming (stink loss). */
export function collideBuses(buses: Bus[]): void {
  const minDist = BUS_RADIUS * 2;
  for (let i = 0; i < buses.length; i++) {
    for (let j = i + 1; j < buses.length; j++) {
      const a = buses[i];
      const b = buses[j];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const dist = Math.hypot(dx, dz);
      if (dist >= minDist) continue;
      const nx = dist > 1e-6 ? dx / dist : 1;
      const nz = dist > 1e-6 ? dz / dist : 0;
      const push = (minDist - dist) / 2;
      a.x -= nx * push;
      a.z -= nz * push;
      b.x += nx * push;
      b.z += nz * push;
      a.speed *= BUS_BOUNCE;
      b.speed *= BUS_BOUNCE;
    }
  }
}
