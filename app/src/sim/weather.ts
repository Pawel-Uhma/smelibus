import {
  HARNAS_CHANCE, HARNAS_STINK_PER_S, RAIN_STINK_PER_S, STINK_MAX, WEATHER_LIFE_MAX_S,
  WEATHER_LIFE_MIN_S, WEATHER_MAX_CELLS, WEATHER_RADIUS_MAX, WEATHER_RADIUS_MIN,
  WEATHER_SPAWN_PER_S, WEATHER_SPEED_MAX, WEATHER_SPEED_MIN,
} from '../shared/config';
import type { GameState, WeatherCell, WeatherKind } from '../shared/types';

/** mulberry32 step on state.weatherRng; returns [0, 1). */
function rand(state: GameState): number {
  let t = (state.weatherRng = ((state.weatherRng ?? state.world.seed ^ 0x3a1) + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const between = (state: GameState, lo: number, hi: number) => lo + rand(state) * (hi - lo);

/** A new cloud somewhere over the map, drifting in a random direction. */
export function spawnWeatherCell(state: GameState, kind?: WeatherKind): WeatherCell {
  const cells = (state.weather ??= []);
  const size = state.world.size;
  const dir = rand(state) * Math.PI * 2;
  const speed = between(state, WEATHER_SPEED_MIN, WEATHER_SPEED_MAX);
  const cell: WeatherCell = {
    id: cells.reduce((m, c) => Math.max(m, c.id), -1) + 1,
    kind: kind ?? (rand(state) < HARNAS_CHANCE ? 'harnas' : 'rain'),
    x: rand(state) * size,
    z: rand(state) * size,
    radius: between(state, WEATHER_RADIUS_MIN, WEATHER_RADIUS_MAX),
    vx: Math.sin(dir) * speed,
    vz: Math.cos(dir) * speed,
    bornAt: state.time,
    endsAt: state.time + between(state, WEATHER_LIFE_MIN_S, WEATHER_LIFE_MAX_S),
  };
  cells.push(cell);
  return cell;
}

/** The cloud over a point, if any (the first one wins where clouds overlap). */
export function weatherAt(cells: readonly WeatherCell[] | undefined, x: number, z: number): WeatherCell | null {
  for (const c of cells ?? []) if (Math.hypot(x - c.x, z - c.z) < c.radius) return c;
  return null;
}

/** Drift, expiry, spawning, and the stink effect on buses under a cloud. Call once per sim step. */
export function updateWeather(state: GameState, dt: number): void {
  const size = state.world.size;
  const cells = (state.weather ??= []);
  for (const c of cells) {
    c.x += c.vx * dt;
    c.z += c.vz * dt;
  }
  // Gone when it dissolves or drifts fully off the map.
  state.weather = cells.filter((c) =>
    state.time < c.endsAt &&
    c.x > -c.radius && c.x < size + c.radius && c.z > -c.radius && c.z < size + c.radius);
  if (state.weather.length < WEATHER_MAX_CELLS && rand(state) < WEATHER_SPAWN_PER_S * dt) {
    spawnWeatherCell(state);
  }

  // Parked buses get wet too: rain cleans them, Harnaś soaks them.
  for (const bus of state.buses) {
    const c = weatherAt(state.weather, bus.x, bus.z);
    if (!c) continue;
    const delta = c.kind === 'rain' ? -RAIN_STINK_PER_S : HARNAS_STINK_PER_S;
    bus.stink = Math.max(0, Math.min(STINK_MAX, bus.stink + delta * dt));
  }
}
