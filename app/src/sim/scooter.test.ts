import { describe, expect, it } from 'vitest';
import { SCOOTER_BOOST, SCOOTER_BOOST_DECAY_PER_S, SCOOTER_SPAWN_S, SCOOTER_SPEED } from '../shared/config';
import { bonusPosition, updateBonuses } from './bonus';
import { addPlayer, createGame } from './game';
import { updatePowers } from './powers';
import { spawnScooter, updateScooters } from './scooter';

describe('kukuryniarze (scooter riders)', () => {
  it('ride out of a block onto a street lane and keep riding it', () => {
    const s = createGame(4);
    s.bonuses = [];
    const r = spawnScooter(s)!;
    expect(r.walk!.from).toBe(0);
    const kind = (p: { x: number; z: number }) => s.world.tiles[Math.floor(p.z) * s.world.size + Math.floor(p.x)];
    const start = bonusPosition(r, 0);
    expect(kind(start).kind).toBe('building');
    for (let t = r.walk!.until + 0.1; t < r.walk!.until + 60; t += 1.3) expect(kind(bonusPosition(r, t)).kind).toBe('road');
    // Joins the lane where it came out and rides at SCOOTER_SPEED.
    const join = bonusPosition(r, r.walk!.until);
    expect(Math.hypot(join.x - r.x, join.z - r.z)).toBeLessThan(0.01);
    const a = bonusPosition(r, r.walk!.until + 1), b = bonusPosition(r, r.walk!.until + 2);
    expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeCloseTo(SCOOTER_SPEED, 1);
  });

  it('a new one comes out every SCOOTER_SPAWN_S up to the limit', () => {
    const s = createGame(4);
    s.bonuses = [];
    for (let t = 0; t < 20 * SCOOTER_SPAWN_S; t += 1) { s.time = t; updateScooters(s); }
    const n = s.bonuses.filter((b) => b.spot === 'scooter').length;
    expect(n).toBeGreaterThanOrEqual(2);
    expect(n).toBeLessThan(10);
  });

  it('eating one gives a little top speed that stacks and slowly fades', () => {
    const s = createGame(4);
    addPlayer(s, 'a', 'A');
    const bus = s.buses.find((b) => b.driverId === 'a')!;
    s.bonuses = [];
    for (let i = 0; i < 2; i++) {
      const r = spawnScooter(s)!;
      s.time = r.walk!.until;
      const at = bonusPosition(r, s.time);
      Object.assign(bus, { x: at.x, z: at.z });
      updateBonuses(s, 0);
    }
    expect(bus.riderBoost).toBeCloseTo(2 * SCOOTER_BOOST);
    expect(s.bonuses.filter((b) => b.spot === 'scooter')).toEqual([]);
    updatePowers(s, 1);
    expect(bus.riderBoost).toBeCloseTo(2 * SCOOTER_BOOST - SCOOTER_BOOST_DECAY_PER_S);
    expect(bus.speedMult).toBeCloseTo(1 + 2 * SCOOTER_BOOST - SCOOTER_BOOST_DECAY_PER_S);
  });
});
