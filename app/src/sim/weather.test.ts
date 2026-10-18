import { describe, expect, it } from 'vitest';
import { HARNAS_STINK_PER_S, RAIN_STINK_PER_S, STINK_MAX, WEATHER_MAX_CELLS } from '../shared/config';
import type { GameState, WeatherCell, WeatherKind } from '../shared/types';
import { addPlayer, createGame, stepGame } from './game';
import { spawnWeatherCell, updateWeather, weatherAt } from './weather';

/** Game with one bus parked at (20, 20) and a still cloud of the given kind over it. */
function setup(kind: WeatherKind): { s: GameState; cell: WeatherCell } {
  const s = createGame(1);
  addPlayer(s, 'a', 'A');
  s.bonuses = [];
  Object.assign(s.buses[0], { x: 20, z: 20, stink: 50 });
  for (const b of s.buses.slice(1)) Object.assign(b, { x: 50, z: 50, stink: 50 });
  const cell: WeatherCell = { id: 0, kind, x: 20, z: 20, radius: 5, vx: 0, vz: 0, bornAt: 0, endsAt: 1e9 };
  s.weather = [cell];
  return { s, cell };
}

describe('weather', () => {
  it('rain washes stink off buses under the cloud only', () => {
    const { s } = setup('rain');
    updateWeather(s, 1);
    expect(s.buses[0].stink).toBeCloseTo(50 - RAIN_STINK_PER_S);
    expect(s.buses[1].stink).toBe(50);
  });

  it('Harnaś adds stink, capped at STINK_MAX', () => {
    const { s } = setup('harnas');
    updateWeather(s, 1);
    expect(s.buses[0].stink).toBeCloseTo(50 + HARNAS_STINK_PER_S);
    for (let i = 0; i < 100; i++) updateWeather(s, 1);
    expect(s.buses[0].stink).toBe(STINK_MAX);
  });

  it('rain never pushes stink below zero', () => {
    const { s } = setup('rain');
    for (let i = 0; i < 100; i++) updateWeather(s, 1);
    expect(s.buses[0].stink).toBe(0);
  });

  it('clouds drift and the effect follows them', () => {
    const { s, cell } = setup('rain');
    cell.vx = 2;
    updateWeather(s, 4);
    expect(cell.x).toBeCloseTo(28);
    expect(weatherAt(s.weather, 20, 20)).toBeNull();
    expect(weatherAt(s.weather, 28, 20)).toBe(cell);
  });

  it('clouds dissolve after endsAt or once they drift off the map', () => {
    const { s, cell } = setup('rain');
    cell.endsAt = 0.5;
    s.time = 1;
    updateWeather(s, 0);
    expect(s.weather!.some((c) => c.id === cell.id)).toBe(false);

    const off = spawnWeatherCell(s);
    Object.assign(off, { x: -off.radius - 0.1, vx: 0, vz: 0 });
    updateWeather(s, 0);
    expect(s.weather!.some((c) => c.id === off.id)).toBe(false);
  });

  it('spawns both kinds over time, never more than the max, inside the map', () => {
    const s = createGame(3);
    const kinds = new Set<WeatherKind>();
    for (let t = 0; t < 3000; t++) {
      s.time = t;
      updateWeather(s, 1);
      expect(s.weather!.length).toBeLessThanOrEqual(WEATHER_MAX_CELLS);
      for (const c of s.weather!) {
        kinds.add(c.kind);
        if (c.bornAt === t) {
          expect(c.x).toBeGreaterThanOrEqual(0);
          expect(c.x).toBeLessThan(s.world.size);
        }
      }
    }
    expect([...kinds].sort()).toEqual(['harnas', 'rain']);
  });

  it('is deterministic for the same seed', () => {
    const run = () => {
      const s = createGame(9);
      for (let t = 0; t < 600; t++) {
        s.time = t;
        updateWeather(s, 1);
      }
      return JSON.stringify(s.weather);
    };
    expect(run()).toBe(run());
  });

  it('runs as part of stepGame', () => {
    const { s } = setup('rain');
    stepGame(s, new Map(), 1);
    // Rain on top of the normal decay.
    expect(s.buses[0].stink).toBeLessThan(50 - RAIN_STINK_PER_S + 0.01);
  });
});
