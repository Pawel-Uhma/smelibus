import { describe, expect, it } from 'vitest';
import type { Bus, Player } from '../shared/types';
import { buildCargoTable, buildHudModel, cargoCounts, formatClock, type HudView } from './hudModel';

const player = (id: string, busId: number | null = null): Player =>
  ({ id, name: id.toUpperCase(), color: 0x2f6bd6, busId, connected: true });
const bus = (id: number, stink: number): Bus =>
  ({ id, x: 0, z: 0, angle: 0, speed: 0, driverId: null, stink });

function view(over: Partial<HudView> = {}): HudView {
  return {
    time: 0,
    players: [player('a', 0), player('b', 1)],
    buses: [bus(0, 42), bus(1, 7)],
    tiles: [{ ownerId: 'a' }, { ownerId: 'a' }, { ownerId: 'a' }, { ownerId: 'b' }],
    ...over,
  };
}

describe('hud model', () => {
  it('formats the clock as m:ss', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(65.9)).toBe('1:05');
    expect(formatClock(600)).toBe('10:00');
  });

  it('shows map share per player, leader first', () => {
    const m = buildHudModel(view({ players: [player('b', 1), player('a', 0)] }), 'b');
    expect(m.rows.map((r) => [r.id, r.percent, r.me])).toEqual([['a', 75, false], ['b', 25, true]]);
  });

  it("shows the own bus's stink, 0 on foot", () => {
    expect(buildHudModel(view(), 'a').stink).toBe(42);
    expect(buildHudModel(view({ players: [player('a')] }), 'a').stink).toBe(0);
  });

  it('sudden death: x2 at 4 min, then +1 every 2 min without end', () => {
    expect(buildHudModel(view({ time: 3 * 60 }), 'a')).toMatchObject({ multiplier: 1, nextStepIn: 60 });
    expect(buildHudModel(view({ time: 4 * 60 }), 'a')).toMatchObject({ multiplier: 2, nextStepIn: 120 });
    expect(buildHudModel(view({ time: 7 * 60 }), 'a')).toMatchObject({ multiplier: 3, nextStepIn: 60 });
    expect(buildHudModel(view({ time: 30 * 60 }), 'a')).toMatchObject({ multiplier: 15, nextStepIn: 120 });
  });

  it('names the winner', () => {
    expect(buildHudModel(view(), 'a').winner).toBeNull();
    expect(buildHudModel(view({ winnerId: 'b' }), 'a').winner).toMatchObject({ id: 'b', name: 'B', me: false });
  });

  it('shows drunks on board now and poops this game', () => {
    const v = view({ time: 10 });
    v.buses[0].zulsUntil = [5, 12, 30];
    v.players[0].collected = { zul: 3, parcel: 4, poop: 2, kebab: 1 };
    expect(buildHudModel(v, 'a')).toMatchObject({ zuls: 2, poops: 2 });
    expect(buildHudModel(view(), 'a')).toMatchObject({ zuls: 0, poops: 0 });
  });

  it('shows the locker roll while the reel spins and the power-up time left', () => {
    const v = view({ time: 10 });
    v.buses[0].roll = { loot: 'energy', at: 9 };
    v.buses[0].power = { kind: 'ticket', from: 5, until: 30 };
    expect(buildHudModel(v, 'a')).toMatchObject({
      roll: { loot: 'energy', at: 9, spinning: true }, power: { kind: 'ticket', left: 20, total: 25 },
    });
    v.time = 40;
    expect(buildHudModel(v, 'a')).toMatchObject({ roll: { spinning: false }, power: null });
  });

  it('sums the other kinds into one cargo column', () => {
    expect(cargoCounts({ zul: 1, parcel: 2, poop: 3, kebab: 4, controller: 1, dropped: 2 }))
      .toEqual({ zul: 1, poop: 3, other: 9 });
    expect(cargoCounts(undefined)).toEqual({ zul: 0, poop: 0, other: 0 });
  });

  it('marks the leader of each cargo column, ties included, nobody at 0', () => {
    const a = { ...player('a'), collected: { zul: 2, parcel: 1 } };
    const b = { ...player('b'), collected: { zul: 2, poop: 1 } };
    const c = player('c');
    const rows = buildCargoTable([a, b, c], ['c', 'a', 'b'], 'b');
    expect(rows.map((r) => [r.id, r.me, r.leads])).toEqual([
      ['c', false, []],
      ['a', false, ['zul', 'other']],
      ['b', true, ['zul', 'poop']],
    ]);
  });

  it('puts the cargo table in map share order', () => {
    expect(buildHudModel(view(), 'b').cargo.map((r) => r.id)).toEqual(['a', 'b']);
  });
});
