#!/usr/bin/env node
// Fetches a small OpenStreetMap extract of central Warsaw from the Overpass API and writes the
// street graph the city generator reads (src/data/osmWarszawa.ts, card 014).
//
//   node scripts/osm-extract.mjs [raw.json]   (run in app/, needs network unless raw.json exists)
//
// Output is plain numbers in metres relative to CENTER (x east, z south), so the game can scale
// it to tiles with OSM_METERS_PER_TILE without fetching again. Data © OpenStreetMap contributors, ODbL.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Marszałkowska by Aleje Jerozolimskie: Rondo Dmowskiego east, the Palace of Culture west. */
const CENTER = { lat: 52.2297, lon: 21.01 };
/** Half the side of the square extract, metres (the 8-player map is ~114 tiles × 5 m, plus a margin). */
const HALF = 340;
/** The Palace of Culture and Science, placed by the generator as the landmark. */
const PALACE = { lat: 52.2318, lon: 21.0062 };
/** Polyline simplification tolerance and junction merge distance, metres. */
const SIMPLIFY_M = 3;
const MERGE_M = 6;
/** Two one-way carriageways of the same street closer than this are drawn as one avenue, metres. */
const PAIR_M = 36;
const CLASSES = ['primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street'];
const OUT = join(dirname(fileURLToPath(import.meta.url)), '../src/data/osmWarszawa.ts');

const M_PER_LAT = 111_320;
const M_PER_LON = M_PER_LAT * Math.cos((CENTER.lat * Math.PI) / 180);
const toXZ = ({ lat, lon }) => [(lon - CENTER.lon) * M_PER_LON, -(lat - CENTER.lat) * M_PER_LAT];

const bbox = [
  CENTER.lat - HALF / M_PER_LAT, CENTER.lon - HALF / M_PER_LON,
  CENTER.lat + HALF / M_PER_LAT, CENTER.lon + HALF / M_PER_LON,
].map((v) => v.toFixed(5)).join(',');
const query = `[out:json][timeout:60];
way["highway"~"^(${CLASSES.join('|')}|trunk)(_link)?$"](${bbox})->.w;
.w out body;
.w >;
out skel qt;
(node["highway"="bus_stop"](${bbox});node["public_transport"="platform"]["bus"="yes"](${bbox}););
out body qt;`;

/** Overpass with a mirror and a few retries (the public servers often answer 429/502). */
async function overpass() {
  const servers = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(servers[attempt % servers.length], {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'smelibus-osm-extract/1.0' },
      body: 'data=' + encodeURIComponent(query),
    }).catch((err) => ({ ok: false, status: String(err) }));
    if (res.ok) return res.json();
    console.warn(`Overpass: ${res.status}, retrying`);
    await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
  }
  throw new Error('Overpass unreachable');
}
// Optional argument: a raw Overpass JSON file, read if it exists, written after a fetch otherwise
// (lets you tune the conversion without hitting the API again).
const rawPath = process.argv[2];
const data = rawPath && existsSync(rawPath) ? JSON.parse(readFileSync(rawPath, 'utf8')) : await overpass();
if (rawPath && !existsSync(rawPath)) writeFileSync(rawPath, JSON.stringify(data));

const pos = new Map();
const stopsRaw = [];
const ways = [];
for (const e of data.elements) {
  if (e.type === 'node') {
    pos.set(e.id, toXZ(e));
    if (e.tags && (e.tags.highway === 'bus_stop' || e.tags.public_transport === 'platform')) stopsRaw.push(toXZ(e));
  } else if (e.type === 'way') ways.push(e);
}

// Junctions: OSM nodes used by more than one way, plus way ends. They survive simplification.
const uses = new Map();
for (const w of ways) for (const id of w.nodes) uses.set(id, (uses.get(id) ?? 0) + 1);
const isJunction = (w, k) => k === 0 || k === w.nodes.length - 1 || uses.get(w.nodes[k]) > 1;

/** Douglas–Peucker on indices lo..hi of `pts`, keeping `keep` marks. */
function simplify(pts, keep, lo, hi) {
  let worst = -1, worstD = SIMPLIFY_M;
  const [ax, az] = pts[lo], [bx, bz] = pts[hi];
  const len = Math.hypot(bx - ax, bz - az) || 1;
  for (let k = lo + 1; k < hi; k++) {
    const d = Math.abs((bx - ax) * (az - pts[k][1]) - (ax - pts[k][0]) * (bz - az)) / len;
    if (d > worstD) { worstD = d; worst = k; }
  }
  if (worst < 0) return;
  keep[worst] = true;
  simplify(pts, keep, lo, worst);
  simplify(pts, keep, worst, hi);
}

// Union–find over OSM node ids, so nearby junctions (crossing carriageways) become one node.
const parent = new Map();
const find = (a) => {
  while (parent.get(a) !== a) { parent.set(a, parent.get(parent.get(a))); a = parent.get(a); }
  return a;
};
const union = (a, b) => { parent.set(find(a), find(b)); };

// Roundabouts: every ring way's nodes collapse into one centre node with a radius.
const ringWays = ways.filter((w) => w.tags.junction === 'roundabout' || w.tags.junction === 'circular');
const ringNode = new Set(ringWays.flatMap((w) => w.nodes));
for (const id of ringNode) parent.set(id, id);
for (const w of ringWays) for (let k = 1; k < w.nodes.length; k++) union(w.nodes[0], w.nodes[k]);

const segments = [];
/** Nodes on named one-way carriageways: way, street name and the way's direction. */
const carriage = new Map();
for (const w of ways) {
  if (ringWays.includes(w)) continue;
  const base = w.tags.highway.replace(/_link$/, '');
  const cls = Math.max(0, CLASSES.indexOf(base === 'trunk' ? 'primary' : base));
  const oneway = w.tags.oneway === 'yes' || w.tags.oneway === '1' || w.tags.oneway === '-1' ? 1 : 0;
  const pts = w.nodes.map((id) => pos.get(id));
  if (pts.some((p) => !p)) continue;
  const keep = w.nodes.map((_, k) => isJunction(w, k));
  let last = 0;
  for (let k = 1; k < pts.length; k++) if (keep[k]) { simplify(pts, keep, last, k); last = k; }
  const ids = w.nodes.filter((_, k) => keep[k]);
  for (const id of ids) if (!parent.has(id)) parent.set(id, id);
  if (oneway && w.tags.name && cls <= 2) {
    const [ax, az] = pts[0], [bx, bz] = pts[pts.length - 1];
    const len = Math.hypot(bx - ax, bz - az) || 1;
    for (const id of ids) {
      if (ringNode.has(id)) continue;
      if (!carriage.has(id)) carriage.set(id, []);
      carriage.get(id).push({ way: w.id, name: w.tags.name, dx: (bx - ax) / len, dz: (bz - az) / len });
    }
  }
  for (let k = 1; k < ids.length; k++) segments.push([ids[k - 1], ids[k], cls, oneway]);
}
// Dual carriageways: a node on one carriageway joins the nearest node of the opposite one.
const onCarriage = [...carriage.keys()];
for (const u of onCarriage) {
  let best = null, bestD = PAIR_M;
  for (const v of onCarriage) {
    const d = Math.hypot(pos.get(u)[0] - pos.get(v)[0], pos.get(u)[1] - pos.get(v)[1]);
    if (u === v || d >= bestD) continue;
    const opposite = carriage.get(u).some((a) => carriage.get(v).some((b) =>
      a.way !== b.way && a.name === b.name && a.dx * b.dx + a.dz * b.dz < -0.7));
    if (opposite) { best = v; bestD = d; }
  }
  if (best !== null) union(u, best);
}

// Merge kept nodes closer than MERGE_M (never two ring clusters into each other by accident).
const kept = [...parent.keys()];
for (let i = 0; i < kept.length; i++) {
  for (let j = i + 1; j < kept.length; j++) {
    const [ax, az] = pos.get(kept[i]), [bx, bz] = pos.get(kept[j]);
    if (Math.hypot(ax - bx, az - bz) < MERGE_M && !(ringNode.has(kept[i]) && ringNode.has(kept[j]))) union(kept[i], kept[j]);
  }
}

// Cluster positions: mean of members; ring clusters also get a radius.
const members = new Map();
for (const id of kept) {
  const r = find(id);
  if (!members.has(r)) members.set(r, []);
  members.get(r).push(id);
}
const index = new Map();
const nodes = [];
const roundabouts = [];
for (const [root, ids] of members) {
  const ring = ids.filter((id) => ringNode.has(id));
  const src = ring.length ? ring : ids;
  const x = src.reduce((s, id) => s + pos.get(id)[0], 0) / src.length;
  const z = src.reduce((s, id) => s + pos.get(id)[1], 0) / src.length;
  index.set(root, nodes.length);
  if (ring.length) {
    const r = ring.reduce((s, id) => s + Math.hypot(pos.get(id)[0] - x, pos.get(id)[1] - z), 0) / ring.length;
    roundabouts.push([nodes.length, Math.round(r)]);
  }
  nodes.push([Math.round(x), Math.round(z)]);
}

// Edges between clusters; parallel duplicates (two carriageways of one street) become one two-way edge.
const edgeMap = new Map();
for (const [a, b, cls, oneway] of segments) {
  const ia = index.get(find(a)), ib = index.get(find(b));
  if (ia === ib) continue;
  const key = ia < ib ? `${ia},${ib}` : `${ib},${ia}`;
  const prev = edgeMap.get(key);
  if (!prev) edgeMap.set(key, [Math.min(ia, ib), Math.max(ia, ib), cls, oneway]);
  else { prev[2] = Math.min(prev[2], cls); prev[3] = prev[3] && oneway ? 2 : 0; }
}

// Drop nodes no edge uses (renumber).
const used = new Set([...edgeMap.values()].flatMap(([a, b]) => [a, b]));
const renum = new Map();
const outNodes = [];
nodes.forEach((p, i) => { if (used.has(i)) { renum.set(i, outNodes.length); outNodes.push(p); } });
const outEdges = [...edgeMap.values()].map(([a, b, cls, oneway]) => [renum.get(a), renum.get(b), cls, oneway]);
const outRound = roundabouts.filter(([i]) => used.has(i)).map(([i, r]) => [renum.get(i), r]);
const stops = stopsRaw.map(([x, z]) => [Math.round(x), Math.round(z)])
  .filter(([x, z], i, all) => all.findIndex(([x2, z2]) => Math.hypot(x - x2, z - z2) < 15) === i);
const palace = toXZ(PALACE).map(Math.round);

const flat = (rows) => rows.flat().join(',');
const ts = `// Generated by scripts/osm-extract.mjs from OpenStreetMap (Overpass API), ${data.osm3s.timestamp_osm_base}.
// Data © OpenStreetMap contributors, ODbL 1.0 (https://www.openstreetmap.org/copyright). Do not edit by hand.

/** Central Warsaw street graph in metres from the centre (x east, z south), flat arrays. */
export const OSM_WARSZAWA = {
  attribution: '© OpenStreetMap contributors',
  center: { lat: ${CENTER.lat}, lon: ${CENTER.lon} },
  /** Half the side of the extracted square, metres. */
  half: ${HALF},
  /** Highway classes, indexed by edges' class field. */
  classes: ${JSON.stringify(CLASSES)},
  /** x, z per node. */
  nodes: [${flat(outNodes)}],
  /** a, b, class, oneway (0 two-way, 1 one carriageway, 2 two merged carriageways) per edge. */
  edges: [${flat(outEdges)}],
  /** node, radius in metres per roundabout. */
  roundabouts: [${flat(outRound)}],
  /** x, z per bus or tram stop platform. */
  stops: [${flat(stops)}],
  palace: { x: ${palace[0]}, z: ${palace[1]} },
};
`;
writeFileSync(OUT, ts);
console.log(`${outNodes.length} nodes, ${outEdges.length} edges, ${outRound.length} roundabouts, ${stops.length} stops, ${ts.length} bytes → ${OUT}`);
