import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CITY_BIKE_WIDTH, CITY_ROUNDABOUT_RING, CITY_STREETS } from '../shared/config';
import type { CityStreet, World } from '../shared/types';
import { ROUNDABOUT_WALK } from '../sim/city';
import { createBuildingsRender } from './buildings';

/** Ground texture pixels per tile. */
const PX = 16;
// Colors and opacities of the ground layer. It lies over the zone colors, so ownership still
// reads through streets and lawns (lawns are fully see-through).
const PAVING = 0xc4bfb5;
const ASPHALT = 0x3f4248;
const GREEN = 0x5f9e45;
const BIKE = 0xa8473a;
const PAINT = 0xf2f2ee;
const PARK = 0x4f9a3c;
const PATH = 0xd6c7a1;
const WATER = 0x5aa6d6;
const A_PAVING = 0.62;
const A_ASPHALT = 0.84;
const A_GREEN = 0.5;
const A_BIKE = 0.78;
const A_PAINT = 0.95;
const A_PARK = 0.32;
const A_PATH = 0.62;
const TREE_TRUNK = 0x7a5232;
const TREE_CROWNS = [0x3f8f3a, 0x4d9a3b, 0x2f7a35, 0x5aa646, 0x6b9e3a];
/** Share of park tiles with a tree, and of open lawn tiles away from buildings. */
const PARK_TREES = 0.16;
const LAWN_TREES = 0.035;
/** Street trees stand this far apart along green strips and medians. */
const STREET_TREE_STEP = 3.5;

/** Deterministic 0..1 noise from integers; render must not touch the sim rng. */
function hash(a: number, b: number, c = 0): number {
  let h = Math.imul(a, 374761393) ^ Math.imul(b, 668265263) ^ Math.imul(c, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const css = (hex: number) => `#${hex.toString(16).padStart(6, '0')}`;

/** Draws everything twice: color, and opacity as a grey level, merged into one RGBA texture. */
function createPainter(size: number) {
  const make = () => {
    const c = document.createElement('canvas');
    c.width = c.height = size * PX;
    const ctx = c.getContext('2d')!;
    ctx.scale(PX, PX);
    return { c, ctx };
  };
  const color = make();
  const alpha = make();
  const both = (draw: (ctx: CanvasRenderingContext2D) => void, hex: number, a: number) => {
    for (const [ctx, style] of [[color.ctx, css(hex)], [alpha.ctx, `rgb(${a * 255},${a * 255},${a * 255})`]] as const) {
      ctx.fillStyle = style;
      ctx.strokeStyle = style;
      draw(ctx);
    }
  };
  return {
    rect(x: number, z: number, w: number, h: number, hex: number, a: number) {
      both((ctx) => ctx.fillRect(x, z, w, h), hex, a);
    },
    poly(pts: [number, number][], hex: number, a: number) {
      both((ctx) => {
        ctx.beginPath();
        pts.forEach(([x, z], i) => (i ? ctx.lineTo(x, z) : ctx.moveTo(x, z)));
        ctx.closePath();
        ctx.fill();
      }, hex, a);
    },
    disc(x: number, z: number, r: number, hex: number, a: number) {
      both((ctx) => { ctx.beginPath(); ctx.arc(x, z, r, 0, Math.PI * 2); ctx.fill(); }, hex, a);
    },
    line(pts: [number, number][], width: number, hex: number, a: number, dash: number[] = []) {
      both((ctx) => {
        ctx.lineWidth = width;
        ctx.lineCap = dash.length ? 'butt' : 'round';
        ctx.lineJoin = 'round';
        ctx.setLineDash(dash);
        ctx.beginPath();
        pts.forEach(([x, z], i) => (i ? ctx.lineTo(x, z) : ctx.moveTo(x, z)));
        ctx.stroke();
        ctx.setLineDash([]);
      }, hex, a);
    },
    texture(): THREE.CanvasTexture {
      const n = size * PX;
      const img = color.ctx.getImageData(0, 0, n, n);
      const a = alpha.ctx.getImageData(0, 0, n, n).data;
      for (let i = 0; i < a.length; i += 4) img.data[i + 3] = a[i];
      color.ctx.putImageData(img, 0, 0);
      const tex = new THREE.CanvasTexture(color.c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      return tex;
    },
  };
}

/** Point on street `s` at distance t from a, shifted `off` along its normal (-dz, dx). */
function along(s: CityStreet, t: number, off: number): [number, number] {
  const len = Math.hypot(s.bx - s.ax, s.bz - s.az);
  const dx = (s.bx - s.ax) / len, dz = (s.bz - s.az) / len;
  return [s.ax + dx * t - dz * off, s.az + dz * t + dx * off];
}

const streetLength = (s: CityStreet) => Math.hypot(s.bx - s.ax, s.bz - s.az);

/** Lateral bands of one side (1 or -1) of a street: [from, to, what], centreline outward. */
function bands(s: CityStreet, side: number): [number, number, 'median' | 'road' | 'green' | 'bike' | 'walk'][] {
  const p = CITY_STREETS[s.kind];
  const out: [number, number, 'median' | 'road' | 'green' | 'bike' | 'walk'][] = [];
  let o = 0;
  const add = (w: number, what: 'median' | 'road' | 'green' | 'bike' | 'walk') => {
    if (w > 0) out.push([o * side, (o + w) * side, what]);
    o += w;
  };
  add(p.median, 'median');
  add(p.road, 'road');
  add(p.green, 'green');
  if (s.bike === side) add(CITY_BIKE_WIDTH, 'bike');
  add(p.walk, 'walk');
  return out;
}

/** Static city: ground layer (streets, sidewalks, parks), trees and buildings. Read-only on the world. */
export function createCityRender(scene: THREE.Scene, world: World): void {
  const { size, tiles } = world;
  const streets = world.streets ?? [];
  const roundabouts = world.roundabouts ?? [];
  const paint = createPainter(size);

  // Paving under every road tile (sidewalks, squares, gateways); parks get a green tint.
  tiles.forEach((t, idx) => {
    const x = idx % size, z = Math.floor(idx / size);
    if (t.kind === 'road') paint.rect(x, z, 1, 1, PAVING, A_PAVING);
    else if (t.kind === 'park') paint.rect(x, z, 1, 1, PARK, A_PARK);
  });

  const band = (s: CityStreet, from: number, to: number, t0: number, t1: number, hex: number, a: number) => {
    if (t1 <= t0) return;
    paint.poly([along(s, t0, from), along(s, t1, from), along(s, t1, to), along(s, t0, to)], hex, a);
  };
  for (const s of streets) {
    const len = streetLength(s);
    for (const side of [1, -1]) {
      for (const [from, to, what] of bands(s, side)) {
        if (what === 'green') band(s, from, to, s.trimA, len - s.trimB, GREEN, A_GREEN);
        if (what === 'bike') band(s, from, to, s.trimA, len - s.trimB, BIKE, A_BIKE);
      }
    }
  }
  for (const s of streets) {
    const p = CITY_STREETS[s.kind];
    paint.line([[s.ax, s.az], [s.bx, s.bz]], 2 * (p.median + p.road), ASPHALT, A_ASPHALT);
  }
  for (const r of roundabouts) {
    paint.disc(r.x, r.z, r.r + ROUNDABOUT_WALK, PAVING, A_PAVING);
    paint.disc(r.x, r.z, r.r, ASPHALT, A_ASPHALT);
  }
  for (const s of streets) {
    const p = CITY_STREETS[s.kind];
    const len = streetLength(s);
    if (p.median) band(s, -p.median, p.median, s.trimA, len - s.trimB, GREEN, A_GREEN + 0.15);
    const t0 = s.trimA + 0.6, t1 = len - s.trimB - 0.6;
    const dashed = (off: number, w: number, dash: number[]) => {
      if (t1 > t0) paint.line([along(s, t0, off), along(s, t1, off)], w, PAINT, A_PAINT, dash);
    };
    if (p.median) for (const side of [1, -1]) dashed(side * (p.median + p.road / 2), 0.14, [1, 1]);
    else dashed(0, 0.16, [1.2, 0.8]);
    for (const side of [1, -1]) {
      for (const [from, to, what] of bands(s, side)) if (what === 'bike') dashed((from + to) / 2, 0.08, [0.5, 0.5]);
    }
    // Zebra crossings at junction ends.
    for (const [trim, at] of [[s.trimA, s.trimA], [s.trimB, len - s.trimB - 1.1]] as const) {
      if (trim <= 0 || at < 0 || at + 1.1 > len) continue;
      const half = p.median + p.road;
      for (let o = -half + 0.25; o < half - 0.2; o += 0.7) {
        if (Math.abs(o) < p.median + 0.1) continue;
        band(s, o, o + 0.38, at + 0.1, at + 1.1, PAINT, A_PAINT);
      }
    }
  }
  for (const r of roundabouts) {
    paint.line(circle(r.x, r.z, r.r - CITY_ROUNDABOUT_RING / 2), 0.14, PAINT, A_PAINT, [1, 1]);
    paint.disc(r.x, r.z, r.r - CITY_ROUNDABOUT_RING + 0.25, PAVING, 0.8);
    paint.disc(r.x, r.z, r.r - CITY_ROUNDABOUT_RING, GREEN, 0.7);
  }

  const parks = parkPaths(world);
  for (const p of parks) {
    for (const [x, z] of p.ends) paint.line([[p.x, p.z], [x, z]], 1, PATH, A_PATH);
    paint.disc(p.x, p.z, 1.8, PATH, A_PATH + 0.1);
    paint.disc(p.x, p.z, 1.1, 0x8f8a80, 0.9);
    paint.disc(p.x, p.z, 0.85, WATER, 0.95);
  }

  const groundTex = paint.texture();
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: groundTex, transparent: true, depthWrite: false }),
  );
  ground.position.set(size / 2, 0.012, size / 2);
  scene.add(ground);

  createTrees(scene, world, parks);
  createBuildingsRender(scene, world);
}

function circle(x: number, z: number, r: number): [number, number][] {
  return Array.from({ length: 65 }, (_, k) => [x + Math.cos((k / 64) * Math.PI * 2) * r, z + Math.sin((k / 64) * Math.PI * 2) * r]);
}

interface ParkLayout { x: number; z: number; ends: [number, number][] }

/** Each park: a fountain in the tile nearest its middle and paths from it to a few street edges. */
function parkPaths(world: World): ParkLayout[] {
  const { size, tiles } = world;
  const seen = new Uint8Array(size * size);
  const out: ParkLayout[] = [];
  for (let start = 0; start < tiles.length; start++) {
    if (tiles[start].kind !== 'park' || seen[start]) continue;
    const list = [start];
    seen[start] = 1;
    for (let q = 0; q < list.length; q++) {
      const x = list[q] % size, z = Math.floor(list[q] / size);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, nz = z + dz, n = nz * size + nx;
        if (nx < 0 || nz < 0 || nx >= size || nz >= size || seen[n] || tiles[n].kind !== 'park') continue;
        seen[n] = 1;
        list.push(n);
      }
    }
    if (list.length < 40) continue;
    let cx = 0, cz = 0;
    for (const idx of list) { cx += (idx % size) + 0.5; cz += Math.floor(idx / size) + 0.5; }
    cx /= list.length; cz /= list.length;
    const mid = list.reduce((b, idx) =>
      Math.hypot((idx % size) + 0.5 - cx, Math.floor(idx / size) + 0.5 - cz)
        < Math.hypot((b % size) + 0.5 - cx, Math.floor(b / size) + 0.5 - cz) ? idx : b);
    const x = (mid % size) + 0.5, z = Math.floor(mid / size) + 0.5;
    // Entrances: park tiles by a road, one per direction around the fountain.
    const ends = new Map<number, [number, number]>();
    for (const idx of list) {
      const ix = idx % size, iz = Math.floor(idx / size);
      const byRoad = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => tiles[(iz + dz) * size + ix + dx]?.kind === 'road'
        && ix + dx >= 0 && ix + dx < size);
      if (!byRoad) continue;
      const sector = Math.floor(((Math.atan2(iz + 0.5 - z, ix + 0.5 - x) + Math.PI) / (Math.PI * 2)) * 4) % 4;
      const d = Math.hypot(ix + 0.5 - x, iz + 0.5 - z);
      const cur = ends.get(sector);
      if (!cur || d < Math.hypot(cur[0] - x, cur[1] - z)) ends.set(sector, [ix + 0.5, iz + 0.5]);
    }
    out.push({ x, z, ends: [...ends.values()] });
  }
  return out;
}

function distToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}

/** Voxel trees in parks, on lawns, along green strips and avenue medians. Drawn only: buses drive through. */
function createTrees(scene: THREE.Scene, world: World, parks: ParkLayout[]): void {
  const { size, tiles, seed } = world;
  const kindAt = (x: number, z: number) => (x < 0 || z < 0 || x >= size || z >= size ? undefined : tiles[z * size + x].kind);
  const trees: { x: number; z: number; s: number; c: number }[] = [];
  const add = (x: number, z: number, s: number, k: number) => {
    if (x < 0.5 || z < 0.5 || x > size - 0.5 || z > size - 0.5) return;
    if (kindAt(Math.floor(x), Math.floor(z)) === 'building') return;
    trees.push({ x, z, s, c: TREE_CROWNS[Math.floor(hash(k, seed, 7) * TREE_CROWNS.length)] });
  };
  tiles.forEach((t, idx) => {
    const x = idx % size, z = Math.floor(idx / size);
    const h = hash(x, z, seed);
    if (t.kind === 'park' && h < PARK_TREES) {
      const px = x + 0.2 + hash(z, x, 1) * 0.6, pz = z + 0.2 + hash(x, z, 2) * 0.6;
      const onPath = parks.some((p) => Math.hypot(px - p.x, pz - p.z) < 2.6
        || p.ends.some(([ex, ez]) => distToSegment(px, pz, p.x, p.z, ex, ez) < 1.1));
      if (!onPath) add(px, pz, 0.85 + hash(x, z, 3) * 0.5, idx);
    } else if (t.kind === 'grass' && h < LAWN_TREES) {
      let open = true;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (kindAt(x + dx, z + dz) !== 'grass') open = false;
      if (open) add(x + 0.5, z + 0.5, 0.8 + hash(x, z, 3) * 0.4, idx);
    }
  });
  world.streets?.forEach((s, si) => {
    const p = CITY_STREETS[s.kind];
    const len = streetLength(s);
    const offsets = [...(p.median >= 0.8 ? [0] : []), ...(p.green ? [1, -1].map((side) => side * (p.median + p.road + p.green / 2)) : [])];
    for (const off of offsets) {
      for (let t = s.trimA + 1.5, k = 0; t < len - s.trimB - 1.5; t += STREET_TREE_STEP, k++) {
        const [x, z] = along(s, t, off);
        add(x, z, 0.75, si * 1000 + k);
      }
    }
  });

  const trunkGeo = new THREE.BoxGeometry(0.22, 0.7, 0.22).translate(0, 0.35, 0);
  const crownGeo = mergeGeometries([
    new THREE.BoxGeometry(1.1, 0.7, 1.1).translate(0, 1.0, 0),
    new THREE.BoxGeometry(0.75, 0.45, 0.75).translate(0, 1.55, 0),
  ]);
  const trunk = new THREE.InstancedMesh(trunkGeo, new THREE.MeshLambertMaterial({ color: TREE_TRUNK }), trees.length);
  const crown = new THREE.InstancedMesh(crownGeo, new THREE.MeshLambertMaterial(), trees.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const color = new THREE.Color();
  trees.forEach((tr, k) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), hash(k, seed, 9) * Math.PI);
    m.compose(new THREE.Vector3(tr.x, 0, tr.z), q, new THREE.Vector3(tr.s, tr.s, tr.s));
    trunk.setMatrixAt(k, m);
    crown.setMatrixAt(k, m);
    crown.setColorAt(k, color.setHex(tr.c));
  });
  scene.add(trunk, crown);
}
