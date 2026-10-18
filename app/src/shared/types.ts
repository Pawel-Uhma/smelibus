// Contracts between modules. Additive changes only (AGENTS.md).

export type PlayerId = string;

export interface BusInput {
  /** -1 (brake / reverse) .. 1 (gas) */
  throttle: number;
  /** -1 (left) .. 1 (right) */
  steer: number;
}

export interface Bus {
  id: number;
  x: number;
  z: number;
  /** Heading in radians; 0 points to +z. */
  angle: number;
  /** Signed forward speed, tiles/s. */
  speed: number;
  driverId: PlayerId | null;
  stink: number;
}

export interface Player {
  id: PlayerId;
  name: string;
  color: number;
  busId: number | null;
  connected: boolean;
}

export interface Tile {
  ownerId: PlayerId | null;
}

export interface World {
  seed: number;
  /** Map is size × size tiles; tile (i, j) covers x ∈ [i, i+1), z ∈ [j, j+1). */
  size: number;
  tiles: Tile[];
}

export interface GameState {
  tick: number;
  time: number;
  world: World;
  players: Player[];
  buses: Bus[];
}

/** What the server broadcasts every SNAPSHOT_INTERVAL_MS. The world is sent once on join. */
export interface Snapshot {
  tick: number;
  time: number;
  players: Player[];
  buses: Bus[];
}

/** Sent once to a client right after it joins. */
export interface Welcome {
  playerId: PlayerId;
  world: World;
}
