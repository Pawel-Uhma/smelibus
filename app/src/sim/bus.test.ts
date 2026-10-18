import { describe, expect, it } from 'vitest';
import { BUS_MAX_SPEED, BUS_RADIUS } from '../shared/config';
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
});
