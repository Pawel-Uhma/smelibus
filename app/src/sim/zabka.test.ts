import { describe, expect, it } from 'vitest';
import {
  BONUS_STINK, BUS_LENGTH, ZABKA_SPAWN_MIN_S, ZABKA_ZUL_FALLEN_STINK, ZABKA_ZUL_WALK_MAX, ZABKA_ZULS_MAX,
  ZABKA_ZULS_START,
} from '../shared/config';
import type { Bus, GameState } from '../shared/types';
import { bonusPosition, updateBonuses } from './bonus';
import { NO_INPUT, updateBus } from './bus';
import { addPlayer, createGame } from './game';
import { generateWorld } from './world';
import { collideZabkas, placeZabkas, updateZabkas, zabkaFront, zabkaInterval, zabkaLimit } from './zabka';

const zabkaZuls = (s: GameState, shop?: number) =>
  s.bonuses!.filter((b) => b.spot === 'zabka' && (shop === undefined || b.zabka === shop));

/** Drunks let out during [from, to), each one picked up right away so the limit never kicks in. */
function spawnsBetween(s: GameState, from: number, to: number): number {
  let n = 0;
  for (s.time = from; s.time < to; s.time += 0.5) {
    updateZabkas(s);
    n += zabkaZuls(s).length;
    s.bonuses = s.bonuses!.filter((b) => b.spot !== 'zabka');
  }
  return n;
}

describe('Żabka shops', () => {
  it('places shops from the seed, inside the map and apart', () => {
    const s = createGame(3);
    const shops = s.world.zabkas!;
    expect(shops.length).toBeGreaterThan(0);
    expect(placeZabkas(generateWorld(3, 8))).toEqual(shops);
    for (const p of shops) {
      expect(p.x).toBeGreaterThan(1);
      expect(p.x).toBeLessThan(s.world.size - 1);
      expect(p.z).toBeGreaterThan(1);
      expect(p.z).toBeLessThan(s.world.size - 1);
    }
    expect(s.zabkaNextAt).toHaveLength(shops.length);
  });

  it('stands on free lots next to a road on the city map', () => {
    const world = generateWorld(5, 8, true);
    const kind = (x: number, z: number) => world.tiles[Math.floor(z) * world.size + Math.floor(x)].kind;
    const shops = placeZabkas(world);
    expect(shops.length).toBeGreaterThan(0);
    for (const p of shops) {
      expect(['road', 'building']).not.toContain(kind(p.x, p.z));
      const roadNext = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => kind(p.x + dx, p.z + dz) === 'road');
      expect(roadNext).toBe(true);
    }
  });

  it('lets drunks out more often and allows more of them later in the match', () => {
    expect(zabkaInterval(10 * 60)).toBeLessThan(zabkaInterval(0));
    expect(zabkaInterval(60 * 60)).toBe(ZABKA_SPAWN_MIN_S);
    expect(zabkaLimit(0)).toBe(ZABKA_ZULS_START);
    expect(zabkaLimit(10 * 60)).toBeGreaterThan(zabkaLimit(0));
    expect(zabkaLimit(60 * 60)).toBe(ZABKA_ZULS_MAX);

    const s = createGame(1);
    s.bonuses = [];
    const early = spawnsBetween(s, 0, 120);
    const late = spawnsBetween(s, 8 * 60, 10 * 60);
    expect(early).toBeGreaterThan(0);
    expect(late).toBeGreaterThan(early * 1.5);
  });

  it('never keeps more drunks at a shop than the limit', () => {
    const s = createGame(1);
    s.bonuses = [];
    const shops = s.world.zabkas!.length;
    for (s.time = 0; s.time < 20 * 60; s.time += 0.5) {
      updateZabkas(s);
      for (let i = 0; i < shops; i++) expect(zabkaZuls(s, i).length).toBeLessThanOrEqual(zabkaLimit(s.time));
    }
    expect(zabkaZuls(s, 0)).toHaveLength(ZABKA_ZULS_MAX);
  });

  it('a picked-up drunk is gone for good and gives the żul bonus', () => {
    const s = createGame(1);
    const p = addPlayer(s, 'a', 'A');
    s.bonuses = [];
    s.time = s.zabkaNextAt![0];
    updateZabkas(s);
    const zul = zabkaZuls(s, 0)[0];
    expect(zul.kind).toBe('zul');
    const bus = s.buses.find((b) => b.id === p.busId)!;
    bus.stink = 0;
    const at = bonusPosition(zul, s.time);
    bus.x = at.x;
    bus.z = at.z;
    updateBonuses(s, 0);
    expect(bus.stink).toBe(BONUS_STINK.zul);
    expect(bus.slowDecayUntil).toBeGreaterThan(s.time);
    s.time += 120;
    updateBonuses(s, 0);
    expect(s.bonuses!.some((b) => b.id === zul.id)).toBe(false);
  });
});

describe('Żabka drunks walking out', () => {
  function letOut() {
    const s = createGame(1);
    s.bonuses = [];
    s.time = s.zabkaNextAt![0];
    updateZabkas(s);
    return { s, zul: zabkaZuls(s, 0)[0], shop: s.world.zabkas![0] };
  }

  it('comes out of the door, walks away from the shop and stops a short way off', () => {
    const { s, zul, shop } = letOut();
    const w = zul.walk!;
    const front = zabkaFront(s.world, shop);
    // Starts just outside the kiosk, on the door side.
    expect((w.x - shop.x) * front.x + (w.z - shop.z) * front.z).toBeGreaterThan(0.5);
    const start = bonusPosition(zul, w.from);
    expect(start).toEqual({ x: w.x, z: w.z });
    const walked = Math.hypot(zul.x - w.x, zul.z - w.z);
    expect(walked).toBeGreaterThan(0);
    expect(walked).toBeLessThanOrEqual(ZABKA_ZUL_WALK_MAX + 1e-9);
    // Away from the shop, never back into it.
    expect(Math.hypot(zul.x - shop.x, zul.z - shop.z)).toBeGreaterThan(Math.hypot(w.x - shop.x, w.z - shop.z) - 1e-9);
    const mid = bonusPosition(zul, (w.from + w.until) / 2);
    expect(mid.x).toBeCloseTo((w.x + zul.x) / 2, 9);
    expect(mid.z).toBeCloseTo((w.z + zul.z) / 2, 9);
    expect(bonusPosition(zul, w.until + 10)).toEqual({ x: zul.x, z: zul.z });
  });

  it('stinks more once he has fallen over', () => {
    const { s, zul } = letOut();
    expect(zul.amount).toBe(BONUS_STINK.zul);
    s.time = zul.walk!.until - 0.01;
    updateZabkas(s);
    expect(zul.amount).toBe(BONUS_STINK.zul);
    s.time = zul.walk!.until;
    updateZabkas(s);
    expect(zul.amount).toBe(ZABKA_ZUL_FALLEN_STINK);
    expect(ZABKA_ZUL_FALLEN_STINK).toBeGreaterThan(BONUS_STINK.zul);
  });
});

describe('kiosk collisions', () => {
  const shop = { x: 20.5, z: 20.5 };
  const bus = (x: number, z: number, angle: number, speed: number): Bus =>
    ({ id: 0, x, z, angle, speed, driverId: 'a', stink: 0 });

  it('stops a bus driving head-on into the kiosk and bounces it back', () => {
    const b = bus(shop.x, shop.z - 4, 0, 10);
    for (let t = 0; t < 1.5; t += 1 / 60) {
      updateBus(b, NO_INPUT, 1 / 60, 100);
      collideZabkas(b, [shop]);
      expect(b.z + BUS_LENGTH / 2).toBeLessThanOrEqual(shop.z - 0.5 + 1e-9);
    }
    expect(b.speed).toBeLessThanOrEqual(0);
  });

  it('pushes a slanted bus fully out and leaves far buses alone', () => {
    const b = bus(shop.x - 1.2, shop.z - 1.2, Math.PI / 4, 0);
    collideZabkas(b, [shop]);
    const after = { x: b.x, z: b.z };
    expect(Math.hypot(after.x - (shop.x - 1.2), after.z - (shop.z - 1.2))).toBeGreaterThan(0);
    collideZabkas(b, [shop]);
    expect(b.x).toBeCloseTo(after.x, 9);
    expect(b.z).toBeCloseTo(after.z, 9);

    const far = bus(shop.x + 5, shop.z, 0, 3);
    collideZabkas(far, [shop]);
    expect(far).toEqual(bus(shop.x + 5, shop.z, 0, 3));
  });
});
