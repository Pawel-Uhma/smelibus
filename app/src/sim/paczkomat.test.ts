import { describe, expect, it } from 'vitest';
import {
  BONUS_STINK, BUS_MAX_SPEED, CABBAGE_STINK_MULT, ENERGY_SPEED_BONUS, PACZKOMAT_COOLDOWN_S, PACZKOMAT_LOOT_WEIGHTS,
  PACZKOMAT_REVEAL_S, POWER_SECONDS,
} from '../shared/config';
import type { Bus, GameState, LootKind } from '../shared/types';
import { collect, updateBonuses } from './bonus';
import { collideBuses, updateBus } from './bus';
import { addPlayer, createGame } from './game';
import { driveThroughPaczkomats, placePaczkomats } from './paczkomat';
import { rollLoot, updatePowers } from './powers';

/** A driven bus parked right on top of locker 0. */
function onLocker(): { s: GameState; bus: Bus } {
  const s = createGame(5);
  addPlayer(s, 'a', 'A');
  const bus = s.buses.find((b) => b.driverId === 'a')!;
  const p = s.world.paczkomats![0];
  Object.assign(bus, { x: p.x, z: p.z, speed: 0, angle: 0 });
  return { s, bus };
}

/** Lands the bus's roll as `loot` (skips the reel). */
function land(s: GameState, bus: Bus, loot: LootKind) {
  bus.roll = { loot, at: s.time };
  s.time += PACZKOMAT_REVEAL_S;
  updatePowers(s);
}

describe('InPost lockers', () => {
  it('places lockers from the seed, off buildings, doors on an axis', () => {
    const s = createGame(5);
    const lockers = s.world.paczkomats!;
    expect(lockers.length).toBeGreaterThan(0);
    const again = createGame(5).world;
    expect(placePaczkomats(again)).toEqual(lockers);
    for (const p of lockers) {
      const tile = s.world.tiles[Math.floor(p.z) * s.world.size + Math.floor(p.x)];
      expect(tile.kind === 'road' || tile.kind === 'building').toBe(false);
      expect(Math.abs(p.fx) + Math.abs(p.fz)).toBe(1);
      for (const z of s.world.zabkas ?? []) expect(Math.hypot(z.x - p.x, z.z - p.z)).toBeGreaterThan(2);
    }
  });

  it('driving through starts a roll, without blocking the bus, then cools down', () => {
    const { s, bus } = onLocker();
    const x = bus.x;
    driveThroughPaczkomats(s, bus);
    expect(bus.roll).toMatchObject({ at: 0 });
    expect(bus.x).toBe(x);
    const first = bus.roll;
    s.time = PACZKOMAT_COOLDOWN_S - 1;
    driveThroughPaczkomats(s, bus);
    expect(bus.roll).toBe(first);
    s.time = PACZKOMAT_COOLDOWN_S;
    driveThroughPaczkomats(s, bus);
    expect(bus.roll!.at).toBe(PACZKOMAT_COOLDOWN_S);
  });

  it('an empty bus going nowhere near does not roll', () => {
    const { s, bus } = onLocker();
    bus.driverId = null;
    driveThroughPaczkomats(s, bus);
    expect(bus.roll).toBeUndefined();
  });

  it('rolls loot by the weights, no parcels', () => {
    const s = createGame(9);
    const n: Record<string, number> = {};
    for (let i = 0; i < 4000; i++) { const k = rollLoot(s); n[k] = (n[k] ?? 0) + 1; }
    const total = Object.values(PACZKOMAT_LOOT_WEIGHTS).reduce((a, b) => a + b, 0);
    for (const [k, w] of Object.entries(PACZKOMAT_LOOT_WEIGHTS)) expect(n[k] / 4000).toBeCloseTo(w / total, 1);
    expect(n.parcel).toBeUndefined();
  });

  it('the loot lands when the reel stops: a poop is stink', () => {
    const { s, bus } = onLocker();
    bus.roll = { loot: 'poop', at: 0 };
    s.time = PACZKOMAT_REVEAL_S - 0.1;
    updatePowers(s);
    expect(bus.stink).toBe(0);
    s.time = PACZKOMAT_REVEAL_S;
    updatePowers(s);
    expect(bus.stink).toBe(BONUS_STINK.poop);
    updatePowers(s);
    expect(bus.stink).toBe(BONUS_STINK.poop); // only once
  });

  it('energy drink raises the top speed for a while', () => {
    const { s, bus } = onLocker();
    land(s, bus, 'energy');
    expect(bus.speedMult).toBeCloseTo(1 + ENERGY_SPEED_BONUS);
    Object.assign(bus, { x: 50, z: 5, angle: 0, speed: 0 });
    for (let i = 0; i < 150; i++) updateBus(bus, { throttle: 1, steer: 0 }, 1 / 60, s.world.size);
    expect(bus.speed).toBeGreaterThan(BUS_MAX_SPEED);
    s.time += POWER_SECONDS.energy;
    updatePowers(s);
    expect(bus.speedMult).toBeUndefined();
    expect(bus.power).toBeUndefined();
  });

  it('monthly ticket: the controller lets you pass and rams knock nothing out', () => {
    const { s, bus } = onLocker();
    land(s, bus, 'ticket');
    bus.stink = 100;
    s.bonuses = [{ id: 0, spot: 'controller', kind: 'controller', amount: BONUS_STINK.controller, x: bus.x, z: bus.z, active: true, respawnAt: 0 }];
    updateBonuses(s, 0);
    expect(bus.stink).toBe(100);
    expect(s.bonuses[0].active).toBe(true);
    const rammer = (): Bus => ({ id: 99, x: bus.x, z: bus.z - 2.9, angle: 0, speed: 10, driverId: 'b', stink: 0 });
    expect(collideBuses([{ ...bus }, rammer()])).toEqual([]);
    expect(collideBuses([{ ...bus, shielded: undefined }, rammer()]).length).toBe(1);
  });

  it('pickled cabbage doubles bonus stink for 10 s', () => {
    const { s, bus } = onLocker();
    land(s, bus, 'cabbage');
    const b = { id: 0, spot: 'stop' as const, kind: 'zul' as const, amount: BONUS_STINK.zul, x: 0, z: 0, active: true, respawnAt: 0 };
    collect(s, bus, b);
    expect(bus.stink).toBe(BONUS_STINK.zul * CABBAGE_STINK_MULT);
    s.time += POWER_SECONDS.cabbage;
    updatePowers(s);
    collect(s, bus, { ...b });
    expect(bus.stink).toBe(BONUS_STINK.zul * (CABBAGE_STINK_MULT + 1));
  });
});
