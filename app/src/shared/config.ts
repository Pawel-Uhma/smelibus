// Balance numbers live here, not in logic (AGENTS.md).

export const MAX_PLAYERS = 8;
/** Extra buses on top of one per player (GAME_DESIGN: players + 2). */
export const EXTRA_BUSES = 2;
/** Map area per player, in tiles (the city needs room for streets wide enough for buses). */
export const TILES_PER_PLAYER = 1600;

// City generator (sim/city.ts, cards 002 and 038). Sizes in tiles; a bus is 3 long, 1.2 wide.
/** Streets and buildings instead of a flat field (buses bounce off buildings, card 023). */
export const CITY_ENABLED = true;
/**
 * Street cross-sections, half widths from the centreline outward: median (green, avenue only),
 * carriageway, green strip with trees, sidewalk. A bike path (CITY_BIKE_WIDTH) sits between the
 * green strip and the sidewalk on one side of some streets.
 */
export const CITY_STREETS = {
  avenue: { median: 0.8, road: 3.6, green: 0.7, walk: 1.1 },
  street: { median: 0, road: 2.7, green: 0.7, walk: 1 },
  lane: { median: 0, road: 2.2, green: 0, walk: 1 },
} as const;
export const CITY_BIKE_WIDTH = 1;
/** Street grid: node spacing, how far nodes are shaken off the grid (share of the spacing) and
 *  the largest tilt of the whole grid, radians. */
export const CITY_GRID_SPACING = 36;
export const CITY_GRID_JITTER = 0.2;
export const CITY_GRID_TILT = 0.4;
/** Chance a street is dropped (two blocks merge) and a block gets a diagonal street across. */
export const CITY_DROP_STREET_CHANCE = 0.16;
export const CITY_DIAGONAL_CHANCE = 0.08;
/** Chance a plain junction of four streets is a roundabout; the avenue crossing always is. */
export const CITY_ROUNDABOUT_CHANCE = 0.35;
/** Roundabout outer radius (edge of the ring road) for streets and for the avenue crossing. */
export const CITY_ROUNDABOUT_R = 6;
export const CITY_ROUNDABOUT_BIG_R = 8;
/** Width of the ring road; the rest of the circle is a green island. */
export const CITY_ROUNDABOUT_RING = 4.5;
/** Chance a block is a park. */
export const CITY_PARK_CHANCE = 0.13;
/** Height of one storey, tiles. */
export const CITY_FLOOR_HEIGHT = 0.75;
/** Tenement frontage: depth from the street, lot width along it, storeys, chance a lot stays empty. */
export const CITY_TENEMENT_DEPTH = 4;
export const CITY_TENEMENT_LOT_MIN = 4;
export const CITY_TENEMENT_LOT_MAX = 6;
export const CITY_TENEMENT_FLOORS_MIN = 3;
export const CITY_TENEMENT_FLOORS_MAX = 6;
export const CITY_EMPTY_LOT_CHANCE = 0.1;
/** Prefab housing estate blocks ("bloki"): slab thickness and length, storeys of low and high slabs. */
export const CITY_SLAB_THICKNESS = 3;
export const CITY_SLAB_LENGTH_MIN = 9;
export const CITY_SLAB_LENGTH_MAX = 20;
export const CITY_SLAB_FLOORS_LOW = 5;
export const CITY_SLAB_FLOORS_HIGH = 11;
/** Glass office towers downtown: footprint side and storeys. */
export const CITY_TOWER_SIDE_MIN = 5;
export const CITY_TOWER_SIDE_MAX = 7;
export const CITY_TOWER_FLOORS_MIN = 12;
export const CITY_TOWER_FLOORS_MAX = 20;
/** Palace of Culture footprint side (one, near the centre, on a paved square). */
export const CITY_PALACE_SIDE = 11;
/** Disconnected pockets smaller than this many tiles are filled in, bigger ones get a gateway. */
export const CITY_MIN_POCKET = 12;
/** Bus stops per tile of road. */
export const CITY_STOPS_PER_ROAD_TILE = 1 / 40;

// Real streets from OpenStreetMap (card 014, proposal in DECISIONS): src/data/osmWarszawa.ts.
/** City from the OSM extract of central Warsaw instead of the random grid. Off = card 038 city. */
export const CITY_OSM_ENABLED = false;
/** Metres of the real city per tile (a 12 m bus would be 3 tiles at 4; 5 keeps more streets on the map). */
export const OSM_METERS_PER_TILE = 5;
/** Street cross-section per OSM highway class: [one carriageway, two-way or merged pair]. */
export const OSM_STREET_KINDS: Record<string, readonly ['avenue' | 'street' | 'lane', 'avenue' | 'street' | 'lane']> = {
  primary: ['street', 'avenue'],
  secondary: ['street', 'avenue'],
  tertiary: ['lane', 'street'],
  unclassified: ['lane', 'lane'],
  residential: ['lane', 'lane'],
  living_street: ['lane', 'lane'],
};
/** Real roundabout radius is clamped to this range, tiles. */
export const OSM_ROUNDABOUT_R_MAX = 10;
/** An OSM stop snaps to a road tile at most this far away, tiles. */
export const OSM_STOP_SNAP = 6;

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
export const ZABKAS_PER_TILE = 1 / 1400;
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
export const PACZKOMATS_PER_TILE = 1 / 1100;
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
/** Tiles taken per point of stink on a jump (before the sudden death multiplier). 4 since the
 *  city map grew 4× in area (card 038), so a jump takes the same share of the map. */
export const TILES_PER_STINK = 4;
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

// Day/night cycle (render/night.ts): looks only, the sim doesn't change. Driven by game time, so
// every player has the same hour. `?noc` in the URL or key N forces night, `?noc=0` keeps the day.
export const DAY_NIGHT_CYCLE = true;
/** One full day + night, seconds of game time. The match starts in the morning. */
export const DAY_NIGHT_CYCLE_S = 240;
/** Share of the cycle that is night (twilights included). */
export const NIGHT_SHARE = 0.35;
/** Length of dusk and of dawn, seconds. */
export const TWILIGHT_S = 12;
/** Ambient (hemisphere) and moon (the sun light) intensity at night; day is 1.6 and 1.4. */
export const NIGHT_AMBIENT = 0.35;
export const NIGHT_MOON = 0.25;
/** Bus headlight beam: SpotLight intensity, reach in tiles, cone half-angle in radians. */
export const NIGHT_HEADLIGHT_INTENSITY = 22;
export const NIGHT_HEADLIGHT_RANGE = 20;
export const NIGHT_HEADLIGHT_ANGLE = 0.5;
/** Strength (0..1) of the red taillight glow on the ground behind a bus. */
export const NIGHT_TAILLIGHT_GLOW = 0.45;
/** Żabka shop light: PointLight intensity and reach in tiles, at most this many shops get a real light. */
export const NIGHT_ZABKA_INTENSITY = 6;
export const NIGHT_ZABKA_RANGE = 7;
export const NIGHT_ZABKA_LIGHTS_MAX = 8;

// Sound effects (audio/), all generated with Web Audio.
/** Other players' horns are heard up to this far, tiles; volume falls with distance. */
export const SOUND_HORN_RANGE = 26;
/** Other sound effects (pickups, rams, captures) are heard up to this far, tiles. */
export const SOUND_RANGE = 18;
/** Closer than this, a sound plays at full volume, tiles. */
export const SOUND_FULL_DIST = 3;
/** A bus knocked sideways at least this fast (tiles/s) in one snapshot makes a "bum". */
export const SOUND_RAM_PUSH = 3;
/** Tile gains bigger than this aren't a jump (game start, join zones) and stay silent. */
export const SOUND_CAPTURE_MAX_TILES = 1200;
/** Captures of this many tiles or more get the highest jump chord. */
export const SOUND_CAPTURE_TOP_TILES = 600;
/** Harnaś can clinks per second at full exposure under the cloud. */
export const SOUND_CLINKS_PER_S = 7;
/** Master volume, 0..1. */
export const SOUND_VOLUME = 0.6;

// High contrast mode (render/contrast.ts, card 036).
/**
 * Zone fill = player color mixed this much with the neutral ground (normal mode uses 0.45).
 * Paler, not purer: a bus has its owner's color, so a pure fill would hide it; ownership is
 * read from the thick black border instead.
 */
export const HIGH_CONTRAST_FILL_MIX = 0.62;
/** Zone border width in texels per side, of SUB per tile; both owners draw it, so the line is twice this. */
export const HIGH_CONTRAST_BORDER_TEXELS = 1;
/** Night never gets darker than this (0 day .. 1 full night). */
export const HIGH_CONTRAST_NIGHT_MAX = 0.35;

// Computer players (sim/bot.ts, card 037). They run on the server and send BusInput like a client.
/** Names for bots added in the waiting room, used in order (first free one). */
export const BOT_NAMES = ['Bot Zdzisiek', 'Bot Grażyna', 'Bot Mirek', 'Bot Halina', 'Bot Janusz', 'Bot Bożena', 'Bot Waldek', 'Bot Krysia'];
/** A bot heads home to bank its stink once it carries a random amount in this range. */
export const BOT_BANK_STINK_MIN = 30;
export const BOT_BANK_STINK_MAX = 65;
/** Path to the current goal is recomputed this often, seconds. */
export const BOT_REPATH_S = 0.4;
/** A bot aims at a path tile up to this many tiles ahead that it can see in a straight line. */
export const BOT_LOOKAHEAD = 5;
/** Barely moving this long while trying to drive = stuck: it backs up for BOT_REVERSE_S. */
export const BOT_STUCK_S = 0.7;
export const BOT_REVERSE_S = 0.9;
/** Rams a rival bus only while carrying less than this and when the rival has at least BOT_RAM_MIN_STINK. */
export const BOT_RAM_MAX_OWN_STINK = 15;
export const BOT_RAM_MIN_STINK = 30;
/** Honks at buses closer than this (tiles), at most once per this many seconds. */
export const BOT_HORN_RANGE = 5;
export const BOT_HORN_COOLDOWN_S = 6;
