import { describe, expect, it } from 'vitest';
import {
  BUS_BOUNCE, BUS_HIT_WIDTH, BUS_LENGTH, BUS_MAX_SPEED, RAM_MIN_SPEED, RAM_STINK_LOSS,
} from '../shared/config';
import type { Bus } from '../shared/types';
import { collideBuses, collideWithOthers, NO_INPUT, updateBus } from './bus';

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
    // The front bumper stops at the edge, not the centre.
    expect(b.z + BUS_LENGTH / 2).toBeLessThanOrEqual(10 + 1e-9);
    expect(b.x).toBe(5);
  });

  it('bounces back from a wall it hits head-on', () => {
    const b = bus({ x: 5, z: 8.4, speed: 10 });
    updateBus(b, NO_INPUT, 1 / 60, 10);
    expect(b.speed).toBeLessThan(0);
  });

  it('keeps most of its speed when scraping along a wall', () => {
    const b = bus({ x: 1.4, z: 5, angle: -0.2, speed: 10 });
    updateBus(b, NO_INPUT, 1 / 60, 100);
    expect(b.speed).toBeGreaterThan(8);
  });

  it('ignores missing input', () => {
    const b = bus();
    updateBus(b, NO_INPUT, 1, 100);
    expect(b).toMatchObject({ x: 20, z: 20, speed: 0 });
  });
});

describe('collideBuses', () => {
  it('pushes overlapping buses apart without braking a side-by-side scrape', () => {
    const a = bus({ x: 10, speed: 8 });
    const b = bus({ x: 10.5 });
    collideBuses([a, b]);
    expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeCloseTo(BUS_HIT_WIDTH);
    expect(a.speed).toBe(8);
  });

  it('lets buses park side by side closer than their length', () => {
    const a = bus({ x: 10 });
    const b = bus({ x: 10 + BUS_HIT_WIDTH + 0.05 });
    collideBuses([a, b]);
    expect(b.x - a.x).toBeCloseTo(BUS_HIT_WIDTH + 0.05);
  });

  it('keeps buses from overlapping nose to tail', () => {
    const a = bus({ z: 10 });
    const b = bus({ z: 10 + BUS_LENGTH - 0.3 });
    collideBuses([a, b]);
    expect(b.z - a.z).toBeCloseTo(BUS_LENGTH);
  });

  // a drives along +z straight into b, which stands still just in front of it.
  const crash = (speed: number, stink = 50) => {
    const a = bus({ id: 0, x: 10, z: 10, speed, stink: 50 });
    const b = bus({ id: 1, x: 10, z: 10 + BUS_LENGTH - 0.1, stink });
    return { a, b, drops: collideBuses([a, b]) };
  };

  it('shoves the bus in front and slows the rammer', () => {
    const { a, b } = crash(10);
    const impulse = ((1 + BUS_BOUNCE) / 2) * 10;
    expect(a.speed).toBeCloseTo(10 - impulse);
    expect(b.speed).toBeCloseTo(impulse);
  });

  it('knocks a bus hit side-on sideways, without turning or rolling it', () => {
    const a = bus({ id: 0, x: 10, z: 10, speed: 10 });
    const b = bus({ id: 1, x: 10, z: 10 + BUS_LENGTH / 2 + BUS_HIT_WIDTH / 2 - 0.1, angle: Math.PI / 2 });
    collideBuses([a, b]);
    const impulse = ((1 + BUS_BOUNCE) / 2) * 10;
    expect(a.speed).toBeCloseTo(10 - impulse);
    expect(b.speed).toBeCloseTo(0);
    expect(b.pushZ).toBeCloseTo(impulse);
    expect(b.z - a.z).toBeCloseTo(BUS_LENGTH / 2 + BUS_HIT_WIDTH / 2);
    // The victim slides away faster than the rammer follows, so it isn't hit twice.
    run(b, 0, 0, 0.2);
    run(a, 0, 0, 0.2);
    expect(b.angle).toBeCloseTo(Math.PI / 2);
    expect(b.z - a.z).toBeGreaterThan(BUS_LENGTH / 2 + BUS_HIT_WIDTH / 2);
  });

  it('stops corners from cutting into another bus', () => {
    // a's front-right corner pokes into b's rear-left corner; a capsule would let them pass.
    const a = bus({ id: 0, x: 10, z: 10 });
    const b = bus({ id: 1, x: 10 + BUS_HIT_WIDTH - 0.1, z: 10 + BUS_LENGTH - 0.1 });
    collideBuses([a, b]);
    const gapX = Math.abs(b.x - a.x) - BUS_HIT_WIDTH;
    const gapZ = Math.abs(b.z - a.z) - BUS_LENGTH;
    expect(Math.max(gapX, gapZ)).toBeGreaterThan(-1e-6);
  });

  it('never lets a bus drive through another one', () => {
    for (const angle of [Math.PI / 2, Math.PI / 4, Math.PI, 0]) {
      const a = bus({ id: 0, x: 10, z: 5 });
      const b = bus({ id: 1, x: 10, z: 12, angle });
      for (let f = 0; f < 300; f++) {
        updateBus(a, { throttle: 1, steer: 0 }, 1 / 60, 1000);
        updateBus(b, NO_INPUT, 1 / 60, 1000);
        collideBuses([a, b]);
        // Resolved: colliding the same pair again has nothing left to push apart.
        const [a2, b2] = [{ ...a }, { ...b }];
        collideBuses([a2, b2]);
        expect(Math.hypot(a2.x - a.x, a2.z - a.z, b2.x - b.x, b2.z - b.z)).toBeLessThan(1e-3);
      }
      // Straight on, a pushes b ahead of it; at an angle b may be shoved aside, never driven through.
      if (angle % (Math.PI / 2) === 0) expect(a.z).toBeLessThan(b.z);
    }
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
    const b = bus({ id: 1, x: 10, z: 10 + BUS_LENGTH - 0.1, angle: Math.PI, speed: 10, stink: 20 });
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

describe('collideWithOthers', () => {
  it('pushes only the own bus out and bounces it', () => {
    const own = bus({ id: 0, x: 10, z: 10, speed: 10 });
    const other = bus({ id: 1, x: 10, z: 10 + BUS_LENGTH - 0.2 });
    collideWithOthers(own, [other]);
    expect(other).toMatchObject({ z: 10 + BUS_LENGTH - 0.2, speed: 0 });
    expect(other.z - own.z).toBeCloseTo(BUS_LENGTH);
    expect(own.speed).toBeLessThan(10);
  });

  it('ignores the own bus in the list', () => {
    const own = bus({ id: 0, speed: 5 });
    collideWithOthers(own, [{ ...own }]);
    expect(own).toMatchObject({ x: 20, z: 20, speed: 5 });
  });

  // Drives a few buses for `frames` ticks, colliding them like stepGame does.
  const drive = (buses: Bus[], throttles: number[], frames: number, size = 1000) => {
    let rams = 0;
    for (let f = 0; f < frames; f++) {
      buses.forEach((b, i) => updateBus(b, { throttle: throttles[i] ?? 0, steer: 0 }, 1 / 60, size));
      rams += collideBuses(buses, size).length;
    }
    return rams;
  };

  it('does not keep ramming a bus it is pushing along', () => {
    // Both already rolling fast, bumper to bumper: only the speed difference counts.
    const a = bus({ id: 0, x: 10, z: 10, speed: 12 });
    const b = bus({ id: 1, x: 10, z: 10 + BUS_LENGTH, speed: 11, stink: 50 });
    expect(drive([a, b], [1, 0], 30)).toBe(0);
    expect(b.stink).toBe(50);
    expect(b.z - a.z).toBeGreaterThan(BUS_LENGTH - 0.01);
  });

  it('keeps going after scraping another bus at a shallow angle', () => {
    const a = bus({ id: 0, x: 10, z: 10, speed: 14, angle: 0.14 });
    const b = bus({ id: 1, x: 12.6, z: 25 });
    let slowest = a.speed;
    for (let f = 0; f < 120; f++) {
      drive([a, b], [1, 0], 1);
      slowest = Math.min(slowest, a.speed);
    }
    expect(slowest).toBeGreaterThan(12);
    expect(a.z).toBeGreaterThan(b.z + BUS_LENGTH);
  });

  it('sideways knock-back fades out', () => {
    const b = bus({ pushX: 8 });
    run(b, 0, 0, 1);
    expect(b.pushX).toBeUndefined();
    expect(b.x).toBeGreaterThan(21);
    expect(b.x).toBeLessThan(23);
  });

  it('does not push a bus off the map', () => {
    const size = 60;
    const a = bus({ id: 0, x: 30, z: 40 });
    const b = bus({ id: 1, x: 30, z: 57 });
    for (let f = 0; f < 300; f++) {
      drive([a, b], [1, 0], 1, size);
      expect(b.z + BUS_LENGTH / 2).toBeLessThanOrEqual(size + 1e-6);
    }
    expect(b.z - a.z).toBeGreaterThan(BUS_LENGTH - 0.01);
  });

  it('separates a pile-up of buses', () => {
    const buses = [0, 1, 2, 3, 4].map((k) => {
      const angle = (k * 2 * Math.PI) / 5;
      return bus({ id: k, x: 30 - Math.sin(angle) * 15, z: 30 - Math.cos(angle) * 15, angle, speed: 14 });
    });
    drive(buses, [1, 1, 1, 1, 1], 240, 60);
    const copy = buses.map((b) => ({ ...b }));
    collideBuses(copy, 60);
    copy.forEach((c, i) => expect(Math.hypot(c.x - buses[i].x, c.z - buses[i].z)).toBeLessThan(0.01));
    for (const b of buses) expect(Math.hypot(b.x - 30, b.z - 30)).toBeLessThan(6);
  });
});
