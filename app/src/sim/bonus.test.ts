import { describe, expect, it } from 'vitest';
import {
  BONUS_RESPAWN_S, BONUS_STINK, DROPPED_STINK_TTL_S, RAM_STINK_LOSS, STINK_DECAY_PER_S, STINK_MAX,
  TRASH_RESPAWN_S, ZUL_DECAY_MULT,
} from '../shared/config';
import type { Bonus, BonusSpot, GameState } from '../shared/types';
import { bonusPosition, dropStink, spawnBonuses, updateBonuses } from './bonus';
import { addPlayer, createGame, stepGame } from './game';

/** Game with one driven bus and no bonuses, so each test places its own. */
function setup(): { s: GameState; busIdx: number } {
  const s = createGame(1);
  const p = addPlayer(s, 'a', 'A');
  s.bonuses = [];
  return { s, busIdx: s.buses.findIndex((b) => b.id === p.busId) };
}

function place(s: GameState, spot: BonusSpot, kind: Bonus['kind'], x: number, z: number): Bonus {
  const b: Bonus = {
    id: s.bonuses!.length, spot, kind, x, z, amount: kind === 'dropped' ? 0 : BONUS_STINK[kind],
    active: true, respawnAt: 0,
  };
  s.bonuses!.push(b);
  return b;
}

describe('stink bonuses', () => {
  it('spawns stops, trash cans and controllers inside the map, no regular bonuses', () => {
    const s = createGame(7);
    const spots = new Set(s.bonuses!.map((b) => b.spot));
    expect([...spots].sort()).toEqual(['controller', 'stop', 'trash']);
    for (const b of s.bonuses!) {
      expect(['zul', 'trash', 'controller']).toContain(b.kind);
      expect(b.active || b.spot === 'stop').toBe(true);
      expect(b.x).toBeGreaterThan(0);
      expect(b.x).toBeLessThan(s.world.size);
      expect(b.z).toBeGreaterThan(0);
      expect(b.z).toBeLessThan(s.world.size);
    }
  });

  it('controllers walk up and down a stretch of sidewalk, trash cans stand on the kerb', () => {
    const s = createGame(7);
    const ctrl = s.bonuses!.filter((b) => b.spot === 'controller');
    expect(ctrl.length).toBeGreaterThan(0);
    const size = s.world.size;
    const kindAt = (x: number, z: number) => s.world.tiles[Math.floor(z) * size + Math.floor(x)].kind;
    for (const c of ctrl) {
      expect(c.patrol).toBeDefined();
      // Walks at his speed (the path may turn around at an end of the stretch).
      let walked = 0;
      for (let k = 0; k < 50; k++) {
        const p0 = bonusPosition(c, k * 0.1), p1 = bonusPosition(c, (k + 1) * 0.1);
        walked += Math.hypot(p1.x - p0.x, p1.z - p0.z);
      }
      expect(walked).toBeCloseTo(5 * c.patrol!.speed, 0);
      for (let t = 0; t < 60; t += 3) {
        const p = bonusPosition(c, t);
        expect(kindAt(p.x, p.z)).toBe('road');
      }
    }
    for (const b of s.bonuses!.filter((x) => x.spot === 'trash')) expect(kindAt(b.x, b.z)).toBe('road');
  });

  it('controllers spread out instead of marching side by side', () => {
    const s = createGame(1);
    const ctrl = s.bonuses!.filter((b) => b.spot === 'controller');
    // Walking in step = close together all the time; allow a chance meeting, not a pack.
    for (let i = 0; i < ctrl.length; i++) for (let j = i + 1; j < ctrl.length; j++) {
      const close = [0, 7, 14, 21, 28].filter((t) => {
        const a = bonusPosition(ctrl[i], t), b = bonusPosition(ctrl[j], t);
        return Math.hypot(a.x - b.x, a.z - b.z) < 1;
      });
      expect(close.length).toBeLessThan(3);
    }
  });

  it('an empty stop keeps trying for a drunk', () => {
    const s = createGame(7);
    const stops = s.bonuses!.filter((b) => b.spot === 'stop');
    expect(stops.some((b) => b.active)).toBe(true);
    expect(stops.some((b) => !b.active)).toBe(true);
    for (let i = 0; i < 20; i++) {
      s.time += BONUS_RESPAWN_S;
      updateBonuses(s, 0);
    }
    expect(stops.every((b) => b.kind === 'zul')).toBe(true);
  });

  it('spawns the same layout for the same seed', () => {
    const a = createGame(42);
    const b = createGame(42);
    expect(a.bonuses).toEqual(b.bonuses);
  });

  it('collecting raises stink and deactivates the bonus', () => {
    const { s, busIdx } = setup();
    const bus = s.buses[busIdx];
    const kebab = place(s, 'map', 'kebab', bus.x, bus.z);
    updateBonuses(s, 0);
    expect(bus.stink).toBe(BONUS_STINK.kebab);
    expect(kebab.active).toBe(false);
    updateBonuses(s, 0);
    expect(bus.stink).toBe(BONUS_STINK.kebab); // not collected twice
  });

  it('empty buses do not collect', () => {
    const s = createGame(1);
    s.bonuses = [];
    const bus = s.buses[0];
    const b = place(s, 'map', 'durian', bus.x, bus.z);
    updateBonuses(s, 0);
    expect(bus.stink).toBe(0);
    expect(b.active).toBe(true);
  });

  it('caps stink at STINK_MAX', () => {
    const { s, busIdx } = setup();
    const bus = s.buses[busIdx];
    bus.stink = STINK_MAX - 10;
    place(s, 'map', 'durian', bus.x, bus.z);
    updateBonuses(s, 0);
    expect(bus.stink).toBe(STINK_MAX);
  });

  it('decays over time, never below 0', () => {
    const { s, busIdx } = setup();
    const bus = s.buses[busIdx];
    bus.stink = 10;
    updateBonuses(s, 2);
    expect(bus.stink).toBeCloseTo(10 - STINK_DECAY_PER_S * 2);
    updateBonuses(s, 1000);
    expect(bus.stink).toBe(0);
  });

  it('a drunk from a bus stop slows decay for a while', () => {
    const { s, busIdx } = setup();
    const bus = s.buses[busIdx];
    place(s, 'stop', 'zul', bus.x, bus.z);
    updateBonuses(s, 0);
    expect(bus.stink).toBe(BONUS_STINK.zul);
    updateBonuses(s, 2);
    expect(bus.stink).toBeCloseTo(BONUS_STINK.zul - STINK_DECAY_PER_S * ZUL_DECAY_MULT * 2);
  });

  it('ticket controller lowers stink, not below 0', () => {
    const { s, busIdx } = setup();
    const bus = s.buses[busIdx];
    bus.stink = 30;
    place(s, 'controller', 'controller', bus.x, bus.z);
    updateBonuses(s, 0);
    expect(bus.stink).toBe(30 + BONUS_STINK.controller);
    bus.stink = 5;
    s.bonuses![0].active = true;
    updateBonuses(s, 0);
    expect(bus.stink).toBe(0);
  });

  it('respawns after the respawn time; trash cans have their own', () => {
    const { s, busIdx } = setup();
    const bus = s.buses[busIdx];
    const kebab = place(s, 'map', 'kebab', bus.x, bus.z);
    const trash = place(s, 'trash', 'trash', bus.x, bus.z);
    updateBonuses(s, 0); // takes the kebab and knocks the trash can over
    expect(kebab.active).toBe(false);
    expect(trash.active).toBe(false);
    bus.x = bus.z = 1000; // drive away so nothing gets re-collected
    s.time = BONUS_RESPAWN_S;
    updateBonuses(s, 0);
    expect(kebab.active).toBe(true);
    expect(trash.active).toBe(TRASH_RESPAWN_S <= BONUS_RESPAWN_S);
    s.time = TRASH_RESPAWN_S;
    updateBonuses(s, 0);
    expect(trash.active).toBe(true);
  });

  it('a ram knocks stink onto the ground, pickable after a short delay, one-off', () => {
    const s = createGame(1, false); // flat: fixed positions must not land in a building
    s.bonuses = [];
    const pa = addPlayer(s, 'a', 'A');
    const pb = addPlayer(s, 'b', 'B');
    const rammer = s.buses.find((b) => b.id === pa.busId)!;
    const victim = s.buses.find((b) => b.id === pb.busId)!;
    // Rammer drives along +z straight into a parked victim full of stink.
    Object.assign(rammer, { x: 20, z: 20, angle: 0, speed: 12, stink: 0 });
    Object.assign(victim, { x: 20, z: 22.8, angle: 0, speed: 0, stink: 50 });
    stepGame(s, new Map(), 1 / 60);
    const drop = s.bonuses!.find((b) => b.kind === 'dropped')!;
    expect(drop).toBeDefined();
    expect(drop.amount).toBeCloseTo(50 * RAM_STINK_LOSS);
    expect(rammer.stink).toBe(0); // not swallowed on the spot

    // After the delay, a bus on top of it collects it and it's gone for good.
    Object.assign(victim, { x: 40, z: 40, speed: 0 });
    Object.assign(rammer, { x: drop.x, z: drop.z, speed: 0 });
    s.time = drop.pickableAt!;
    updateBonuses(s, 0);
    expect(rammer.stink).toBeCloseTo(50 * RAM_STINK_LOSS);
    expect(s.bonuses).not.toContain(drop);
  });

  it('dropped stink vanishes after its time', () => {
    const { s } = setup();
    const drop = dropStink(s, 1, 1, 10)!;
    s.time = DROPPED_STINK_TTL_S;
    updateBonuses(s, 0);
    expect(s.bonuses).not.toContain(drop);
  });

  it('stepGame runs decay', () => {
    const { s, busIdx } = setup();
    s.buses[busIdx].stink = 10;
    for (let i = 0; i < 60; i++) stepGame(s, new Map(), 1 / 60);
    expect(s.buses[busIdx].stink).toBeCloseTo(10 - STINK_DECAY_PER_S, 5);
  });

  it('spawnBonuses resets the layout', () => {
    const s = createGame(3);
    s.bonuses = [];
    spawnBonuses(s);
    expect(s.bonuses.length).toBeGreaterThan(0);
  });
});
