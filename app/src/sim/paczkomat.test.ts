import { describe, expect, it } from 'vitest';
import { BONUS_RADIUS, BONUS_STINK, BUS_RADIUS, PACZKOMAT_COOLDOWN_S, PACZKOMAT_DROP_TTL_S, PACZKOMAT_POOP_CHANCE } from '../shared/config';
import type { Bus, GameState } from '../shared/types';
import { updateBonuses } from './bonus';
import { addPlayer, createGame } from './game';
import { busVelocity, collidePaczkomats, hitPaczkomats, placePaczkomats } from './paczkomat';

const drops = (s: GameState) => s.bonuses!.filter((b) => b.spot === 'paczkomat');

/** A driven bus right in front of locker 0, driving into its doors at `speed`. */
function ram(speed: number): { s: GameState; bus: Bus } {
  const s = createGame(5);
  addPlayer(s, 'a', 'A');
  const bus = s.buses.find((b) => b.driverId === 'a')!;
  const p = s.world.paczkomats![0];
  bus.x = p.x + p.fx * 1.3;
  bus.z = p.z + p.fz * 1.3;
  bus.angle = Math.atan2(-p.fx, -p.fz);
  bus.speed = speed;
  bus.pushX = bus.pushZ = 0;
  return { s, bus };
}

function hit(s: GameState, bus: Bus) {
  const v = busVelocity(bus);
  hitPaczkomats(s, bus, collidePaczkomats(bus, s.world.paczkomats), v);
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

  it('a head-on ram knocks out a parcel or a poop on the bus side, then cools down', () => {
    const { s, bus } = ram(8);
    hit(s, bus);
    const [d] = drops(s);
    expect(d).toBeDefined();
    expect(['parcel', 'poop']).toContain(d.kind);
    expect(d.amount).toBe(BONUS_STINK[d.kind as 'parcel' | 'poop']);
    const p = s.world.paczkomats![0];
    expect((d.x - p.x) * p.fx + (d.z - p.z) * p.fz).toBeGreaterThan(0);
    // Away from the bus that bounced off, so it doesn't swallow the drop unseen.
    expect(Math.hypot(d.x - bus.x, d.z - bus.z)).toBeGreaterThan(BUS_RADIUS + BONUS_RADIUS);
    // The bus bounced off the doors.
    expect(Math.hypot(bus.x - p.x, bus.z - p.z)).toBeGreaterThan(0.2);

    const again = ram(8);
    again.s.paczkomatReadyAt = s.paczkomatReadyAt;
    again.s.time = PACZKOMAT_COOLDOWN_S / 2;
    hit(again.s, again.bus);
    expect(drops(again.s)).toHaveLength(0);
  });

  it('a slow nudge drops nothing but still blocks the bus', () => {
    const { s, bus } = ram(1);
    const p = s.world.paczkomats![0];
    for (let i = 0; i < 30; i++) {
      bus.x -= p.fx * 0.05;
      bus.z -= p.fz * 0.05;
      hit(s, bus);
    }
    expect(drops(s)).toHaveLength(0);
    expect((bus.x - p.x) * p.fx + (bus.z - p.z) * p.fz).toBeGreaterThan(0.2);
  });

  it('every hard hit drops something: a parcel when it is not a poop', () => {
    const kinds = new Set<string>();
    const { s, bus } = ram(8);
    const start = { x: bus.x, z: bus.z, angle: bus.angle };
    for (let i = 0; i < 20; i++) {
      Object.assign(bus, start, { speed: 8, pushX: 0, pushZ: 0 });
      s.paczkomatReadyAt![0] = 0;
      s.bonuses = [];
      hit(s, bus);
      expect(drops(s)).toHaveLength(1);
      kinds.add(drops(s)[0].kind);
      // The bus stays where it bounced: the drop is still lying there after the pickup delay.
      s.time += 1.5;
      updateBonuses(s, 0);
      expect(drops(s)).toHaveLength(1);
    }
    expect([...kinds].sort()).toEqual(['parcel', 'poop']);
  });

  it('about PACZKOMAT_POOP_CHANCE of the drops are poop', () => {
    const { s, bus } = ram(8);
    const start = { x: bus.x, z: bus.z, angle: bus.angle };
    let poop = 0;
    const n = 400;
    for (let i = 0; i < n; i++) {
      Object.assign(bus, start, { speed: 8, pushX: 0, pushZ: 0 });
      s.paczkomatReadyAt![0] = 0;
      s.bonuses = [];
      hit(s, bus);
      if (drops(s)[0].kind === 'poop') poop++;
    }
    expect(poop / n).toBeGreaterThan(PACZKOMAT_POOP_CHANCE - 0.08);
    expect(poop / n).toBeLessThan(PACZKOMAT_POOP_CHANCE + 0.08);
  });

  it('drops are one-offs: picked up once, or gone after the TTL', () => {
    const { s, bus } = ram(8);
    hit(s, bus);
    const d = drops(s)[0];
    s.bonuses = [d]; // nothing else nearby to pick up
    s.time += 1.5;
    bus.x = d.x;
    bus.z = d.z;
    const before = bus.stink;
    updateBonuses(s, 0);
    expect(bus.stink).toBe(before + d.amount);
    expect(drops(s)).toHaveLength(0);

    const other = ram(8);
    hit(other.s, other.bus);
    other.s.time = PACZKOMAT_DROP_TTL_S + 1;
    updateBonuses(other.s, 0);
    expect(drops(other.s)).toHaveLength(0);
  });
});
