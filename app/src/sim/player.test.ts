import { describe, expect, it } from 'vitest';
import { PEDESTRIAN_JUMP_HEIGHT, PEDESTRIAN_JUMP_S, PEDESTRIAN_RADIUS, PEDESTRIAN_SPEED, STUN_SECONDS } from '../shared/config';
import type { Bus, BusInput, GameState, Player, World } from '../shared/types';
import { enterBus, hitPedestrians, isOnFoot, jumpHeight, leaveBus, updatePlayers, walk } from './player';

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

describe('buildings', () => {
  /** 50×50 map with building tiles at the given [i, j]. */
  const city = (buildings: [number, number][]): World => {
    const world: World = { seed: 0, size: 50, tiles: Array.from({ length: 2500 }, () => ({ ownerId: null })) };
    for (const [i, j] of buildings) world.tiles[j * 50 + i].kind = 'building';
    return world;
  };
  const wallAt = (j: number) => Array.from({ length: 50 }, (_, i): [number, number] => [i, j]);
  /** Does the pedestrian circle overlap a building? */
  const inBuilding = (p: Player, world: World) => {
    for (let a = 0; a < Math.PI * 2; a += 0.2) {
      const x = p.x! + Math.sin(a) * (PEDESTRIAN_RADIUS - 1e-6);
      const z = p.z! + Math.cos(a) * (PEDESTRIAN_RADIUS - 1e-6);
      if (world.tiles[Math.floor(z) * 50 + Math.floor(x)]?.kind === 'building') return true;
    }
    return false;
  };
  const stroll = (p: Player, world: World, input: BusInput, seconds: number) => {
    for (let t = 0; t < seconds; t += 1 / 60) {
      walk(p, input, 1 / 60, 50, world);
      expect(inBuilding(p, world)).toBe(false);
    }
  };

  it('stops at a wall it walks into', () => {
    const world = city(wallAt(20));
    const p = player({ x: 10.5, z: 17 });
    stroll(p, world, { throttle: 1, steer: 0 }, 2);
    expect(p.z).toBeCloseTo(20 - PEDESTRIAN_RADIUS);
  });

  it('slides along a wall when walking into it diagonally, without catching on the seams', () => {
    const world = city(wallAt(20));
    const p = player({ x: 10.5, z: 19 });
    // Up and right on screen: +z into the wall, -x along it.
    stroll(p, world, { throttle: 1, steer: 1 }, 2);
    const along = PEDESTRIAN_SPEED * 2 / Math.SQRT2;
    expect(p.x).toBeLessThan(10.5 - along + 0.1);
    expect(p.z).toBeCloseTo(20 - PEDESTRIAN_RADIUS);
  });

  it('walks around the corner of a lone building', () => {
    const world = city([[10, 10]]);
    // Centre just past the edge: only the circle grazes the corner, and it rolls around it.
    const p = player({ x: 11.1, z: 8 });
    stroll(p, world, { throttle: 1, steer: 0 }, 2);
    expect(p.z).toBeGreaterThan(11);
  });

  it('cannot jump through a wall with one long step', () => {
    const world = city(wallAt(20));
    const p = player({ x: 10.5, z: 19 });
    walk(p, { throttle: 1, steer: 0 }, 1, 50, world);
    expect(p.z).toBeLessThan(20);
  });

  it('gets out by the left side when the right door faces a wall', () => {
    // Bus faces +z, right side is -x; buildings fill column 18.
    const world = city(Array.from({ length: 50 }, (_, j): [number, number] => [18, j]));
    const b = bus({ x: 19.5, driverId: 'a' });
    const p = player({ busId: 0 });
    const s = game([p], [b]);
    s.world = world;
    leaveBus(s, p);
    expect(p.x!).toBeGreaterThan(b.x);
    expect(inBuilding(p, world)).toBe(false);
  });

  it('a bus does not shove a pedestrian into a building', () => {
    const world = city(wallAt(20));
    const p = player({ x: 10.5, z: 19.7 });
    // Driven bus right below the pedestrian, overlapping them.
    const b = bus({ x: 10.5, z: 19.7 - 1.6, driverId: 'b', speed: 0 });
    const s = game([p], [b]);
    s.world = world;
    hitPedestrians(s);
    expect(inBuilding(p, world)).toBe(false);
  });
});


describe('jumping', () => {
  const jump = (state: GameState, p: Player, n: number) =>
    updatePlayers(state, new Map([[p.id, { throttle: 0, steer: 0, jump: n }]]), 1 / 60);

  it('hops on a Space press and lands after PEDESTRIAN_JUMP_S', () => {
    const p = player({ x: 10, z: 10 });
    const s = game([p], []);
    jump(s, p, 0);
    expect(p.jumpAt).toBeUndefined();
    s.time = 1;
    jump(s, p, 1);
    expect(p.jumpAt).toBe(1);
    expect(jumpHeight(p, 1 + PEDESTRIAN_JUMP_S / 2)).toBeCloseTo(PEDESTRIAN_JUMP_HEIGHT);
    expect(jumpHeight(p, 1 + PEDESTRIAN_JUMP_S)).toBe(0);
  });

  it("can't jump again mid-air or from inside a bus", () => {
    const p = player({ x: 10, z: 10, jumpSeen: 0 });
    const s = game([p], []);
    jump(s, p, 1);
    s.time = PEDESTRIAN_JUMP_S / 2;
    jump(s, p, 2);
    expect(p.jumpAt).toBe(0);
    const driver = player({ id: 'b', busId: 0, jumpSeen: 0 });
    const s2 = game([driver], [bus({ driverId: 'b' })]);
    jump(s2, driver, 1);
    expect(driver.jumpAt).toBeUndefined();
  });

  it('Space in a bus lets the stink out on the spot', () => {
    const tiles = Array.from({ length: 50 * 50 }, () => ({ ownerId: 'x' }));
    const driver = player({ id: 'b', busId: 0, jumpSeen: 0 });
    const b = bus({ driverId: 'b', stink: 30 });
    const s = game([driver, player({ id: 'x' })], [b]);
    s.world.tiles = tiles;
    jump(s, driver, 1);
    expect(b.stink).toBe(0);
    expect(tiles.some((t) => t.ownerId === 'b')).toBe(true);
  });
});

