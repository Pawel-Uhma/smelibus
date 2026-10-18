import { describe, expect, it } from 'vitest';
import { BONUS_STINK, ZABKA_SPAWN_MIN_S, ZABKA_ZULS_MAX, ZABKA_ZULS_START } from '../shared/config';
import type { GameState } from '../shared/types';
import { updateBonuses } from './bonus';
import { addPlayer, createGame } from './game';
import { generateWorld } from './world';
import { placeZabkas, updateZabkas, zabkaInterval, zabkaLimit } from './zabka';

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
    bus.x = zul.x;
    bus.z = zul.z;
    updateBonuses(s, 0);
    expect(bus.stink).toBe(BONUS_STINK.zul);
    expect(bus.slowDecayUntil).toBeGreaterThan(s.time);
    s.time += 120;
    updateBonuses(s, 0);
    expect(s.bonuses!.some((b) => b.id === zul.id)).toBe(false);
  });
});
