import { describe, expect, it } from 'vitest';
import {
  BUS_BOUNCE, BUS_MAX_SPEED, BUS_RADIUS, RAM_MIN_SPEED, RAM_STINK_LOSS,
} from '../shared/config';
import type { Bus } from '../shared/types';
import { collideBuses, NO_INPUT, updateBus } from './bus';

const bus = (over: Partial<Bus> = {}): Bus => ({
  id: 0, x: 20, z: 20, angle: 0, speed: 0, driverId: null, stink: 0, ...over,
});
const run = (b: Bus, throttle: number, steer: number, seconds: number, size = 1000) => {
  for (let t = 0; t < seconds; t += 1 / 60) updateBus(b, { throttle, steer }, 1 / 60, size);
};

describe('updateBus', () => {
  it('accelerates forward along heading and caps speed', () => {
    const b = bus();
    run(b, 1, 0, 5);
    expect(b.speed).toBeCloseTo(BUS_MAX_SPEED);
    expect(b.z).toBeGreaterThan(20);
    expect(b.x).toBeCloseTo(20);
  });

  it('coasts to a stop without input', () => {
    const b = bus({ speed: 5 });
    run(b, 0, 0, 5);
    expect(b.speed).toBe(0);
  });

  it('does not turn in place', () => {
    const b = bus();
    updateBus(b, { throttle: 0, steer: 1 }, 1, 100);
    expect(b.angle).toBe(0);
  });

  it('turns while moving', () => {
    const b = bus({ speed: 10 });
    updateBus(b, { throttle: 0, steer: 1 }, 0.1, 100);
    expect(b.angle).toBeLessThan(0);
  });

  it('stays inside the map', () => {
    const b = bus({ x: 5, z: 5 });
    run(b, 1, 0, 10, 10);
    expect(b.z).toBeLessThanOrEqual(10 - BUS_RADIUS);
    expect(b.x).toBeGreaterThanOrEqual(BUS_RADIUS);
  });

  it('ignores missing input', () => {
    const b = bus();
    updateBus(b, NO_INPUT, 1, 100);
    expect(b).toMatchObject({ x: 20, z: 20, speed: 0 });
  });
});

describe('collideBuses', () => {
  it('pushes overlapping buses apart', () => {
    const a = bus({ x: 10, speed: 8 });
    const b = bus({ x: 10.5 });
    collideBuses([a, b]);
    expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeCloseTo(BUS_RADIUS * 2);
    expect(a.speed).toBeLessThan(8);
  });

  // a drives along +z straight into b, which stands still in front of it.
  const crash = (speed: number, stink = 50) => {
    const a = bus({ id: 0, x: 10, z: 10, speed, stink: 50 });
    const b = bus({ id: 1, x: 10, z: 11.5, stink });
    return { a, b, drops: collideBuses([a, b]) };
  };

  it('bounces the rammer back', () => {
    const { a, b } = crash(10);
    expect(a.speed).toBeCloseTo(-10 * BUS_BOUNCE);
    expect(b.speed).toBe(0);
  });

  it('knocks stink out of the rammed bus onto the ground', () => {
    const { a, b, drops } = crash(10);
    expect(b.stink).toBeCloseTo(50 * (1 - RAM_STINK_LOSS));
    expect(a.stink).toBe(50);
    expect(drops).toHaveLength(1);
    expect(drops[0].amount).toBeCloseTo(50 * RAM_STINK_LOSS);
    // Dropped between the two buses.
    expect(drops[0].x).toBeCloseTo(10);
    expect(drops[0].z).toBeGreaterThan(a.z);
    expect(drops[0].z).toBeLessThan(b.z);
  });

  it('does not ram on a slow nudge', () => {
    const { b, drops } = crash(RAM_MIN_SPEED / 2);
    expect(b.stink).toBe(50);
    expect(drops).toEqual([]);
  });

  it('drops nothing when the rammed bus has no stink', () => {
    expect(crash(10, 0).drops).toEqual([]);
  });

  it('head-on crash knocks stink out of both buses', () => {
    const a = bus({ id: 0, x: 10, z: 10, speed: 10, stink: 40 });
    const b = bus({ id: 1, x: 10, z: 11.5, angle: Math.PI, speed: 10, stink: 20 });
    const drops = collideBuses([a, b]);
    expect(a.stink).toBeCloseTo(40 * (1 - RAM_STINK_LOSS));
    expect(b.stink).toBeCloseTo(20 * (1 - RAM_STINK_LOSS));
    expect(drops.reduce((s, d) => s + d.amount, 0)).toBeCloseTo(60 * RAM_STINK_LOSS);
    expect(a.speed).toBeLessThan(0);
    expect(b.speed).toBeLessThan(0);
  });

  it('rams only once per hit while driving into another bus', () => {
    const a = bus({ id: 0, x: 10, z: 10, stink: 0 });
    const b = bus({ id: 1, x: 10, z: 20, stink: 50 });
    const frames: number[] = [];
    for (let f = 0; f < 120; f++) {
      updateBus(a, { throttle: 1, steer: 0 }, 1 / 60, 1000);
      updateBus(b, NO_INPUT, 1 / 60, 1000);
      if (collideBuses([a, b]).length) frames.push(f);
    }
    expect(frames.length).toBeGreaterThan(0);
    // The rammer bounces back, so the next hit (if any) needs a fresh run-up.
    for (let i = 1; i < frames.length; i++) expect(frames[i] - frames[i - 1]).toBeGreaterThan(10);
  });
});
