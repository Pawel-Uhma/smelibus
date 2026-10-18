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
  /** Game time until which stink decays slower (a drunk is sitting inside). */
  slowDecayUntil?: number;
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
  /** Set by sim/zones.ts once a player owns 100% of the map. */
  winnerId?: PlayerId | null;
  /** Stink bonuses on the map (sim/bonus.ts). */
  bonuses?: Bonus[];
  /** RNG state of the bonus spawner, so the sim stays deterministic. */
  bonusRng?: number;
}

export type BonusKind =
  | 'zul' | 'kebab' | 'dog' | 'fan' | 'herring' | 'durian' | 'trash' | 'controller' | 'dropped';

/** Where a bonus lives: decides what respawns there. `dropped` is a one-off from a ram. */
export type BonusSpot = 'stop' | 'map' | 'trash' | 'controller' | 'dropped';

export interface Bonus {
  id: number;
  spot: BonusSpot;
  kind: BonusKind;
  x: number;
  z: number;
  /** Stink added on pickup; negative for the ticket controller. */
  amount: number;
  /** false = collected / knocked over, waiting for respawnAt. */
  active: boolean;
  /** Game time when it comes back (or, for `dropped`, when it vanishes). */
  respawnAt: number;
  /** Game time before which it can't be picked up (knocked-out stink). */
  pickableAt?: number;
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
