// Balance numbers live here, not in logic (AGENTS.md).

export const MAX_PLAYERS = 8;
/** Extra buses on top of one per player (GAME_DESIGN: players + 2). */
export const EXTRA_BUSES = 2;
/** Map area per player, in tiles. */
export const TILES_PER_PLAYER = 400;

// City generator (sim/world.ts, card 002). Sizes in tiles.
/** Streets and buildings instead of a flat field. Off until buses collide with buildings. */
export const CITY_ENABLED = false;
/** Road width; a bus is BUS_LENGTH long, so two of them can pass. */
export const CITY_ROAD_WIDTH = 3;
/** Blocks (without roads) are cut while a side is longer than MAX, never below MIN. */
export const CITY_BLOCK_MIN = 6;
export const CITY_BLOCK_MAX = 13;
/** Chance a whole block is a drivable park instead of buildings. */
export const CITY_PARK_CHANCE = 0.15;
/** Building lot side range inside a block. */
export const CITY_LOT_MIN = 2;
export const CITY_LOT_MAX = 4;
/** Chance a lot stays empty (courtyard, drivable). */
export const CITY_EMPTY_LOT_CHANCE = 0.12;
/** Building height range, tiles. */
export const CITY_HEIGHT_MIN = 1;
export const CITY_HEIGHT_MAX = 4;
/** Bus stops per tile of road. */
export const CITY_STOPS_PER_ROAD_TILE = 1 / 40;

/** Simulation step, seconds. */
export const SIM_DT = 1 / 60;
/** How often the server broadcasts a snapshot, ms. */
export const SNAPSHOT_INTERVAL_MS = 50;
/** Render remote buses this far in the past, ms (interpolation buffer). */
export const INTERP_DELAY_MS = 100;
export const RECONNECT_SECONDS = 60;

// Bus physics, in tiles and seconds.
export const BUS_LENGTH = 3;
export const BUS_WIDTH = 1.2;
export const BUS_MAX_SPEED = 14;
export const BUS_MAX_REVERSE = 5;
export const BUS_ACCEL = 10;
export const BUS_BRAKE = 22;
export const BUS_DRAG = 2.5;
/** Radians per second at full steer and enough speed. */
export const BUS_TURN_RATE = 2.4;
/** Speed below which steering gets weaker (no turning in place). */
export const BUS_TURN_FULL_SPEED = 4;
/** Reach of a bus around its centre, used for picking up bonuses. */
export const BUS_RADIUS = 1.1;
/** Bus–bus and bus–edge collisions use the bus rectangle: BUS_LENGTH by this, the voxel model's width (5 of 18 voxels). */
export const BUS_HIT_WIDTH = (BUS_LENGTH * 5) / 18;
/** Fraction of speed kept after hitting another bus or the map edge. */
export const BUS_BOUNCE = 0.4;
/** How fast tyres scrub away sideways knock-back after a hit, tiles/s². */
export const BUS_SIDE_FRICTION = 20;
/** Fraction of a rammed bus's stink knocked onto the ground. */
export const RAM_STINK_LOSS = 0.3;
/** Minimum closing speed (tiles/s) for a bus–bus hit to count as ramming. */
export const RAM_MIN_SPEED = 4;

/** Own bus prediction: error to the server above this (tiles) snaps instead of easing. */
export const PREDICTION_SNAP_DIST = 4;
/** How fast the remaining error to the server is eased away, 1/s. */
export const PREDICTION_CORRECT_RATE = 3;

export const STINK_MAX = 100;
/** Upper bounds of the clean and smelly look stages; above the last one the bus is filthy. */
export const STINK_STAGE_LIMITS = [30, 70] as const;

// Stink bonuses (GAME_DESIGN: Bonusy smrodu). Amounts are stink points, times in seconds.
/** Stink lost per second while driving around. */
export const STINK_DECAY_PER_S = 0.5;
/** Decay multiplier while a picked-up drunk ("żul") is sitting in the bus. */
export const ZUL_DECAY_MULT = 0.5;
export const ZUL_SIT_SECONDS = 20;
/** Pickup circle radius of a bonus; a bus collects it when the circles touch. */
export const BONUS_RADIUS = 0.6;
export const BONUS_RESPAWN_S = 15;
export const TRASH_RESPAWN_S = 20;
export const CONTROLLER_RESPAWN_S = 15;
/** Knocked-out stink lying on the ground vanishes after this long. */
export const DROPPED_STINK_TTL_S = 20;
/** Knocked-out stink can't be picked up for this long, so the two buses that crashed don't
 *  instantly swallow it back at the contact point. */
export const DROPPED_STINK_PICKUP_DELAY_S = 1;
/** Spawn spots per map tile (×size², at least 1 each). */
export const BUS_STOPS_PER_TILE = 1 / 150;
export const MAP_BONUS_SPOTS_PER_TILE = 1 / 60;
export const TRASH_CANS_PER_TILE = 1 / 120;
export const CONTROLLERS_PER_TILE = 1 / 400;
/** Bus stops hold a drunk this often, otherwise a regular bonus. */
export const STOP_ZUL_CHANCE = 0.5;
export const BONUS_STINK = {
  zul: 25,
  kebab: 10,
  dog: 15,
  fan: 20,
  herring: 12,
  durian: 40,
  trash: 8,
  controller: -20,
} as const;
/** Spawn weights for regular bonuses on map spots and stops (durian is rare, kebab common). */
export const BONUS_WEIGHTS = { kebab: 5, dog: 3, fan: 2, herring: 3, durian: 1 } as const;

export const PLAYER_COLORS = [
  0x2f6bd6, 0xee7f1e, 0xc8357a, 0xe5bc1f, 0xc9a0dc, 0xa3203a, 0x5b2a6e, 0x3c3f4a,
];
export const NEUTRAL_COLOR = 0xd9d4c7;

// Zones (sim/zones.ts).
/** Sudden death: from `after` seconds into the game, the jump size is multiplied by `multiplier`. */
export const SUDDEN_DEATH = [
  { after: 8 * 60, multiplier: 2 },
  { after: 10 * 60, multiplier: 3 },
];
/** Tiles taken per point of stink on a jump (before the sudden death multiplier). */
export const TILES_PER_STINK = 1;
/** Start points sit on a ring this far from the center, as a fraction of map size. */
export const START_RING = 0.3;

// Weather (sim/weather.ts): rain and Harnaś clouds over part of the map.
/** At most this many clouds at once. */
export const WEATHER_MAX_CELLS = 3;
/** Chance per second that a new cloud appears (while below the max). */
export const WEATHER_SPAWN_PER_S = 1 / 12;
/** Share of clouds that rain Harnaś instead of water. */
export const HARNAS_CHANCE = 0.25;
export const WEATHER_RADIUS_MIN = 6;
export const WEATHER_RADIUS_MAX = 11;
/** Drift speed range, tiles/s. */
export const WEATHER_SPEED_MIN = 0.6;
export const WEATHER_SPEED_MAX = 2;
/** Lifetime range of a cloud, seconds. */
export const WEATHER_LIFE_MIN_S = 20;
export const WEATHER_LIFE_MAX_S = 45;
/** Stink washed off per second under rain (on top of normal decay). */
export const RAIN_STINK_PER_S = 3;
/** Stink added per second under Harnaś. */
export const HARNAS_STINK_PER_S = 2;
