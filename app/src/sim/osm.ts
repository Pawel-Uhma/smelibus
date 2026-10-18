import { OSM_WARSZAWA } from '../data/osmWarszawa';
import {
  CITY_ROUNDABOUT_R, OSM_METERS_PER_TILE, OSM_ROUNDABOUT_R_MAX, OSM_STOP_SNAP, OSM_STREET_KINDS,
} from '../shared/config';
import type { CityRoundabout, StreetKind, World } from '../shared/types';
import { touchesMap, type CityNetwork, type Edge, type Node } from './city';

/** Street graph and stops of an OSM extract (see scripts/osm-extract.mjs), metres from its centre. */
export interface OsmExtract {
  attribution: string;
  classes: string[];
  nodes: number[];
  edges: number[];
  roundabouts: number[];
  stops: number[];
  palace: { x: number; z: number };
}

/** Attribution the ODbL licence asks for wherever the OSM map is shown. */
export const OSM_ATTRIBUTION = OSM_WARSZAWA.attribution;

/** Metres from the extract centre → map tiles, the centre in the middle of the map. */
const toTile = (size: number, m: number) => size / 2 + m / OSM_METERS_PER_TILE;

/**
 * The extract as a street graph for sim/city.ts, cropped to a `size` map. Bike paths are rolled
 * with `rand` like in the random city (OSM cycleways are not read yet).
 */
export function osmNetwork(size: number, rand: () => number, data: OsmExtract = OSM_WARSZAWA): CityNetwork {
  const all: Node[] = [];
  for (let i = 0; i < data.nodes.length; i += 2) {
    all.push({ x: toTile(size, data.nodes[i]), z: toTile(size, data.nodes[i + 1]), edges: [], round: 0 });
  }
  const kept: Edge[] = [];
  for (let i = 0; i < data.edges.length; i += 4) {
    const [a, b, cls, oneway] = data.edges.slice(i, i + 4);
    const na = all[a], nb = all[b];
    if (!touchesMap(na.x, na.z, nb.x, nb.z, size, 2)) continue;
    const kinds = OSM_STREET_KINDS[data.classes[cls]] ?? ['lane', 'lane'];
    const kind: StreetKind = kinds[oneway === 1 ? 0 : 1];
    const bike = kind === 'avenue' ? (rand() < 0.5 ? 1 : -1) : kind === 'street' && rand() < 0.5 ? (rand() < 0.5 ? 1 : -1) : 0;
    kept.push({ a, b, kind, bike, diagonal: false });
  }
  // Renumber to the nodes the cropped streets use.
  const renum = new Map<number, number>();
  const nodes: Node[] = [];
  const id = (old: number) => {
    if (!renum.has(old)) { renum.set(old, nodes.length); nodes.push(all[old]); }
    return renum.get(old)!;
  };
  const edges = kept.map((e) => ({ ...e, a: id(e.a), b: id(e.b) }));
  edges.forEach((e, k) => { nodes[e.a].edges.push(k); nodes[e.b].edges.push(k); });

  const roundabouts: CityRoundabout[] = [];
  for (let i = 0; i < data.roundabouts.length; i += 2) {
    const n = renum.get(data.roundabouts[i]);
    if (n === undefined) continue;
    const nd = nodes[n];
    const r = Math.max(CITY_ROUNDABOUT_R, Math.min(OSM_ROUNDABOUT_R_MAX, data.roundabouts[i + 1] / OSM_METERS_PER_TILE));
    nd.round = r;
    roundabouts.push({ x: nd.x, z: nd.z, r });
  }
  const palace = { x: toTile(size, data.palace.x), z: toTile(size, data.palace.z) };
  return { nodes, edges, roundabouts, palace };
}

/** Real bus stops of the extract that land on the map, each snapped to the nearest road tile. */
export function osmStops(world: World, data: OsmExtract = OSM_WARSZAWA): { x: number; z: number }[] {
  const { size, tiles } = world;
  const out: { x: number; z: number }[] = [];
  for (let i = 0; i < data.stops.length; i += 2) {
    const sx = toTile(size, data.stops[i]), sz = toTile(size, data.stops[i + 1]);
    if (sx < 0 || sz < 0 || sx >= size || sz >= size) continue;
    let best: { x: number; z: number } | null = null, bestD = OSM_STOP_SNAP ** 2;
    for (let z = Math.max(0, Math.floor(sz - OSM_STOP_SNAP)); z < Math.min(size, Math.ceil(sz + OSM_STOP_SNAP)); z++) {
      for (let x = Math.max(0, Math.floor(sx - OSM_STOP_SNAP)); x < Math.min(size, Math.ceil(sx + OSM_STOP_SNAP)); x++) {
        if (tiles[z * size + x].kind !== 'road') continue;
        const d = (x + 0.5 - sx) ** 2 + (z + 0.5 - sz) ** 2;
        if (d < bestD) { bestD = d; best = { x: x + 0.5, z: z + 0.5 }; }
      }
    }
    if (best) out.push(best);
  }
  return out;
}
