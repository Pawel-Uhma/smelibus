import {
  CITY_BIKE_WIDTH, CITY_DIAGONAL_CHANCE, CITY_DROP_STREET_CHANCE, CITY_EMPTY_LOT_CHANCE, CITY_FLOOR_HEIGHT,
  CITY_GRID_JITTER, CITY_GRID_SPACING, CITY_GRID_TILT, CITY_MIN_POCKET, CITY_PALACE_SIDE, CITY_PARK_CHANCE,
  CITY_ROUNDABOUT_BIG_R, CITY_ROUNDABOUT_CHANCE, CITY_ROUNDABOUT_R, CITY_SLAB_FLOORS_HIGH, CITY_SLAB_FLOORS_LOW,
  CITY_SLAB_LENGTH_MAX, CITY_SLAB_LENGTH_MIN, CITY_SLAB_THICKNESS, CITY_STREETS, CITY_TENEMENT_DEPTH,
  CITY_TENEMENT_FLOORS_MAX, CITY_TENEMENT_FLOORS_MIN, CITY_TENEMENT_LOT_MAX, CITY_TENEMENT_LOT_MIN,
  CITY_TOWER_FLOORS_MAX, CITY_TOWER_FLOORS_MIN, CITY_TOWER_SIDE_MAX, CITY_TOWER_SIDE_MIN,
} from '../shared/config';
import type { BuildingStyle, CityBuilding, CityRoundabout, CityStreet, StreetKind, World } from '../shared/types';

// Facade colors per style (render/buildings.ts paints the facades from them).
const TENEMENT_COLORS = [0xe8c872, 0xd99a6c, 0xe9dcc0, 0xa9c2a0, 0xc98f8f, 0x9fb4c8, 0xd8b48a, 0xe3b9a0, 0xc7c19a];
const MDM_COLORS = [0xd9c7a3, 0xcdb894, 0xd4bf9a];
const BALCONY_COLORS = [0xe59a4c, 0x6fa3d1, 0x8fc16b, 0xe3c34f, 0xd9787a, 0x9f8fd1];
const GLASS_COLORS = [0x5b8fb9, 0x6fb3b0, 0x8aa0b3, 0x46698c];
const SIGN_COLORS = [0xd94a3a, 0x3a6fd9, 0x3a9d4f, 0xe0a82e];
const PALACE_COLOR = 0xd9c9a8;

/** Half width of a street's corridor on one side: 1 = along the normal (-dz, dx) of a→b, -1 = the other. */
export function streetHalfWidth(s: CityStreet, side: number): number {
  const p = CITY_STREETS[s.kind];
  return p.median + p.road + p.green + (s.bike === side ? CITY_BIKE_WIDTH : 0) + p.walk;
}

/** Sidewalk ring around a roundabout. */
export const ROUNDABOUT_WALK = CITY_STREETS.lane.walk;

/** Street graph junction; `round` > 0 = roundabout of that radius. */
export interface Node { x: number; z: number; edges: number[]; round: number }
export interface Edge { a: number; b: number; kind: StreetKind; bike: number; diagonal: boolean }

/** A street graph from outside the generator (card 014: OpenStreetMap), in tiles. */
export interface CityNetwork {
  nodes: Node[];
  edges: Edge[];
  /** Roundabouts at nodes (their `round` set); the random ones are not added. */
  roundabouts: CityRoundabout[];
  /** Where the Palace of Culture should stand, if on the map. */
  palace?: { x: number; z: number };
}

/**
 * Streets, blocks and buildings for `world` (all tiles start empty). A tilted, shaken grid of
 * junctions gives streets at many angles; one row and one column are avenues meeting at a big
 * roundabout, some streets are dropped (bigger blocks), some blocks get a diagonal. Blocks are
 * filled by district: offices and the Palace of Culture in the centre, tenements around it,
 * prefab estates and parks further out. Every drivable tile ends up connected.
 */
export function generateCity(world: World, rand: () => number, network?: CityNetwork): void {
  const { size, tiles } = world;
  const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];

  const { nodes, edges } = network ?? buildNetwork(size, rand);
  const roundabouts = network ? network.roundabouts : placeRoundabouts(nodes, edges, size, rand);
  const streets = edges.map((e): CityStreet => {
    const a = nodes[e.a], b = nodes[e.b];
    return { kind: e.kind, ax: a.x, az: a.z, bx: b.x, bz: b.z, bike: e.bike, trimA: 0, trimB: 0 };
  });
  edges.forEach((e, k) => {
    streets[k].trimA = trimAt(nodes, edges, streets, e.a, k);
    streets[k].trimB = trimAt(nodes, edges, streets, e.b, k);
  });

  // Street corridors become road tiles; remember the nearest street of each (-2 - i = roundabout i).
  const n = size * size;
  const roadOf = new Int32Array(n).fill(-1);
  const roadDist = new Float32Array(n).fill(Infinity);
  for (const t of tiles) t.kind = 'grass';
  streets.forEach((s, si) => {
    const len = Math.hypot(s.bx - s.ax, s.bz - s.az);
    const dx = (s.bx - s.ax) / len, dz = (s.bz - s.az) / len;
    const reach = Math.max(streetHalfWidth(s, 1), streetHalfWidth(s, -1));
    const [x0, x1] = [Math.min(s.ax, s.bx) - reach, Math.max(s.ax, s.bx) + reach];
    const [z0, z1] = [Math.min(s.az, s.bz) - reach, Math.max(s.az, s.bz) + reach];
    for (let z = Math.max(0, Math.floor(z0)); z < Math.min(size, Math.ceil(z1)); z++) {
      for (let x = Math.max(0, Math.floor(x0)); x < Math.min(size, Math.ceil(x1)); x++) {
        const px = x + 0.5 - s.ax, pz = z + 0.5 - s.az;
        const t = Math.max(0, Math.min(len, px * dx + pz * dz));
        const d = Math.hypot(px - dx * t, pz - dz * t);
        if (d > streetHalfWidth(s, -dz * px + dx * pz >= 0 ? 1 : -1)) continue;
        const idx = z * size + x;
        tiles[idx].kind = 'road';
        if (d < roadDist[idx]) { roadDist[idx] = d; roadOf[idx] = si; }
      }
    }
  });
  roundabouts.forEach((r, ri) => {
    const reach = r.r + ROUNDABOUT_WALK;
    for (let z = Math.max(0, Math.floor(r.z - reach)); z < Math.min(size, Math.ceil(r.z + reach)); z++) {
      for (let x = Math.max(0, Math.floor(r.x - reach)); x < Math.min(size, Math.ceil(r.x + reach)); x++) {
        const d = Math.hypot(x + 0.5 - r.x, z + 0.5 - r.z);
        if (d > reach) continue;
        const idx = z * size + x;
        tiles[idx].kind = 'road';
        if (d - r.r < roadDist[idx]) { roadDist[idx] = d - r.r; roadOf[idx] = -2 - ri; }
      }
    }
  });

  // Blocks: 4-connected pieces of land between the streets.
  const blockOf = new Int32Array(n).fill(-1);
  const blocks: number[][] = [];
  for (let start = 0; start < n; start++) {
    if (tiles[start].kind === 'road' || blockOf[start] >= 0) continue;
    const id = blocks.length;
    const list = [start];
    blockOf[start] = id;
    for (let q = 0; q < list.length; q++) {
      const idx = list[q];
      for (const nb of neighbours4(idx, size)) {
        if (tiles[nb].kind !== 'road' && blockOf[nb] < 0) { blockOf[nb] = id; list.push(nb); }
      }
    }
    blocks.push(list);
  }

  // Depth into the block from the street (1 = touching it, 8-connected steps) and that street.
  const depth = new Int32Array(n).fill(0);
  const srcStreet = new Int32Array(n).fill(-1);
  const queue: number[] = [];
  for (let idx = 0; idx < n; idx++) {
    if (blockOf[idx] < 0) continue;
    let best = -1, bestD = Infinity;
    for (const nb of neighbours4(idx, size)) {
      if (tiles[nb].kind === 'road' && roadDist[nb] < bestD) { bestD = roadDist[nb]; best = roadOf[nb]; }
    }
    if (best === -1) continue;
    depth[idx] = 1;
    srcStreet[idx] = best;
    queue.push(idx);
  }
  for (let q = 0; q < queue.length; q++) {
    const idx = queue[q];
    for (const nb of neighbours8(idx, size)) {
      if (blockOf[nb] !== blockOf[idx] || depth[nb] > 0) continue;
      depth[nb] = depth[idx] + 1;
      srcStreet[nb] = srcStreet[idx];
      queue.push(nb);
    }
  }

  const buildings: CityBuilding[] = [];
  const addBuilding = (style: BuildingStyle, floors: number, color: number) =>
    buildings.push({ style, floors, color }) - 1;
  const put = (idx: number, b: number) => {
    tiles[idx].kind = 'building';
    tiles[idx].building = b;
  };
  const inBlock = (x: number, z: number, block: number) =>
    x >= 0 && z >= 0 && x < size && z < size && blockOf[z * size + x] === block;

  /** Can a w × h rectangle at (x0, z0) stand in `block`, at least `minDepth` from the street and
   *  `gap` tiles from other buildings? */
  const fits = (block: number, x0: number, z0: number, w: number, h: number, minDepth: number, gap: number) => {
    for (let z = z0; z < z0 + h; z++) {
      for (let x = x0; x < x0 + w; x++) {
        if (!inBlock(x, z, block) || depth[z * size + x] < minDepth) return false;
      }
    }
    for (let z = Math.max(0, z0 - gap); z < Math.min(size, z0 + h + gap); z++) {
      for (let x = Math.max(0, x0 - gap); x < Math.min(size, x0 + w + gap); x++) {
        if (tiles[z * size + x].kind === 'building') return false;
      }
    }
    return true;
  };
  const putRect = (x0: number, z0: number, w: number, h: number, b: number) => {
    for (let z = z0; z < z0 + h; z++) for (let x = x0; x < x0 + w; x++) put(z * size + x, b);
  };
  const bbox = (list: number[]) => {
    let x0 = size, z0 = size, x1 = 0, z1 = 0;
    for (const idx of list) {
      const x = idx % size, z = Math.floor(idx / size);
      x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x + 1); z1 = Math.max(z1, z + 1);
    }
    return { x0, z0, x1, z1 };
  };

  /** Buildings along the street edge of the block, one per lot, courtyard left inside. */
  const fillFrontage = (block: number, style: 'tenement' | 'mdm') => {
    const deep = CITY_TENEMENT_DEPTH + (style === 'mdm' ? 1 : int(0, 1));
    const lotWidth = new Map<number, number>();
    const lots = new Map<string, number>();
    for (const idx of blocks[block]) {
      if (depth[idx] === 0 || depth[idx] > deep) continue;
      const si = srcStreet[idx];
      const px = (idx % size) + 0.5, pz = Math.floor(idx / size) + 0.5;
      let along: number;
      if (si >= 0) {
        const s = streets[si];
        const len = Math.hypot(s.bx - s.ax, s.bz - s.az);
        along = ((px - s.ax) * (s.bx - s.ax) + (pz - s.az) * (s.bz - s.az)) / len;
      } else {
        const r = roundabouts[-2 - si];
        along = Math.atan2(pz - r.z, px - r.x) * (r.r + 4);
      }
      if (!lotWidth.has(si)) lotWidth.set(si, style === 'mdm' ? 1e6 : int(CITY_TENEMENT_LOT_MIN, CITY_TENEMENT_LOT_MAX));
      const key = `${si}:${Math.floor(along / lotWidth.get(si)!)}`;
      let b = lots.get(key);
      if (b === undefined) {
        if (style === 'tenement' && rand() < CITY_EMPTY_LOT_CHANCE) b = -1;
        else if (style === 'mdm') b = addBuilding('mdm', int(6, 7), pick(MDM_COLORS));
        else b = addBuilding('tenement', int(CITY_TENEMENT_FLOORS_MIN, CITY_TENEMENT_FLOORS_MAX), pick(TENEMENT_COLORS));
        lots.set(key, b);
      }
      if (b >= 0) put(idx, b);
    }
  };

  /** Paved square up to `ring` tiles around the block's buildings; the rest of the block is `rest`. */
  const pave = (block: number, ring: number, rest: 'grass' | 'park') => {
    for (const idx of blocks[block]) {
      if (tiles[idx].kind === 'building') continue;
      const x = idx % size, z = Math.floor(idx / size);
      let near = false;
      for (let dz = -ring; dz <= ring && !near; dz++) {
        for (let dx = -ring; dx <= ring && !near; dx++) {
          near = inBlock(x + dx, z + dz, block) && tiles[(z + dz) * size + x + dx].kind === 'building';
        }
      }
      tiles[idx].kind = near ? 'road' : rest;
    }
  };

  /** Glass towers standing free on a paved square. False if none fits. */
  const fillOffices = (block: number) => {
    const box = bbox(blocks[block]);
    const want = int(1, 3);
    let placed = 0;
    for (let tries = 0; tries < 80 && placed < want; tries++) {
      const w = int(CITY_TOWER_SIDE_MIN, CITY_TOWER_SIDE_MAX), h = int(CITY_TOWER_SIDE_MIN, CITY_TOWER_SIDE_MAX);
      const x0 = int(box.x0, box.x1 - w), z0 = int(box.z0, box.z1 - h);
      if (!fits(block, x0, z0, w, h, 3, 3)) continue;
      putRect(x0, z0, w, h, addBuilding('office', int(CITY_TOWER_FLOORS_MIN, CITY_TOWER_FLOORS_MAX), pick(GLASS_COLORS)));
      placed++;
    }
    if (placed) pave(block, 3, 'grass');
    return placed > 0;
  };

  /** Prefab housing estate: rows of slabs and a few point towers on the grass, a shop pavilion by the street. */
  const fillEstate = (block: number) => {
    const box = bbox(blocks[block]);
    const first = rand() < 0.5;
    // Rows one way, then the other way into whatever room is left.
    for (const alongX of [first, !first]) {
      const [u0, u1, v0, v1] = alongX ? [box.x0, box.x1, box.z0, box.z1] : [box.z0, box.z1, box.x0, box.x1];
      for (let v = v0 + int(2, 4); v + CITY_SLAB_THICKNESS <= v1; v += CITY_SLAB_THICKNESS + int(5, 7)) {
        for (let u = u0 + int(1, 4); u < u1;) {
          const tower = rand() < 0.15;
          const floors = tower ? int(10, 12) : rand() < 0.55 ? CITY_SLAB_FLOORS_LOW : CITY_SLAB_FLOORS_HIGH;
          const color = pick(BALCONY_COLORS);
          const thick = tower ? 5 : CITY_SLAB_THICKNESS;
          const shortest = tower ? 5 : CITY_SLAB_LENGTH_MIN;
          let len = tower ? 5 : int(CITY_SLAB_LENGTH_MIN, CITY_SLAB_LENGTH_MAX);
          const place = () => {
            const [x0, z0, w, h] = alongX ? [u, v, len, thick] : [v, u, thick, len];
            if (!fits(block, x0, z0, w, h, 2, 4)) return false;
            putRect(x0, z0, w, h, addBuilding('block', floors, color));
            return true;
          };
          while (len >= shortest && !place()) len -= 2;
          u += len >= shortest ? len + int(3, 6) : 1;
        }
      }
    }
    const color = pick(SIGN_COLORS);
    for (let tries = 0; tries < 60; tries++) {
      const [w, h] = rand() < 0.5 ? [6, 4] : [4, 6];
      const x0 = int(box.x0, box.x1 - w), z0 = int(box.z0, box.z1 - h);
      if (!fits(block, x0, z0, w, h, 2, 2)) continue;
      putRect(x0, z0, w, h, addBuilding('pavilion', 1, color));
      break;
    }
  };

  const fillPark = (block: number) => {
    for (const idx of blocks[block]) tiles[idx].kind = 'park';
  };

  /** The Palace of Culture on a paved square, as close to the block's middle as it fits. */
  const fillPalace = (block: number, target?: { x: number; z: number }) => {
    const list = blocks[block];
    const F = CITY_PALACE_SIDE;
    let cx = 0, cz = 0;
    for (const idx of list) { cx += idx % size; cz += Math.floor(idx / size); }
    cx = (target ? target.x - 0.5 : cx / list.length) - F / 2 + 0.5;
    cz = (target ? target.z - 0.5 : cz / list.length) - F / 2 + 0.5;
    const box = bbox(list);
    let best: [number, number] | null = null, bestD = Infinity;
    for (let z0 = box.z0; z0 <= box.z1 - F; z0++) {
      for (let x0 = box.x0; x0 <= box.x1 - F; x0++) {
        const d = (x0 - cx) ** 2 + (z0 - cz) ** 2;
        if (d < bestD && fits(block, x0, z0, F, F, 2, 0)) { bestD = d; best = [x0, z0]; }
      }
    }
    if (!best) return false;
    putRect(best[0], best[1], F, F, addBuilding('palace', 22, PALACE_COLOR));
    pave(block, 3, 'park');
    return true;
  };

  // The block nearest the centre that is big enough gets the palace; the rest by district.
  const center = size / 2;
  const info = blocks.map((list, id) => {
    let cx = 0, cz = 0;
    for (const idx of list) { cx += (idx % size) + 0.5; cz += Math.floor(idx / size) + 0.5; }
    return { id, r: Math.hypot(cx / list.length - center, cz / list.length - center) / center };
  });
  const byCenter = [...info].sort((a, b) => a.r - b.r || a.id - b.id);
  let palace = -1;
  const at = network?.palace;
  if (at && at.x >= 0 && at.z >= 0 && at.x < size && at.z < size) {
    const id = blockOf[Math.floor(at.z) * size + Math.floor(at.x)];
    if (id >= 0 && fillPalace(id, at)) palace = id;
  }
  for (const b of palace >= 0 ? [] : byCenter) {
    if (b.r > 0.5) break;
    if (blocks[b.id].length >= (CITY_PALACE_SIDE + 4) ** 2 && fillPalace(b.id)) { palace = b.id; break; }
  }
  for (const { id, r } of info) {
    if (id === palace) continue;
    const area = blocks[id].length;
    const roll = rand();
    if (area < 60) { if (roll < 0.6) fillPark(id); else fillFrontage(id, 'tenement'); continue; }
    if (rand() < CITY_PARK_CHANCE) { fillPark(id); continue; }
    if (r < 0.4) {
      if (roll < 0.5 && fillOffices(id)) continue;
      fillFrontage(id, roll < 0.75 ? 'mdm' : 'tenement');
    } else if (r < 0.85) {
      if (roll < 0.3) fillEstate(id);
      else fillFrontage(id, roll < 0.4 ? 'mdm' : 'tenement');
    } else if (roll < 0.6) fillEstate(id);
    else fillFrontage(id, 'tenement');
  }

  connectAll(world);
  for (const t of tiles) {
    if (t.kind === 'building') t.height = buildings[t.building!].floors * CITY_FLOOR_HEIGHT;
    else { delete t.building; delete t.height; }
  }
  world.streets = streets;
  world.roundabouts = roundabouts;
  world.buildings = buildings;
}

function neighbours4(idx: number, size: number): number[] {
  const x = idx % size, z = Math.floor(idx / size);
  const out: number[] = [];
  if (x > 0) out.push(idx - 1);
  if (x < size - 1) out.push(idx + 1);
  if (z > 0) out.push(idx - size);
  if (z < size - 1) out.push(idx + size);
  return out;
}

function neighbours8(idx: number, size: number): number[] {
  const x = idx % size, z = Math.floor(idx / size);
  const out: number[] = [];
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      if ((dx || dz) && x + dx >= 0 && z + dz >= 0 && x + dx < size && z + dz < size) out.push(idx + dz * size + dx);
    }
  }
  return out;
}

/** Does the segment pass within `pad` of the map square? (Cohen–Sutherland style reject, then sampling.) */
export function touchesMap(ax: number, az: number, bx: number, bz: number, size: number, pad: number): boolean {
  const lo = -pad, hi = size + pad;
  if (Math.max(ax, bx) < lo || Math.min(ax, bx) > hi || Math.max(az, bz) < lo || Math.min(az, bz) > hi) return false;
  for (let k = 0; k <= 32; k++) {
    const x = ax + ((bx - ax) * k) / 32, z = az + ((bz - az) * k) / 32;
    if (x >= lo && x <= hi && z >= lo && z <= hi) return true;
  }
  return false;
}

function buildNetwork(size: number, rand: () => number): { nodes: Node[]; edges: Edge[] } {
  const L = CITY_GRID_SPACING;
  const c = size / 2;
  const tilt = (rand() * 2 - 1) * CITY_GRID_TILT;
  const cos = Math.cos(tilt), sin = Math.sin(tilt);
  const k = Math.ceil((size * 0.75) / L) + 1;
  const phase = () => (rand() - 0.5) * L * 0.4;
  const [phx, phz] = [phase(), phase()];
  const side = 2 * k + 1;
  const nodes: Node[] = [];
  for (let j = -k; j <= k; j++) {
    for (let i = -k; i <= k; i++) {
      // The centre junction stays put, so the avenues cross near the middle of the map.
      const jit = i === 0 && j === 0 ? 0 : CITY_GRID_JITTER * L;
      const gx = i * L + phx + (rand() * 2 - 1) * jit;
      const gz = j * L + phz + (rand() * 2 - 1) * jit;
      nodes.push({ x: c + gx * cos - gz * sin, z: c + gx * sin + gz * cos, edges: [], round: 0 });
    }
  }
  const id = (i: number, j: number) => (j + k) * side + (i + k);
  const avenueRow = rand() < 0.85;
  const avenueCol = rand() < 0.85 || !avenueRow;
  const all: Edge[] = [];
  const streetKind = (): StreetKind => (rand() < 0.45 ? 'street' : 'lane');
  const bikeSide = (kind: StreetKind) =>
    kind === 'avenue' ? (rand() < 0.5 ? 1 : -1) : kind === 'street' && rand() < 0.5 ? (rand() < 0.5 ? 1 : -1) : 0;
  const add = (a: number, b: number, kind: StreetKind, diagonal = false) => {
    const na = nodes[a], nb = nodes[b];
    if (!touchesMap(na.x, na.z, nb.x, nb.z, size, 2)) return;
    all.push({ a, b, kind, bike: bikeSide(kind), diagonal });
  };
  for (let j = -k; j <= k; j++) {
    for (let i = -k; i <= k; i++) {
      if (i < k) add(id(i, j), id(i + 1, j), avenueRow && j === 0 ? 'avenue' : streetKind());
      if (j < k) add(id(i, j), id(i, j + 1), avenueCol && i === 0 ? 'avenue' : streetKind());
      if (i < k && j < k && rand() < CITY_DIAGONAL_CHANCE) {
        if (rand() < 0.5) add(id(i, j), id(i + 1, j + 1), 'lane', true);
        else add(id(i + 1, j), id(i, j + 1), 'lane', true);
      }
    }
  }
  // Drop some plain streets, never leaving a junction with fewer than two.
  const degree = new Map<number, number>();
  for (const e of all) for (const v of [e.a, e.b]) degree.set(v, (degree.get(v) ?? 0) + 1);
  const keep = all.map(() => true);
  const order = all.map((_, idx) => idx);
  for (let idx = order.length - 1; idx > 0; idx--) {
    const r = Math.floor(rand() * (idx + 1));
    [order[idx], order[r]] = [order[r], order[idx]];
  }
  for (const idx of order) {
    const e = all[idx];
    if (e.kind === 'avenue' || e.diagonal || rand() >= CITY_DROP_STREET_CHANCE) continue;
    if (degree.get(e.a)! < 3 || degree.get(e.b)! < 3) continue;
    keep[idx] = false;
    degree.set(e.a, degree.get(e.a)! - 1);
    degree.set(e.b, degree.get(e.b)! - 1);
  }
  const edges = all.filter((_, idx) => keep[idx]);
  edges.forEach((e, idx) => { nodes[e.a].edges.push(idx); nodes[e.b].edges.push(idx); });
  return { nodes, edges };
}

function placeRoundabouts(nodes: Node[], edges: Edge[], size: number, rand: () => number): CityRoundabout[] {
  const out: CityRoundabout[] = [];
  const candidates = nodes
    .map((nd, idx) => ({ nd, idx, avenues: nd.edges.filter((e) => edges[e].kind === 'avenue').length }))
    .filter(({ nd }) => nd.edges.length >= 4)
    .sort((a, b) => b.avenues - a.avenues || a.idx - b.idx);
  for (const { nd, idx, avenues } of candidates) {
    const big = avenues >= 3;
    if (!big && rand() >= CITY_ROUNDABOUT_CHANCE) continue;
    const r = big ? CITY_ROUNDABOUT_BIG_R : CITY_ROUNDABOUT_R;
    const reach = r + ROUNDABOUT_WALK + 2;
    if (nd.x < reach || nd.z < reach || nd.x > size - reach || nd.z > size - reach) continue;
    if (out.some((o) => Math.hypot(o.x - nd.x, o.z - nd.z) < CITY_GRID_SPACING * 1.4)) continue;
    // Every street must leave the ring with room to spare, or the island would cut a short one off.
    if (nd.edges.some((e) => {
      const o = nodes[edges[e].a === idx ? edges[e].b : edges[e].a];
      return Math.hypot(o.x - nd.x, o.z - nd.z) < r * 2.5;
    })) continue;
    nd.round = r;
    out.push({ x: nd.x, z: nd.z, r });
  }
  return out;
}

/** How long a piece of street `k` at junction `v` lies inside the other streets meeting there. */
function trimAt(nodes: Node[], edges: Edge[], streets: CityStreet[], v: number, k: number): number {
  const nd = nodes[v];
  if (nd.round) return nd.round + ROUNDABOUT_WALK;
  const dir = (e: number) => {
    const s = streets[e];
    const [dx, dz] = edges[e].a === v ? [s.bx - s.ax, s.bz - s.az] : [s.ax - s.bx, s.az - s.bz];
    const len = Math.hypot(dx, dz);
    return { x: dx / len, z: dz / len, len };
  };
  const u = dir(k);
  let trim = 0;
  for (const e of nd.edges) {
    if (e === k) continue;
    const w = dir(e);
    const dot = u.x * w.x + u.z * w.z;
    if (dot < -0.9) continue; // the same street going on
    const sinA = Math.max(0.35, Math.abs(u.x * w.z - u.z * w.x));
    const half = Math.max(streetHalfWidth(streets[e], 1), streetHalfWidth(streets[e], -1));
    trim = Math.max(trim, half / sinA + 0.5);
  }
  return Math.min(trim, u.len * 0.45);
}

/**
 * Makes every drivable tile reachable: pockets smaller than CITY_MIN_POCKET are built over, bigger
 * ones (courtyards) get a 3-tile gateway through the buildings to the nearest other open area.
 */
function connectAll(world: World): void {
  const { size, tiles } = world;
  const n = size * size;
  for (let round = 0; round < 400; round++) {
    const label = new Int32Array(n).fill(-1);
    const comps: number[][] = [];
    for (let s = 0; s < n; s++) {
      if (tiles[s].kind === 'building' || label[s] >= 0) continue;
      const list = [s];
      label[s] = comps.length;
      for (let q = 0; q < list.length; q++) {
        for (const nb of neighbours4(list[q], size)) {
          if (tiles[nb].kind !== 'building' && label[nb] < 0) { label[nb] = comps.length; list.push(nb); }
        }
      }
      comps.push(list);
    }
    if (comps.length <= 1) return;
    let main = 0;
    comps.forEach((c, i) => { if (c.length > comps[main].length) main = i; });
    const small = comps.filter((c, i) => i !== main && c.length < CITY_MIN_POCKET);
    if (small.length) {
      for (const c of small) {
        for (const idx of c) {
          const b = neighbours4(idx, size).find((nb) => tiles[nb].kind === 'building');
          if (b === undefined) continue;
          tiles[idx].kind = 'building';
          tiles[idx].building = tiles[b].building;
        }
      }
      continue;
    }
    // Carve from the first stray pocket to the nearest open tile of any other piece.
    const from = comps.findIndex((_, i) => i !== main);
    const parent = new Int32Array(n).fill(-2);
    const queue = comps[from].slice();
    for (const idx of queue) parent[idx] = -1;
    let hit = -1;
    for (let q = 0; q < queue.length && hit < 0; q++) {
      for (const nb of neighbours4(queue[q], size)) {
        if (parent[nb] !== -2) continue;
        parent[nb] = queue[q];
        if (tiles[nb].kind !== 'building' && label[nb] !== from) { hit = nb; break; }
        queue.push(nb);
      }
    }
    if (hit < 0) return;
    for (let cur = parent[hit]; cur >= 0 && parent[cur] !== -1; cur = parent[cur]) {
      const prev = parent[cur];
      const step = Math.abs(cur - prev) === 1 ? size : 1; // across the walking direction
      for (const idx of [cur, cur - step, cur + step]) {
        if (idx < 0 || idx >= n || (step === 1 && Math.floor(idx / size) !== Math.floor(cur / size))) continue;
        if (tiles[idx].kind === 'building') tiles[idx].kind = 'road';
      }
    }
  }
}
