import { describe, expect, it } from 'vitest';
import { SOUND_CAPTURE_MAX_TILES, SOUND_FULL_DIST } from '../shared/config';
import type { Bonus, Bus, Player, Snapshot, Tile, WeatherCell } from '../shared/types';
import { captureChord, createCaptureTracker, diffSnapshots, distanceGain, weatherExposure } from './events';

const player = (id: string, extra: Partial<Player> = {}): Player =>
  ({ id, name: id, color: 0, busId: null, x: 0, z: 0, connected: true, ...extra });
const bus = (id: number, extra: Partial<Bus> = {}): Bus =>
  ({ id, x: 0, z: 0, angle: 0, speed: 0, driverId: null, stink: 0, ...extra });
const bonus = (id: number, extra: Partial<Bonus> = {}): Bonus =>
  ({ id, spot: 'map', kind: 'kebab', x: 5, z: 6, amount: 10, active: true, respawnAt: 0, ...extra });
const snap = (extra: Partial<Snapshot> = {}): Snapshot =>
  ({ tick: 0, time: 10, players: [], buses: [], bonuses: [], ...extra });

describe('distanceGain', () => {
  it('is full up close, zero past the range and falls in between', () => {
    expect(distanceGain(0, 20)).toBe(1);
    expect(distanceGain(SOUND_FULL_DIST, 20)).toBe(1);
    expect(distanceGain(20, 20)).toBe(0);
    expect(distanceGain(50, 20)).toBe(0);
    const mid = distanceGain(10, 20);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    expect(distanceGain(15, 20)).toBeLessThan(mid);
  });
});

describe('diffSnapshots', () => {
  it('hears another player honk at their bus, not my own honk', () => {
    const prev = snap({ players: [player('a', { busId: 1 }), player('me')], buses: [bus(1, { x: 7, z: 8 })] });
    const curr = snap({
      players: [player('a', { busId: 1, horn: 1 }), player('me', { horn: 3 })], buses: [bus(1, { x: 7, z: 8 })],
    });
    expect(diffSnapshots(prev, curr, 'me')).toEqual([{ kind: 'horn', x: 7, z: 8 }]);
    expect(diffSnapshots(curr, curr, 'me')).toEqual([]);
  });

  it('honks from where a pedestrian stands, also after a counter reset', () => {
    const prev = snap({ players: [player('a', { x: 2, z: 3, horn: 9 })] });
    const curr = snap({ players: [player('a', { x: 2, z: 3, horn: 1 })] });
    expect(diffSnapshots(prev, curr, 'me')).toEqual([{ kind: 'horn', x: 2, z: 3 }]);
  });

  it('blups a picked-up bonus and bzzts a ticket controller', () => {
    const prev = snap({ bonuses: [bonus(1), bonus(2, { kind: 'controller', spot: 'controller', x: 1, z: 1 })] });
    const curr = snap({ bonuses: [bonus(1, { active: false }), bonus(2, { kind: 'controller', spot: 'controller', active: false })] });
    expect(diffSnapshots(prev, curr, 'me')).toEqual([
      { kind: 'bonus', x: 5, z: 6 },
      { kind: 'controller', x: 1, z: 1 },
    ]);
  });

  it('counts a vanished Żabka drunk as picked up, but not expired dropped stink', () => {
    const prev = snap({ bonuses: [bonus(1, { spot: 'zabka', kind: 'zul' }), bonus(2, { spot: 'dropped', kind: 'dropped', respawnAt: 5 })] });
    const curr = snap({ time: 10, bonuses: [] });
    expect(diffSnapshots(prev, curr, 'me')).toEqual([{ kind: 'bonus', x: 5, z: 6 }]);
  });

  it('booms once for a ram: new dropped stink plus both buses knocked aside', () => {
    const prev = snap({ buses: [bus(1, { x: 10, z: 10 }), bus(2, { x: 12, z: 10 })] });
    const curr = snap({
      buses: [bus(1, { x: 10, z: 10, pushX: -5 }), bus(2, { x: 12, z: 10, pushX: 5 })],
      bonuses: [bonus(9, { spot: 'dropped', kind: 'dropped', x: 11, z: 10, respawnAt: 30 })],
    });
    expect(diffSnapshots(prev, curr, 'me')).toEqual([{ kind: 'ram', x: 11, z: 10 }]);
  });

  it('stays quiet for a slow scrape and a push that is only fading', () => {
    const prev = snap({ buses: [bus(1, { pushX: 6 })] });
    const curr = snap({ buses: [bus(1, { pushX: 5 }), bus(2, { pushZ: 1 })] });
    expect(diffSnapshots(prev, curr, 'me')).toEqual([]);
  });
});

describe('createCaptureTracker', () => {
  const tiles = (n: number): Tile[] => Array.from({ length: n }, () => ({ ownerId: null }));

  it('reports a jump per player with its size and centre', () => {
    const map = tiles(16);
    const tracker = createCaptureTracker(map, 4);
    map[0].ownerId = 'me';
    map[1].ownerId = 'me';
    map[15].ownerId = 'b';
    expect(tracker.diff(map, 'me')).toEqual([
      { kind: 'capture', x: 1, z: 0.5, tiles: 2, mine: true },
      { kind: 'capture', x: 3.5, z: 3.5, tiles: 1, mine: false },
    ]);
    expect(tracker.diff(map, 'me')).toEqual([]);
  });

  it('ignores huge gains (start zones) and tiles going neutral', () => {
    const map = tiles(SOUND_CAPTURE_MAX_TILES + 10);
    const tracker = createCaptureTracker(map, 10);
    for (const t of map) t.ownerId = 'a';
    expect(tracker.diff(map, 'me')).toEqual([]);
    map[0].ownerId = null;
    expect(tracker.diff(map, 'me')).toEqual([]);
  });
});

describe('captureChord', () => {
  it('rises and gets fuller with more tiles', () => {
    const small = captureChord(5);
    const big = captureChord(120);
    expect(big[0]).toBeGreaterThan(small[0]);
    expect(big.length).toBeGreaterThan(small.length);
    for (const c of [small, big]) for (let i = 1; i < c.length; i++) expect(c[i]).toBeGreaterThan(c[i - 1]);
  });
});

describe('weatherExposure', () => {
  const cell = (kind: WeatherCell['kind'], extra: Partial<WeatherCell> = {}): WeatherCell =>
    ({ id: 1, kind, x: 0, z: 0, radius: 8, vx: 0, vz: 0, bornAt: 0, endsAt: 100, ...extra });

  it('is full deep under a cloud and zero far away', () => {
    expect(weatherExposure([cell('rain')], 1, 1, 50)).toEqual({ rain: 1, harnas: 0 });
    expect(weatherExposure([cell('harnas')], 1, 1, 50)).toEqual({ rain: 0, harnas: 1 });
    expect(weatherExposure([cell('rain')], 30, 0, 50)).toEqual({ rain: 0, harnas: 0 });
  });

  it('fades in when the cloud appears and out before it dissolves', () => {
    expect(weatherExposure([cell('rain')], 0, 0, 0).rain).toBe(0);
    expect(weatherExposure([cell('rain')], 0, 0, 99).rain).toBeCloseTo(0.5);
  });
});
