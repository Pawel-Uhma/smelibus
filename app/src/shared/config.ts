// Balance numbers live here, not in logic (AGENTS.md).

export const MAX_PLAYERS = 8;
/** Extra buses on top of one per player (GAME_DESIGN: players + 2). */
export const EXTRA_BUSES = 2;
/** Map area per player, in tiles. */
export const TILES_PER_PLAYER = 400;

// City generator (sim/world.ts, card 002). Sizes in tiles.
/** Streets and buildings instead of a flat field (buses bounce off buildings, card 023). */
export const CITY_ENABLED = true;
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

// Pedestrians (card 006).
export const PEDESTRIAN_SPEED = 5.2;
/** Space on foot: a hop this high (tiles) lasting this long (s). */
export const PEDESTRIAN_JUMP_HEIGHT = 0.8;
export const PEDESTRIAN_JUMP_S = 0.5;
export const PEDESTRIAN_RADIUS = 0.25;
/** How far from the bus's side a pedestrian can get in (tiles). */
export const PEDESTRIAN_ENTER_RANGE = 1;
/** A bus moving at least this fast (tiles/s) knocks a pedestrian down. */
export const PEDESTRIAN_HIT_SPEED = 2;
export const STUN_SECONDS = 3;

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
// Żabka shops (sim/zabka.ts): each one lets out drunks ("żul" bonus) that wait until picked up.
/** Shops per map tile (×size², at least 1). */
export const ZABKAS_PER_TILE = 1 / 600;
/** Side of a shop in tiles: it stands on a ZABKA_TILES × ZABKA_TILES lot (render/zabka.ts model). */
export const ZABKA_TILES = 2;
/** Seconds between drunks from one shop at the start of the match, the floor, and how many
 *  seconds the gap shrinks per minute of the match. */
export const ZABKA_SPAWN_START_S = 30;
export const ZABKA_SPAWN_MIN_S = 8;
export const ZABKA_SPAWN_SPEEDUP_PER_MIN = 3;
/** Drunks waiting at one shop at most: ZABKA_ZULS_START, +1 every ZABKA_ZULS_STEP_S, up to ZABKA_ZULS_MAX. */
export const ZABKA_ZULS_START = 1;
export const ZABKA_ZULS_STEP_S = 180;
export const ZABKA_ZULS_MAX = 4;
/** A drunk walks out of the shop door this far (tiles, random in the range) and falls over. */
export const ZABKA_ZUL_WALK_MIN = 1;
export const ZABKA_ZUL_WALK_MAX = 2.5;
/** Walking speed of a drunk, tiles/s. */
export const ZABKA_ZUL_WALK_SPEED = 0.6;
/** Stink of a drunk lying on the ground (he gives BONUS_STINK.zul while still walking). */
export const ZABKA_ZUL_FALLEN_STINK = 40;
export const BONUS_STINK = {
  zul: 25,
  kebab: 10,
  dog: 15,
  fan: 20,
  herring: 12,
  durian: 40,
  trash: 8,
  controller: -20,
  parcel: 5,
  poop: 30,
} as const;
// InPost parcel lockers (sim/paczkomat.ts): ramming one knocks out a parcel or, sometimes, a poop.
/** Lockers per map tile (×size², at least 1). */
export const PACZKOMATS_PER_TILE = 1 / 500;
/** Chance that a hit knocks out a poop (BONUS_STINK.poop) instead of a parcel. */
export const PACZKOMAT_POOP_CHANCE = 0.3;
/** Slowest hit (tiles/s into the locker, before the bounce) that still knocks something out. */
export const PACZKOMAT_HIT_MIN_SPEED = 3;
/** After a drop the locker is empty for this long. */
export const PACZKOMAT_COOLDOWN_S = 6;
/** The drop lands this far (tiles) from the locker, on the side it was hit from. */
export const PACZKOMAT_DROP_DIST = 1.1;
/** A drop on the ground vanishes after this long and can't be picked up for the first moment. */
export const PACZKOMAT_DROP_TTL_S = 20;
export const PACZKOMAT_DROP_PICKUP_DELAY_S = 0.4;
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

// Touch controls on phones (input/touch.ts).
/** Stick radius in CSS px: a thumb this far from the centre is full throttle / full steer. */
export const TOUCH_STICK_RADIUS = 56;
/** Share of the radius that still counts as no input. */
export const TOUCH_STICK_DEADZONE = 0.15;
/** Stick values are rounded to this step, so a still thumb doesn't flood the server with inputs. */
export const TOUCH_STICK_STEP = 0.1;

// Minimap and the arrow to the own zone (ui/minimap.ts).
/** Minimap side in CSS px on desktop and on phones (touch controls on). */
export const MINIMAP_SIZE_PX = 168;
export const MINIMAP_SIZE_TOUCH_PX = 104;
/** Building tiles are drawn at this share of the owner color's brightness. */
export const MINIMAP_BUILDING_SHADE = 0.62;
/** Dot radii as a share of the minimap side. */
export const MINIMAP_BUS_DOT = 0.028;
export const MINIMAP_OWN_BUS_DOT = 0.045;
export const MINIMAP_PEDESTRIAN_DOT = 0.016;
/** Cloud fill opacity on the minimap. */
export const MINIMAP_CLOUD_ALPHA = 0.35;
/** The border arrow sits this many CSS px inside the screen edge. */
export const BORDER_ARROW_MARGIN_PX = 44;
