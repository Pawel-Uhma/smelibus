import { EXTRA_BUSES, MAX_PLAYERS, PLAYER_COLORS } from '../shared/config';
import type { Bus, BusInput, GameState, Player, PlayerId } from '../shared/types';
import { collideBuses, NO_INPUT, updateBus } from './bus';
import { generateWorld } from './world';
import { assignJoinZone, tileIndexAt, updateZones } from './zones';

/** Sandbox party: the map is sized for a full party, players drop straight into a bus. */
export function createGame(seed: number): GameState {
  const world = generateWorld(seed, MAX_PLAYERS);
  const state: GameState = { tick: 0, time: 0, world, players: [], buses: [] };
  for (let i = 0; i < EXTRA_BUSES; i++) state.buses.push(spawnBus(state));
  return state;
}

function spawnBus(state: GameState): Bus {
  const id = state.buses.reduce((m, b) => Math.max(m, b.id), -1) + 1;
  // Buses park on a ring around the map center, facing outward.
  const angle = id * 2.39996; // golden angle spreads them evenly
  const r = state.world.size * 0.3;
  const c = state.world.size / 2;
  return {
    id, x: c + Math.sin(angle) * r, z: c + Math.cos(angle) * r,
    angle, speed: 0, driverId: null, stink: 0,
  };
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

export function removePlayer(state: GameState, id: PlayerId): void {
  for (const bus of state.buses) if (bus.driverId === id) bus.driverId = null;
  state.players = state.players.filter((p) => p.id !== id);
}

export function stepGame(state: GameState, inputs: ReadonlyMap<PlayerId, BusInput>, dt: number): void {
  const prevTiles = new Map(state.buses.map((b) => [b.id, tileIndexAt(state.world, b.x, b.z)]));
  for (const bus of state.buses) {
    const input = (bus.driverId && inputs.get(bus.driverId)) || NO_INPUT;
    updateBus(bus, input, dt, state.world.size);
  }
  collideBuses(state.buses);
  updateZones(state, prevTiles);
  state.tick++;
  state.time += dt;
}
