import { describe, expect, it } from 'vitest';
import type { GameState } from '../shared/types';
import { createGame } from './game';
import { updateZabkas } from './zabka';

const kindAt = (s: GameState, x: number, z: number) =>
  s.world.tiles[Math.floor(z) * s.world.size + Math.floor(x)].kind;

describe('map pick (card 028)', () => {
  it('makes a city or a flat map on request', () => {
    expect(createGame(4, true).world.tiles.some((t) => t.kind === 'building')).toBe(true);
    expect(createGame(4, false).world.tiles.every((t) => !t.kind || t.kind === 'grass')).toBe(true);
  });

  it.each([1, 2, 3, 4, 5, 6])('never puts a bonus inside a building on the city map (seed %i)', (seed) => {
    const s = createGame(seed, true);
    // Żabka drunks walk out to their own spots: let a whole match of them out.
    for (s.time = 0; s.time < 20 * 60; s.time += 1) updateZabkas(s);
    expect(s.bonuses!.length).toBeGreaterThan(0);
    for (const b of s.bonuses!) expect(kindAt(s, b.x, b.z)).not.toBe('building');
  });
});
