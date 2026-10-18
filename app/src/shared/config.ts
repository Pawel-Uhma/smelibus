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
/** Collision circle radius used for bus–bus and bus–edge checks. */
export const BUS_RADIUS = 1.1;
/** Fraction of speed kept after hitting another bus or the map edge. */
export const BUS_BOUNCE = 0.4;
/** Fraction of a rammed bus's stink knocked onto the ground. */
export const RAM_STINK_LOSS = 0.3;
/** Minimum closing speed (tiles/s) for a bus–bus hit to count as ramming. */
export const RAM_MIN_SPEED = 4;

export const STINK_MAX = 100;

export const PLAYER_COLORS = [
  0x2f6bd6, 0xee7f1e, 0xc8357a, 0xe5bc1f, 0x1fa9c9, 0xa3203a, 0x1e2f7a, 0x3c3f4a,
];
export const NEUTRAL_COLOR = 0xd9d4c7;
