import * as THREE from 'three';
import { CITY_FLOOR_HEIGHT } from '../shared/config';
import type { BuildingStyle, CityBuilding, World } from '../shared/types';

/** One atlas cell = one tile of wall × one storey, in pixels (pixel art, nearest filtering). */
const CW = 16;
const CH = 12;
/** Cells per (style, color): ground floor ×2, middle floor ×2, top floor, roof. */
const CELLS = ['ground0', 'ground1', 'mid0', 'mid1', 'top', 'roof'] as const;
type Cell = typeof CELLS[number];
const FH = CITY_FLOOR_HEIGHT;

const BLOCK_WALL = 0xdedbd2;
const PAVILION_WALL = 0xd8d4c8;
const GLASS = 0x2d3e52;
const GLASS_LIGHT = 0x56708e;
const FRAME = 0xf0ead8;

function hash(a: number, b: number, c = 0): number {
  let h = Math.imul(a, 374761393) ^ Math.imul(b, 668265263) ^ Math.imul(c, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function shade(hex: number, k: number): number {
  const c = (s: number) => Math.max(0, Math.min(255, Math.round(((hex >> s) & 255) * k)));
  return (c(16) << 16) | (c(8) << 8) | c(0);
}

const css = (hex: number) => `#${hex.toString(16).padStart(6, '0')}`;

type Px = (x: number, y: number, w: number, h: number, hex: number) => void;

/** Paints one facade cell. `px` draws in cell pixels: x 0..15 left to right, y 0..11 top down. */
function paintCell(px: Px, style: BuildingStyle, color: number, cell: Cell): void {
  const window = (x: number, y: number, w: number, h: number, frame = FRAME) => {
    px(x, y, w, h, frame);
    px(x + 1, y + 1, w - 2, h - 2, GLASS);
    px(x + 1, y + 1, 1, Math.max(1, (h - 2) >> 1), GLASS_LIGHT);
  };
  switch (style) {
    case 'tenement': {
      const wall = color;
      if (cell === 'roof') {
        px(0, 0, CW, CH, 0x8a4a3a);
        for (let x = 0; x < CW; x += 4) px(x, 0, 1, CH, 0x6e3a2e);
        return;
      }
      if (cell === 'ground0' || cell === 'ground1') {
        px(0, 0, CW, CH, shade(wall, 0.85));
        for (let y = 2; y < CH; y += 3) px(0, y, CW, 1, shade(wall, 0.72));
        if (cell === 'ground0') {
          px(1, 2, 14, 2, 0x9c2f2f);
          px(2, 4, 12, 8, 0x5a4632);
          px(3, 5, 10, 7, 0x34495e);
          px(3, 5, 2, 3, GLASS_LIGHT);
        } else {
          px(5, 3, 6, 9, 0x4a2e1c);
          px(6, 2, 4, 1, 0x4a2e1c);
          px(7, 4, 2, 8, 0x5f3c25);
        }
        return;
      }
      px(0, 0, CW, CH, wall);
      if (cell === 'top') {
        px(0, 0, CW, 2, shade(wall, 1.18));
        px(0, 2, CW, 1, shade(wall, 0.78));
        window(5, 4, 6, 7);
        px(4, 11, 8, 1, shade(wall, 1.15));
        return;
      }
      px(4, 1, 8, 1, shade(wall, 0.8));
      window(5, 2, 6, 8);
      px(8, 3, 1, 6, FRAME);
      px(4, 10, 8, 1, shade(wall, 1.15));
      if (cell === 'mid1') {
        px(3, 9, 10, 1, 0x2e2e2e);
        for (let x = 3; x < 13; x += 2) px(x, 10, 1, 2, 0x2e2e2e);
      }
      return;
    }
    case 'mdm': {
      const wall = color;
      if (cell === 'roof') { px(0, 0, CW, CH, 0x8d8478); return; }
      if (cell === 'ground0' || cell === 'ground1') {
        px(0, 0, CW, CH, shade(wall, 0.9));
        px(2, 3, 12, 9, 0x4a4238);
        px(3, 2, 10, 1, 0x4a4238);
        px(4, 5, 8, 7, cell === 'ground0' ? 0x6b5a45 : 0x384858);
        return;
      }
      px(0, 0, CW, CH, wall);
      px(0, 0, 2, CH, shade(wall, 1.1));
      px(14, 0, 2, CH, shade(wall, 1.1));
      if (cell === 'top') {
        for (let x = 0; x < CW; x += 2) px(x, 0, 1, 3, shade(wall, 1.2));
        px(0, 3, CW, 1, shade(wall, 0.8));
        window(6, 5, 4, 6);
        return;
      }
      window(6, 1, 4, 10);
      px(5, 0, 6, 1, shade(wall, 0.82));
      if (cell === 'mid1') px(4, 10, 8, 2, shade(wall, 1.15));
      return;
    }
    case 'block': {
      const wall = BLOCK_WALL;
      if (cell === 'roof') {
        px(0, 0, CW, CH, 0x77797c);
        px(3, 4, 1, 1, 0x5f6164); px(11, 8, 1, 1, 0x5f6164); px(7, 2, 1, 1, 0x8a8c8f);
        return;
      }
      px(0, 0, CW, CH, wall);
      px(0, 0, 1, CH, shade(wall, 0.85));
      px(0, CH - 1, CW, 1, shade(wall, 0.85));
      if (cell === 'ground0') {
        px(4, 3, 8, 1, 0x8a8c8f);
        px(6, 4, 4, 7, 0x4a5560);
        px(7, 5, 1, 5, GLASS_LIGHT);
        return;
      }
      if (cell === 'ground1') {
        window(2, 3, 4, 4);
        window(10, 3, 4, 4);
        return;
      }
      if (cell === 'mid0') {
        window(2, 1, 12, 5);
        px(1, 6, 14, 5, color);
        px(1, 6, 14, 1, shade(color, 1.2));
        return;
      }
      window(3, 2, 10, 6);
      px(8, 3, 1, 4, FRAME);
      if (cell === 'top') px(0, 0, CW, 1, shade(wall, 0.75));
      return;
    }
    case 'office': {
      const glass = color;
      if (cell === 'roof') { px(0, 0, CW, CH, 0x5f6266); return; }
      const dark = cell === 'ground0' || cell === 'ground1';
      px(0, 0, CW, CH, shade(glass, dark ? 0.6 : 1));
      for (let y = 0; y < CH; y++) px((y + 3) % CW, y, 3, 1, shade(glass, dark ? 0.75 : 1.25));
      for (let x = 0; x < CW; x += 4) px(x, 0, 1, CH, 0xc8d0d8);
      px(0, 0, CW, 2, cell === 'top' ? 0xb8c0c8 : shade(glass, 0.55));
      if (cell === 'ground0') px(6, 5, 4, 7, 0x2a3440);
      return;
    }
    case 'pavilion': {
      if (cell === 'roof') { px(0, 0, CW, CH, 0x6c6c6c); return; }
      px(0, 0, CW, CH, PAVILION_WALL);
      px(0, 0, CW, 4, color);
      for (let x = 2; x < 14; x += 2) px(x, 1, 1, 2, 0xffffff);
      px(1, 5, 14, 7, 0x777777);
      px(2, 6, 12, 6, 0x5d7f99);
      px(2, 6, 3, 2, 0x86a6be);
      return;
    }
    case 'palace': {
      const wall = color;
      if (cell === 'roof') { px(0, 0, CW, CH, 0xb5a68a); return; }
      px(0, 0, CW, CH, shade(wall, 0.95));
      px(0, 0, 3, CH, shade(wall, 1.12));
      px(13, 0, 3, CH, shade(wall, 1.12));
      if (cell === 'ground0' || cell === 'ground1') {
        px(4, 3, 8, 9, 0x4a4238);
        px(5, 2, 6, 1, 0x4a4238);
        return;
      }
      if (cell === 'top') {
        for (let x = 0; x < CW; x += 4) px(x, 0, 2, 3, shade(wall, 1.2));
        px(0, 3, CW, 1, shade(wall, 0.78));
      } else px(3, 0, 10, 1, shade(wall, 0.82));
      px(6, 4, 4, 7, GLASS);
      px(6, 4, 1, 3, GLASS_LIGHT);
      return;
    }
  }
}

/** Facade atlas: a row of CELLS per (style, color) used in this world. */
function createAtlas(buildings: CityBuilding[]) {
  const keys = [...new Set(buildings.map((b) => `${b.style}:${b.color}`))];
  const canvas = document.createElement('canvas');
  canvas.width = CW * CELLS.length;
  canvas.height = CH * Math.max(1, keys.length);
  const ctx = canvas.getContext('2d')!;
  keys.forEach((key, row) => {
    const [style, color] = key.split(':');
    CELLS.forEach((cell, col) => {
      const px: Px = (x, y, w, h, hex) => {
        ctx.fillStyle = css(hex);
        ctx.fillRect(col * CW + x, row * CH + y, w, h);
      };
      paintCell(px, style as BuildingStyle, Number(color), cell);
    });
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  const rows = new Map(keys.map((k, i) => [k, i]));
  /** UV rectangle [u0, v0 (bottom), u1, v1 (top)] of a cell, inset half a texel against bleeding. */
  const uv = (b: CityBuilding, cell: Cell): [number, number, number, number] => {
    const row = rows.get(`${b.style}:${b.color}`)!;
    const col = CELLS.indexOf(cell);
    const W = canvas.width, H = canvas.height;
    return [(col * CW + 0.5) / W, 1 - ((row + 1) * CH - 0.5) / H, ((col + 1) * CW - 0.5) / W, 1 - (row * CH + 0.5) / H];
  };
  return { tex, uv };
}

/** Collects textured quads and small solid boxes (cornices, chimneys, the spire). */
function createBuilder(uvOf: (b: CityBuilding, cell: Cell) => [number, number, number, number]) {
  const pos: number[] = [];
  const nor: number[] = [];
  const uvs: number[] = [];
  const boxes: { x: number; y: number; z: number; sx: number; sy: number; sz: number; color: number }[] = [];
  const v = new THREE.Vector3();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();

  /** Quad p0 (bottom left), p1 (bottom right), p2 (top right), p3 (top left) facing n. */
  const quad = (p: number[][], n: number[], [u0, v0, u1, v1]: [number, number, number, number]) => {
    e1.set(p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]);
    e2.set(p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]);
    v.crossVectors(e1, e2);
    const flip = v.x * n[0] + v.y * n[1] + v.z * n[2] < 0;
    const t: number[][] = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
    const order = flip ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3];
    for (const i of order) {
      pos.push(...p[i]);
      nor.push(...n);
      uvs.push(...t[i]);
    }
  };

  /** Wall `width` wide centred at (cx, cz) facing (nx, nz), storeys from..to, one cell per storey. */
  const wall = (b: CityBuilding, cx: number, cz: number, nx: number, nz: number, width: number,
    from: number, to: number, column: number, top: number, y0 = 0) => {
    const rx = nz * (width / 2), rz = -nx * (width / 2);
    for (let k = from; k < to; k++) {
      const ya = y0 + k * FH, yb = ya + FH;
      quad([[cx - rx, ya, cz - rz], [cx + rx, ya, cz + rz], [cx + rx, yb, cz + rz], [cx - rx, yb, cz - rz]],
        [nx, 0, nz], uvOf(b, cellFor(b, k, top, column)));
    }
  };

  const roof = (b: CityBuilding, x0: number, z0: number, x1: number, z1: number, y: number) => {
    quad([[x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0]], [0, 1, 0], uvOf(b, 'roof'));
  };

  /** Textured box from storey `from` to `to` (exclusive), whole-storey cells along each side. */
  const box = (b: CityBuilding, x0: number, z0: number, x1: number, z1: number, from: number, to: number) => {
    for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const len = nx ? z1 - z0 : x1 - x0;
      const cols = Math.max(1, Math.round(len));
      for (let c = 0; c < cols; c++) {
        const s = (c + 0.5) * (len / cols);
        const cx = nx ? (nx > 0 ? x1 : x0) : x0 + s;
        const cz = nx ? z0 + s : nz > 0 ? z1 : z0;
        wall(b, cx, cz, nx, nz, len / cols, from, to, c, to - 1);
      }
    }
    roof(b, x0, z0, x1, z1, to * FH);
  };

  const solid = (x: number, y: number, z: number, sx: number, sy: number, sz: number, color: number) => {
    boxes.push({ x, y, z, sx, sy, sz, color });
  };

  return { wall, roof, box, solid, pos, nor, uvs, boxes };
}

/** Which facade cell storey k of a building shows; `column` varies balconies and doors. */
function cellFor(b: CityBuilding, k: number, top: number, column: number): Cell {
  if (b.style === 'pavilion') return 'ground0';
  if (k === 0) {
    if (b.style === 'block') return column % 5 === 2 ? 'ground0' : 'ground1';
    return hash(column, b.color) < 0.5 ? 'ground0' : 'ground1';
  }
  if (k === top) return 'top';
  if (b.style === 'block') return column % 3 === 1 ? 'mid1' : 'mid0';
  if (b.style === 'tenement') return hash(column, b.floors, b.color) < 0.3 ? 'mid1' : 'mid0';
  return k % 2 ? 'mid1' : 'mid0';
}

/** Voxel buildings from World.tiles and World.buildings: per-tile walls with facades, roofs, details. */
export function createBuildingsRender(scene: THREE.Scene, world: World): void {
  const buildings = world.buildings ?? [];
  if (!buildings.length) return;
  const { size, tiles } = world;
  const atlas = createAtlas(buildings);
  const g = createBuilder(atlas.uv);
  const bAt = (x: number, z: number) =>
    x < 0 || z < 0 || x >= size || z >= size || tiles[z * size + x].kind !== 'building' ? -1 : tiles[z * size + x].building ?? -1;
  const palaces = new Map<number, { x0: number; z0: number; x1: number; z1: number }>();

  tiles.forEach((t, idx) => {
    if (t.kind !== 'building' || t.building === undefined) return;
    const x = idx % size, z = Math.floor(idx / size);
    const id = t.building;
    const b = buildings[id];
    if (b.style === 'palace') {
      const r = palaces.get(id) ?? { x0: x, z0: z, x1: x + 1, z1: z + 1 };
      palaces.set(id, { x0: Math.min(r.x0, x), z0: Math.min(r.z0, z), x1: Math.max(r.x1, x + 1), z1: Math.max(r.z1, z + 1) });
      return;
    }
    const h = b.floors * FH;
    for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const other = bAt(x + nx, z + nz);
      if (other === id) continue;
      const below = other >= 0 && buildings[other].style !== 'palace' ? buildings[other].floors : 0;
      if (below >= b.floors) continue;
      const cx = x + 0.5 + nx * 0.5, cz = z + 0.5 + nz * 0.5;
      const column = nx ? z : x;
      g.wall(b, cx, cz, nx, nz, 1, below, b.floors, column, b.floors - 1);
      // Cornice on old buildings, a parapet on modern ones.
      if (b.style === 'tenement' || b.style === 'mdm') {
        g.solid(cx + nx * 0.08, h - 0.08, cz + nz * 0.08, nx ? 0.26 : 1.04, 0.16, nz ? 0.26 : 1.04, shade(b.color, 1.15));
      } else if (b.style !== 'pavilion') {
        g.solid(cx - nx * 0.06, h + 0.1, cz - nz * 0.06, nx ? 0.12 : 1, 0.2, nz ? 0.12 : 1, b.style === 'office' ? 0xb8c0c8 : 0xa9a69e);
      }
    }
    g.roof(b, x, z, x + 1, z + 1, h);
    const r = hash(x, z, world.seed);
    if (b.style === 'tenement' && r < 0.12) g.solid(x + 0.3 + r * 3, h + 0.3, z + 0.5, 0.35, 0.6, 0.35, 0x9a4a3a);
    if (b.style === 'office' && r < 0.08) g.solid(x + 0.5, h + 0.25, z + 0.5, 0.7, 0.5, 0.5, 0x9a9ea3);
    if (b.style === 'block' && r < 0.05) g.solid(x + 0.5, h + 0.35, z + 0.5, 1.2, 0.7, 1.2, 0xc9c6bd);
    if (b.style === 'office' && b.floors >= 18 && r < 0.03) g.solid(x + 0.5, h + 1.5, z + 0.5, 0.1, 3, 0.1, 0x5f6266);
  });

  // Palace of Culture: stepped tiers, corner pinnacles and the spire.
  for (const [id, r] of palaces) {
    const b = buildings[id];
    const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
    const side = r.x1 - r.x0;
    const tiers: [number, number, number][] = [[0, 0, 4], [side * 0.18, 4, 10], [side * 0.32, 10, 16], [side * 0.39, 16, 20], [side * 0.43, 20, 22]];
    for (const [inset, from, to] of tiers) {
      g.box(b, r.x0 + inset, r.z0 + inset, r.x1 - inset, r.z1 - inset, from, to);
      for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const half = side / 2 - inset - 0.3;
        g.solid(cx + sx * half, to * FH + 0.4, cz + sz * half, 0.5, 0.8, 0.5, shade(b.color, 1.1));
      }
    }
    const top = 22 * FH;
    g.solid(cx, top + 1.2, cz, 0.9, 2.4, 0.9, shade(b.color, 1.05));
    g.solid(cx, top + 3.6, cz, 0.4, 2.4, 0.4, 0xc9b98f);
    g.solid(cx, top + 5.6, cz, 0.15, 1.6, 0.15, 0xd8c070);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(g.pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(g.nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(g.uvs, 2));
  scene.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: atlas.tex })));

  const details = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial(), g.boxes.length);
  const m = new THREE.Matrix4();
  const color = new THREE.Color();
  g.boxes.forEach((d, k) => {
    details.setMatrixAt(k, m.makeScale(d.sx, d.sy, d.sz).setPosition(d.x, d.y, d.z));
    details.setColorAt(k, color.setHex(d.color));
  });
  scene.add(details);
}
