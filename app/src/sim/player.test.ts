import { describe, expect, it } from 'vitest';
import { PEDESTRIAN_SPEED, STUN_SECONDS } from '../shared/config';
import type { Bus, BusInput, GameState, Player } from '../shared/types';
import { enterBus, hitPedestrians, isOnFoot, leaveBus, updatePlayers, walk } from './player';

const bus = (over: Partial<Bus> = {}): Bus => ({
  id: 0, x: 20, z: 20, angle: 0, speed: 0, driverId: null, stink: 0, ...over,
});
const player = (over: Partial<Player> = {}): Player => ({
  id: 'a', name: 'A', color: 0, busId: null, connected: true, ...over,
});
const game = (players: Player[], buses: Bus[]): GameState =>
  ({ tick: 0, time: 0, world: { seed: 0, size: 50, tiles: [] }, players, buses }) as GameState;
const press = (state: GameState, p: Player, use: number, rest: Partial<BusInput> = {}) =>
  updatePlayers(state, new Map([[p.id, { throttle: 0, steer: 0, use, ...rest }]]), 1 / 60);

describe('getting in and out', () => {
  it('leaves the bus by the right-hand door and frees it', () => {
    const b = bus({ driverId: 'a' });
    const p = player({ busId: 0 });
    leaveBus(game([p], [b]), p);
    expect(b.driverId).toBeNull();
    expect(isOnFoot(p)).toBe(true);
    // Bus faces +z, so its right side is -x.
    expect(p.x!).toBeLessThan(b.x);
  });

  it('gets into an empty bus in reach', () => {
    const b = bus();
    const p = player({ x: 18.8, z: 20 });
    expect(enterBus(game([p], [b]), p)).toBe(true);
    expect(p.busId).toBe(0);
    expect(b.driverId).toBe('a');
    expect(isOnFoot(p)).toBe(false);
  });

  it('takes over an opponent’s empty bus, stink included', () => {
    const theirs = bus({ stink: 60 });
    const p = player({ x: 21, z: 20 });
    enterBus(game([p], [theirs]), p);
    expect(theirs.driverId).toBe('a');
    expect(theirs.stink).toBe(60);
  });

  it('cannot get into a bus someone drives, or one out of reach', () => {
    const driven = bus({ driverId: 'b' });
    const far = bus({ id: 1, x: 30 });
    const p = player({ x: 21, z: 20 });
    expect(enterBus(game([p], [driven, far]), p)).toBe(false);
    expect(p.busId).toBeNull();
  });

  it('acts on a press of E, not on the first counter it sees', () => {
    const b = bus({ driverId: 'a' });
    const p = player({ busId: 0 });
    const s = game([p], [b]);
    press(s, p, 3);
    expect(p.busId).toBe(0);
    press(s, p, 4);
    expect(p.busId).toBeNull();
    press(s, p, 4);
    expect(p.busId).toBeNull();
    press(s, p, 5);
    expect(p.busId).toBe(0);
  });
});

describe('walking', () => {
  it('walks up the screen (+z) and right on screen (-x)', () => {
    const p = player({ x: 10, z: 10 });
    walk(p, { throttle: 1, steer: 0 }, 1, 50);
    expect(p.z).toBeCloseTo(10 + PEDESTRIAN_SPEED);
    walk(p, { throttle: 0, steer: 1 }, 1, 50);
    expect(p.x).toBeCloseTo(10 - PEDESTRIAN_SPEED);
  });

  it('does not walk diagonally faster', () => {
    const p = player({ x: 10, z: 10 });
    walk(p, { throttle: 1, steer: 1 }, 1, 50);
    expect(Math.hypot(p.x! - 10, p.z! - 10)).toBeCloseTo(PEDESTRIAN_SPEED);
  });
});

describe('hit by a bus', () => {
  it('a fast bus knocks a pedestrian down, then they walk again', () => {
    const b = bus({ driverId: 'b', speed: 8 });
    const p = player({ x: 20.3, z: 20 });
    const s = game([p], [b]);
    hitPedestrians(s);
    expect(p.stunnedUntil).toBeCloseTo(STUN_SECONDS);
    // Pushed out of the bus.
    expect(Math.abs(p.x! - b.x)).toBeGreaterThan(0.6);

    const x = p.x!;
    press(s, p, 0, { throttle: 1 });
    press(s, p, 0, { throttle: 1 });
    expect(p.x).toBe(x);
    expect(enterBus(s, p)).toBe(false);

    s.time = STUN_SECONDS + 0.1;
    press(s, p, 0, { throttle: 1 });
    expect(p.z).toBeGreaterThan(20);
  });

  it('a parked bus only blocks the way', () => {
    const p = player({ x: 20.3, z: 20 });
    hitPedestrians(game([p], [bus()]));
    expect(p.stunnedUntil).toBeUndefined();
    expect(p.x!).toBeGreaterThan(20.6);
  });
});
