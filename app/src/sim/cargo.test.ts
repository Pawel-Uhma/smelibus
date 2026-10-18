import { describe, expect, it } from 'vitest';
import { BONUS_STINK, ZUL_SIT_SECONDS } from '../shared/config';
import type { Bonus, GameState } from '../shared/types';
import { updateBonuses } from './bonus';
import { addCount, zulsOnBoard } from './cargo';
import { addPlayer, createGame } from './game';

function setup(): { s: GameState; busIdx: number } {
  const s = createGame(1);
  const p = addPlayer(s, 'a', 'A');
  s.bonuses = [];
  return { s, busIdx: s.buses.findIndex((b) => b.id === p.busId) };
}

function place(s: GameState, kind: Bonus['kind'], x: number, z: number): Bonus {
  const b: Bonus = { id: s.bonuses!.length, spot: 'map', kind, x, z, amount: kind === 'dropped' ? 0 : BONUS_STINK[kind], active: true, respawnAt: 0 };
  s.bonuses!.push(b);
  return b;
}

describe('cargo stats', () => {
  it('adds one of a kind without touching the old counts', () => {
    const a = { parcel: 2 };
    expect(addCount(a, 'parcel')).toEqual({ parcel: 3 });
    expect(addCount(undefined, 'poop')).toEqual({ poop: 1 });
    expect(a).toEqual({ parcel: 2 });
  });

  it('counts every pickup on the bus and its driver, once', () => {
    const { s, busIdx } = setup();
    const bus = s.buses[busIdx];
    place(s, 'parcel', bus.x, bus.z);
    place(s, 'poop', bus.x, bus.z);
    updateBonuses(s, 0); // one pickup per bonus, both in reach
    updateBonuses(s, 0);
    place(s, 'parcel', bus.x, bus.z);
    updateBonuses(s, 0);
    expect(bus.collected).toEqual({ parcel: 2, poop: 1 });
    expect(s.players[0].collected).toEqual({ parcel: 2, poop: 1 });
  });

  it('empty buses count nothing', () => {
    const s = createGame(1);
    s.bonuses = [];
    const bus = s.buses[0];
    place(s, 'kebab', bus.x, bus.z);
    updateBonuses(s, 0);
    expect(bus.collected).toBeUndefined();
  });

  it('drunks sit on board for ZUL_SIT_SECONDS, the total stays', () => {
    const { s, busIdx } = setup();
    const bus = s.buses[busIdx];
    place(s, 'zul', bus.x, bus.z);
    updateBonuses(s, 0);
    s.time = 5;
    place(s, 'zul', bus.x, bus.z);
    updateBonuses(s, 0);
    expect(zulsOnBoard(bus, 5)).toBe(2);
    expect(zulsOnBoard(bus, ZUL_SIT_SECONDS + 1)).toBe(1);
    expect(zulsOnBoard(bus, ZUL_SIT_SECONDS + 6)).toBe(0);
    expect(bus.collected?.zul).toBe(2);
    expect(zulsOnBoard(undefined, 0)).toBe(0);
  });

  it('forgets drunks that got off on the next pickup', () => {
    const { s, busIdx } = setup();
    const bus = s.buses[busIdx];
    place(s, 'zul', bus.x, bus.z);
    updateBonuses(s, 0);
    s.time = ZUL_SIT_SECONDS + 10;
    place(s, 'zul', bus.x, bus.z);
    updateBonuses(s, 0);
    expect(bus.zulsUntil).toEqual([s.time + ZUL_SIT_SECONDS]);
  });
});
