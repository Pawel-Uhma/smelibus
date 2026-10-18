import { describe, expect, it } from 'vitest';
import type { Bus, Player } from '../shared/types';
import { buildHudModel, formatClock, type HudView } from './hudModel';

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

  it('shows the sudden death multiplier after 8 and 10 minutes', () => {
    expect(buildHudModel(view({ time: 7 * 60 }), 'a')).toMatchObject({ multiplier: 1, nextStepIn: 60 });
    expect(buildHudModel(view({ time: 8 * 60 }), 'a')).toMatchObject({ multiplier: 2, nextStepIn: 120 });
    expect(buildHudModel(view({ time: 11 * 60 }), 'a')).toMatchObject({ multiplier: 3, nextStepIn: null });
  });

  it('names the winner', () => {
    expect(buildHudModel(view(), 'a').winner).toBeNull();
    expect(buildHudModel(view({ winnerId: 'b' }), 'a').winner).toMatchObject({ id: 'b', name: 'B', me: false });
  });
});
