// Balance numbers live here, not in logic (AGENTS.md).

export const MAX_PLAYERS = 8;
/** Extra buses on top of one per player (GAME_DESIGN: players + 2). */
export const EXTRA_BUSES = 2;
/** Map area per player, in tiles. */
export const TILES_PER_PLAYER = 400;

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
/** Bus–bus and bus–edge collisions use a capsule: a segment along the bus, this radius around it. */
export const BUS_CAPSULE_RADIUS = 0.45;
/** Fraction of speed kept after hitting another bus or the map edge. */
export const BUS_BOUNCE = 0.4;
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
