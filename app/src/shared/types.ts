// Contracts between modules. Additive changes only (AGENTS.md).

export type PlayerId = string;

export interface BusInput {
  /** -1 (brake / reverse) .. 1 (gas) */
  throttle: number;
  /** -1 (left) .. 1 (right) */
  steer: number;
  /** Client prediction: grows by one on every input change, the server acks it (InputAck). */
  seq?: number;
  /** Use key (E) press counter: a change means one press (enter or leave a bus). */
  use?: number;
  /** Jump key (Space) press counter, like `use`: a change means one jump (on foot only). */
  jump?: number;
  /** Horn key (H) press counter, like `use`: the server mirrors it into Player.horn. */
  horn?: number;
}

/** Last input seq the server got from a player and for how many sim ticks it has run it. */
export interface InputAck {
  seq: number;
  ticks: number;
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
  /** Sideways knock-back velocity from a hit (tiles/s, world axes); tyres scrub it away. */
  pushX?: number;
  pushZ?: number;
}

export interface Player {
  id: PlayerId;
  name: string;
  color: number;
  busId: number | null;
  /** On foot (busId null): position and facing, like a bus. */
  x?: number;
  z?: number;
  angle?: number;
  /** Game time until which the pedestrian is knocked down (hit by a bus). */
  stunnedUntil?: number;
  /** Last `BusInput.use` counter the sim has acted on. */
  useSeen?: number;
  /** Game time of the last jump start (on foot); airborne for PEDESTRIAN_JUMP_S after it. */
  jumpAt?: number;
  /** Last `BusInput.jump` counter the sim has acted on. */
  jumpSeen?: number;
  /** Last BusInput.horn counter from this player (server relays it); a rise = one honk. */
  horn?: number;
  connected: boolean;
  /** Computer player run by the server (sim/bot.ts, card 037). */
  bot?: boolean;
}

/** What stands on a tile (card 002 city generator). Missing = 'grass' (flat map). */
export type TileKind = 'grass' | 'road' | 'park' | 'building';

export interface Tile {
  ownerId: PlayerId | null;
  /** Missing on the flat map. Only 'building' blocks driving. */
  kind?: TileKind;
  /** Building height in tiles (only for 'building'). */
  height?: number;
}

export interface World {
  seed: number;
  /** Map is size × size tiles; tile (i, j) covers x ∈ [i, i+1), z ∈ [j, j+1). */
  size: number;
  tiles: Tile[];
  /** Bus stop spots on road tiles next to buildings, from the city generator. */
  stops?: { x: number; z: number }[];
  /** Żabka shops (sim/zabka.ts), fixed for the match, so they travel with the world on join. */
  zabkas?: { x: number; z: number }[];
  /** InPost parcel lockers (sim/paczkomat.ts): centre and the axis-aligned unit direction the
   *  locker doors face. Fixed for the match. */
  paczkomats?: { x: number; z: number; fx: number; fz: number }[];
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
  /** Game time when each shop in world.zabkas lets out its next drunk (same order). */
  zabkaNextAt?: number[];
  /** Game time from which each locker in world.paczkomats can drop again (same order). */
  paczkomatReadyAt?: number[];
  /** Rain / Harnaś clouds drifting over the map (sim/weather.ts). */
  weather?: WeatherCell[];
  /** RNG state of the weather spawner. */
  weatherRng?: number;
}

/** rain washes stink off, harnas (cans of beer falling from the sky) adds it. */
export type WeatherKind = 'rain' | 'harnas';

/** A circular cloud drifting over part of the map; buses under it are affected. */
export interface WeatherCell {
  id: number;
  kind: WeatherKind;
  x: number;
  z: number;
  radius: number;
  /** Drift velocity, tiles/s. */
  vx: number;
  vz: number;
  /** Game time when it appeared and when it dissolves (render fades in/out). */
  bornAt: number;
  endsAt: number;
}

export type BonusKind =
  | 'zul' | 'kebab' | 'dog' | 'fan' | 'herring' | 'durian' | 'trash' | 'controller' | 'dropped'
  | 'parcel' | 'poop';

/** Where a bonus lives: decides what respawns there. `dropped` (from a ram) and `zabka`
 *  (a drunk let out by a shop) are one-offs. */
export type BonusSpot = 'stop' | 'map' | 'trash' | 'controller' | 'dropped' | 'zabka'
  /** A parcel or poop knocked out of an InPost locker (sim/paczkomat.ts), one-off. */
  | 'paczkomat';

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
  /** Index in world.zabkas of the shop that let this drunk out (spot 'zabka'). */
  zabka?: number;
  /** A Żabka drunk walking from (x, z) here to the bonus x, z between game times `from` and
   *  `until`, then lying there. Clients compute the position from this, no per-tick updates. */
  walk?: { x: number; z: number; from: number; until: number };
}

/** What the server broadcasts every SNAPSHOT_INTERVAL_MS. The world is sent once on join. */
export interface Snapshot {
  tick: number;
  /** Room sim step this snapshot was sent at (60 Hz, runs in the waiting room too). Clients
   *  interpolate by it instead of arrival time. Missing from older servers. */
  serverTick?: number;
  time: number;
  players: Player[];
  buses: Bus[];
  /** Tiles whose owner changed since the previous snapshot. Missing = none. */
  tileChanges?: TileChange[];
  /** Same as GameState.winnerId. */
  winnerId?: PlayerId | null;
  /** All bonuses (GameState.bonuses). The server omits it when unchanged; net/client fills it from the previous snapshot. */
  bonuses?: Bonus[];
  /** Same as GameState.weather (a few cells, sent every snapshot). */
  weather?: WeatherCell[];
  /** Per player, for own-bus prediction (sim/prediction.ts). */
  acks?: Record<PlayerId, InputAck>;
}

/** [tile index in World.tiles, new ownerId]. */
export type TileChange = [index: number, ownerId: PlayerId | null];

/** Sent once to a client right after it joins. */
export interface Welcome {
  playerId: PlayerId;
  world: World;
}

/** Options a client sends with `create` / `joinById` (card 016). */
export interface JoinOptions {
  name?: string;
  /** Preferred color from PLAYER_COLORS; the server falls back to a free one. */
  color?: number;
  /** Only read on create: public parties show up on the home screen list. */
  public?: boolean;
}

/** Party lobby state, sent as a `lobby` message on `hello` and whenever it changes. */
/** Map the host picks in the waiting room (card 028). */
export type MapKind = 'city' | 'flat';

export interface LobbyInfo {
  hostId: PlayerId | null;
  /** false = waiting room, the sim is paused until the host clicks Start. */
  started: boolean;
  public: boolean;
  /** Current map; the host can switch it before Start (message `map`). */
  map?: MapKind;
}

/** Room metadata of a party, as seen on the public list. */
export interface PartyMetadata {
  public: boolean;
  started: boolean;
  hostName: string;
  /** Bots in the party; they take seats but aren't Colyseus clients (card 037). */
  bots?: number;
}

/** One entry of the public party list. */
export interface PublicParty {
  code: string;
  players: number;
  maxPlayers: number;
  started: boolean;
  hostName: string;
}
