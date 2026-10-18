import { describe, expect, it } from 'vitest';
import { SIM_DT } from '../shared/config';
import type { BusInput, GameState, PlayerId } from '../shared/types';
import { createBot, searchFrom } from './bot';
import { addPlayer, createGame, stepGame } from './game';
import { countTiles } from './zones';

function run(state: GameState, bots: Map<PlayerId, ReturnType<typeof createBot>>, seconds: number, each?: () => void) {
  for (let t = 0; t < seconds / SIM_DT; t++) {
    const inputs = new Map<PlayerId, BusInput>();
    for (const [id, bot] of bots) inputs.set(id, bot.think(state, id, SIM_DT));
    stepGame(state, inputs, SIM_DT);
    each?.();
  }
}

describe('bot', () => {
  it('finds paths around buildings, never through them', () => {
    const s = createGame(3, true);
    const start = s.world.tiles.findIndex((t) => t.kind === 'road');
    const { cost, parent } = searchFrom(s.world, start);
    const far = cost.reduce((best, c, i) => (Number.isFinite(c) && c > cost[best] ? i : best), start);
    for (let t = far; t !== -1; t = parent[t]) expect(s.world.tiles[t].kind).not.toBe('building');
  });

  it('collects stink in the city', () => {
    const s = createGame(5, true);
    addPlayer(s, 'bot', 'Bot');
    const bus = s.buses.find((b) => b.driverId === 'bot')!;
    let maxStink = 0;
    run(s, new Map([['bot', createBot(1)]]), 40, () => (maxStink = Math.max(maxStink, bus.stink)));
    expect(maxStink).toBeGreaterThan(20);
  });

  it('banks stink into its own zone, so the zone grows', () => {
    const s = createGame(7, true);
    addPlayer(s, 'a', 'A');
    addPlayer(s, 'b', 'B');
    const before = countTiles(s.world, 'a') + countTiles(s.world, 'b');
    run(s, new Map([['a', createBot(1)], ['b', createBot(2)]]), 120);
    const grew = countTiles(s.world, 'a') !== before / 2 || countTiles(s.world, 'b') !== before / 2;
    expect(grew).toBe(true);
    expect(Math.max(countTiles(s.world, 'a'), countTiles(s.world, 'b'))).toBeGreaterThan(before / 2);
  });

  it('gets into a free bus when on foot', () => {
    const s = createGame(2, false);
    const p = addPlayer(s, 'bot', 'Bot');
    const bot = createBot(3);
    run(s, new Map([['bot', bot]]), 0.1);
    const bus = s.buses.find((b) => b.id === p.busId)!;
    stepGame(s, new Map([['bot', { throttle: 0, steer: 0, use: 99 }]]), SIM_DT);
    expect(p.busId).toBeNull();
    bus.driverId = 'someone-else';
    run(s, new Map([['bot', bot]]), 15);
    expect(p.busId).not.toBeNull();
  });
});
