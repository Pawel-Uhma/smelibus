import { CITY_ENABLED, EXTRA_BUSES, MAX_PLAYERS, PLAYER_COLORS } from '../shared/config';
import type { Bus, BusInput, GameState, Player, PlayerId } from '../shared/types';
import { dropStink, spawnBonuses, updateBonuses } from './bonus';
import { collideBuses, NO_INPUT, parkBus, updateBus } from './bus';
import { hitPedestrians, updatePlayers } from './player';
import { updateWeather } from './weather';
import { busVelocity, collidePaczkomats, hitPaczkomats, spawnPaczkomats } from './paczkomat';
import { collideZabkas, spawnZabkas, updateZabkas } from './zabka';
import { generateWorld, nearestDrivable } from './world';
import { assignJoinZone, tileIndexAt, updateZones } from './zones';

/** Sandbox party: the map is sized for a full party, players drop straight into a bus. */
export function createGame(seed: number, city = CITY_ENABLED, osm?: boolean): GameState {
  const world = generateWorld(seed, MAX_PLAYERS, city, osm);
  const state: GameState = { tick: 0, time: 0, world, players: [], buses: [] };
  for (let i = 0; i < EXTRA_BUSES; i++) state.buses.push(spawnBus(state));
  spawnBonuses(state);
  spawnZabkas(state);
  spawnPaczkomats(state);
  return state;
}

function spawnBus(state: GameState): Bus {
  const id = state.buses.reduce((m, b) => Math.max(m, b.id), -1) + 1;
  // Buses park on a ring around the map center, facing outward.
  const angle = id * 2.39996; // golden angle spreads them evenly
  const r = state.world.size * 0.3;
  const c = state.world.size / 2;
  const { x, z } = nearestDrivable(state.world, c + Math.sin(angle) * r, c + Math.cos(angle) * r);
  const bus: Bus = { id, x, z, angle, speed: 0, driverId: null, stink: 0 };
  parkBus(bus, state.world, x, z);
  return bus;
}

export function addPlayer(state: GameState, id: PlayerId, name: string): Player {
  const used = new Set(state.players.map((p) => p.color));
  const color = PLAYER_COLORS.find((c) => !used.has(c)) ?? PLAYER_COLORS[state.players.length % MAX_PLAYERS];
  const player: Player = { id, name, color, busId: null, connected: true };
  state.players.push(player);
  assignJoinZone(state, id);
  // Keep the pool at players + EXTRA_BUSES, then seat the player in a free bus.
  while (state.buses.length < state.players.length + EXTRA_BUSES) state.buses.push(spawnBus(state));
  const bus = state.buses.find((b) => b.driverId === null);
  if (bus) {
    bus.driverId = id;
    player.busId = bus.id;
  }
  return player;
}

/** Player is gone for good (left or missed RECONNECT_SECONDS): bus is freed, zone turns neutral. */
export function removePlayer(state: GameState, id: PlayerId): void {
  for (const bus of state.buses) if (bus.driverId === id) bus.driverId = null;
  for (const tile of state.world.tiles) if (tile.ownerId === id) tile.ownerId = null;
  state.players = state.players.filter((p) => p.id !== id);
}

export function stepGame(state: GameState, inputs: ReadonlyMap<PlayerId, BusInput>, dt: number): void {
  const prevTiles = new Map(state.buses.map((b) => [b.id, tileIndexAt(state.world, b.x, b.z)]));
  updatePlayers(state, inputs, dt);
  for (const bus of state.buses) {
    const input = (bus.driverId && inputs.get(bus.driverId)) || NO_INPUT;
    updateBus(bus, input, dt, state.world.size, state.world);
    collideZabkas(bus, state.world.zabkas);
    const v = busVelocity(bus);
    hitPaczkomats(state, bus, collidePaczkomats(bus, state.world.paczkomats), v);
  }
  for (const d of collideBuses(state.buses, state.world.size, state.world)) dropStink(state, d.x, d.z, d.amount);
  hitPedestrians(state);
  updateZabkas(state);
  updateBonuses(state, dt);
  updateWeather(state, dt);
  updateZones(state, prevTiles);
  state.tick++;
  state.time += dt;
}
