import { describe, expect, it } from 'vitest';
import { EXTRA_BUSES, PLAYER_COLORS } from '../shared/config';
import { addPlayer, createGame } from '../sim/game';
import { rematchGame } from './rematch';

describe('rematchGame', () => {
  const finished = () => {
    const s = createGame(1);
    const a = addPlayer(s, 'a', 'Ala');
    a.color = PLAYER_COLORS[3];
    const b = addPlayer(s, 'b', 'Bob');
    b.connected = false;
    s.time = 500;
    s.tick = 30000;
    s.winnerId = 'a';
    for (const t of s.world.tiles) t.ownerId = 'a';
    for (const bus of s.buses) bus.stink = 80;
    return s;
  };

  it('keeps the players with their names, colors and connection', () => {
    const prev = finished();
    const next = rematchGame(prev, 2);
    expect(next.players.map((p) => [p.id, p.name, p.color, p.connected]))
      .toEqual(prev.players.map((p) => [p.id, p.name, p.color, p.connected]));
  });

  it('resets clock, winner, map and buses', () => {
    const next = rematchGame(finished(), 2);
    expect(next.time).toBe(0);
    expect(next.tick).toBe(0);
    expect(next.winnerId ?? null).toBeNull();
    expect(next.world.seed).toBe(2);
    // Fresh join zones, as in a new waiting room: the old 100% of "a" is gone.
    expect(next.world.tiles.every((t) => t.ownerId === 'a')).toBe(false);
    expect(next.buses).toHaveLength(2 + EXTRA_BUSES);
    expect(next.buses.every((b) => b.stink === 0)).toBe(true);
    for (const p of next.players) expect(next.buses.find((b) => b.id === p.busId)?.driverId).toBe(p.id);
  });

  it('does not share state with the finished game', () => {
    const prev = finished();
    const next = rematchGame(prev, 2);
    next.players[0].name = 'X';
    expect(prev.players[0].name).toBe('Ala');
    expect(next.world).not.toBe(prev.world);
  });
});
