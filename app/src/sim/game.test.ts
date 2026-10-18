import { describe, expect, it } from 'vitest';
import { EXTRA_BUSES } from '../shared/config';
import { addPlayer, createGame, removePlayer, stepGame } from './game';

describe('game', () => {
  it('seats each joining player in their own bus and keeps players + 2 buses', () => {
    const s = createGame(1);
    const a = addPlayer(s, 'a', 'A');
    const b = addPlayer(s, 'b', 'B');
    expect(s.buses).toHaveLength(2 + EXTRA_BUSES);
    expect(a.busId).not.toBeNull();
    expect(a.busId).not.toBe(b.busId);
    expect(a.color).not.toBe(b.color);
  });

  it('drives only the bus of the player who sent input', () => {
    const s = createGame(1);
    const a = addPlayer(s, 'a', 'A');
    const before = s.buses.map((b) => ({ x: b.x, z: b.z }));
    for (let i = 0; i < 30; i++) stepGame(s, new Map([['a', { throttle: 1, steer: 0 }]]), 1 / 60);
    s.buses.forEach((bus, i) => {
      const moved = bus.x !== before[i].x || bus.z !== before[i].z;
      expect(moved).toBe(bus.id === a.busId);
    });
  });

  it('frees the bus when a player leaves', () => {
    const s = createGame(1);
    addPlayer(s, 'a', 'A');
    removePlayer(s, 'a');
    expect(s.players).toHaveLength(0);
    expect(s.buses.every((b) => b.driverId === null)).toBe(true);
  });

  it('turns the zone of a removed player neutral', () => {
    const s = createGame(1);
    addPlayer(s, 'a', 'A');
    addPlayer(s, 'b', 'B');
    s.world.tiles[0].ownerId = 'a';
    s.world.tiles[1].ownerId = 'b';
    removePlayer(s, 'a');
    expect(s.world.tiles[0].ownerId).toBeNull();
    expect(s.world.tiles[1].ownerId).toBe('b');
  });
});
