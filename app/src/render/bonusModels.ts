import * as THREE from 'three';
import type { BonusKind } from '../shared/types';

// Voxel models of the stink bonuses (GAME_DESIGN: Bonusy smrodu).
// Voxel coordinates: x = right, y = up, z = front. The geometry is centred on the footprint
// with the lowest voxel at y = 0.

/** Edge of one bonus voxel in tiles. Bigger than realistic, so the models read from the game camera. */
export const BONUS_VOXEL_SIZE = 0.11;

export interface BonusVoxel {
  x: number;
  y: number;
  z: number;
  color: number;
}

class Builder {
  private map = new Map<string, BonusVoxel>();

  set(x: number, y: number, z: number, color: number) {
    this.map.set(`${x},${y},${z}`, { x, y, z, color });
  }

  clear(x: number, y: number, z: number) {
    this.map.delete(`${x},${y},${z}`);
  }

  /** Inclusive box. */
  box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, color: number) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) this.set(x, y, z, color);
  }

  ball(cx: number, cy: number, cz: number, r: number, color: (x: number, y: number, z: number) => number) {
    const n = Math.ceil(r);
    for (let x = -n; x <= n; x++) for (let y = -n; y <= n; y++) for (let z = -n; z <= n; z++) {
      if (x * x + y * y + z * z <= r * r) this.set(cx + x, cy + y, cz + z, color(cx + x, cy + y, cz + z));
    }
  }

  voxels(): BonusVoxel[] {
    return [...this.map.values()];
  }
}

/** Deterministic per-voxel hash for speckles, so models look the same every time. */
function hash(x: number, y: number, z: number): number {
  let n = (x * 374761393 + y * 668265263 + z * 982451653) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (n ^ (n >>> 16)) >>> 0;
}

const SKIN = 0xe2b48c;
const STINK_GREEN = 0x8cc846;

interface PersonLook {
  shoes: number;
  legs: number;
  torso: number;
  arms?: number;
  skin?: number;
}

/** Standing person, 13 voxels up to the top of the head (y 0–12), facing +z. */
function person(b: Builder, look: PersonLook) {
  const skin = look.skin ?? SKIN;
  b.box(-2, -1, 0, 0, -1, 1, look.shoes);
  b.box(1, 2, 0, 0, -1, 1, look.shoes);
  b.box(-2, -1, 1, 4, -1, 0, look.legs);
  b.box(1, 2, 1, 4, -1, 0, look.legs);
  b.box(-2, 2, 5, 9, -1, 1, look.torso);
  b.box(-1, 1, 10, 12, -1, 1, skin);
  b.set(-1, 11, 2, 0x202020);
  b.set(1, 11, 2, 0x202020);
  for (const x of [-3, 3]) {
    b.box(x, x, 6, 9, 0, 0, look.arms ?? look.torso);
    b.set(x, 5, 0, skin);
  }
}

// Drunks (GAME_DESIGN: Żul spod Żabki): three looks picked from the proposals, one per bonus by id.
const ZUL = {
  jacket: 0x6b4a2e, jacketDark: 0x4e3520, coat: 0x5e5446, pants: 0x4a4f5a, shoes: 0x2a2522,
  hair: 0x9a938a, stubble: 0x8a7f74, nose: 0xd04040, eye: 0x202020,
  bottle: 0x7a4a1e, neck: 0x9b6a35, glass: 0x2f7a3a, crate: 0x2f5a3a, crateDark: 0x24452d,
  tracksuit: 0x2f3540, stripe: 0xe8e8e8, beanie: 0x4f7f7a, beanieTop: 0x6fa39c, ember: 0xe86a2a,
  bag: 0xeeeeea, bagGreen: 0x2e8b3a, cap: 0x6e6656, capPeak: 0x585244,
  cardboard: 0xb8935a, cardboardDark: 0x9c7a47, paper: 0xdcd8cc, ink: 0x8a8680,
};

export type ZulVariant = 'crate' | 'tracksuit' | 'cardboard';
/** 'walk' while he comes out of a Żabka, 'rest' once he has settled down (and on bus stops). */
export type ZulPose = 'walk' | 'rest';
export const ZUL_VARIANTS: readonly ZulVariant[] = ['crate', 'tracksuit', 'cardboard'];

/** Look of the drunk for a bonus id, the same on every client. */
export function zulVariant(id: number): ZulVariant {
  return ZUL_VARIANTS[((id % ZUL_VARIANTS.length) + ZUL_VARIANTS.length) % ZUL_VARIANTS.length];
}

/** Grey hair at the back, stubble, red nose between the eyes; `y` is the head's bottom row. */
function drunkFace(b: Builder, y: number) {
  b.box(-1, 1, y, y + 2, -1, -1, ZUL.hair);
  b.box(-1, 1, y, y, 2, 2, ZUL.stubble);
  b.set(-1, y + 1, 2, ZUL.eye);
  b.set(1, y + 1, 2, ZUL.eye);
  b.set(0, y + 1, 2, ZUL.nose);
}

/** Young one in a tracksuit with a Żabka bag and a cigarette. Walks and falls over on his face. */
function tracksuit(b: Builder) {
  person(b, { shoes: ZUL.stripe, legs: ZUL.tracksuit, torso: ZUL.tracksuit });
  for (let y = 1; y <= 4; y++) {
    b.set(-2, y, 0, ZUL.stripe);
    b.set(2, y, 0, ZUL.stripe);
  }
  b.box(0, 0, 5, 9, 1, 1, ZUL.stripe); // zip
  b.box(-1, 1, 13, 13, -1, 1, ZUL.beanie);
  b.set(0, 14, 0, ZUL.beanieTop);
  b.set(1, 10, 2, ZUL.stripe); // cigarette
  b.set(1, 10, 3, ZUL.ember);
  b.box(3, 3, 2, 4, -1, 1, ZUL.bag);
  b.set(3, 3, 0, ZUL.bagGreen);
}

/** Bald one with a beer crate: carries it out, then sits on it with a bottle. */
function crate(b: Builder, pose: ZulPose) {
  if (pose === 'walk') {
    person(b, { shoes: ZUL.shoes, legs: ZUL.pants, torso: ZUL.jacket, arms: ZUL.jacketDark });
    drunkFace(b, 10);
    // Arms forward round the crate in front of the belly.
    for (const x of [-3, 3]) {
      for (let y = 5; y <= 9; y++) b.clear(x, y, 0);
      b.set(x, 9, 0, ZUL.jacketDark);
      b.set(x, 8, 1, ZUL.jacketDark);
      b.set(x, 7, 2, SKIN);
    }
    b.box(-2, 2, 5, 7, 2, 5, ZUL.crate);
    b.box(-2, 2, 8, 8, 2, 5, ZUL.crateDark);
    for (const [x, z] of [[-1, 3], [1, 4], [0, 3]]) b.set(x, 9, z, ZUL.neck);
    return;
  }
  b.box(-2, 2, 0, 4, -2, 2, ZUL.crate);
  b.box(-2, 2, 4, 4, -2, 2, ZUL.crateDark);
  b.set(-2, 3, 0, ZUL.crateDark);
  b.set(2, 3, 0, ZUL.crateDark);
  // Sitting: thighs forward, shins down in front of the crate.
  b.box(-2, 2, 5, 5, -1, 0, ZUL.pants);
  for (const [x0, x1] of [[-2, -1], [1, 2]]) {
    b.box(x0, x1, 5, 5, 1, 3, ZUL.pants);
    b.box(x0, x1, 1, 4, 3, 3, ZUL.pants);
    b.box(x0, x1, 0, 0, 3, 4, ZUL.shoes);
  }
  b.box(-2, 2, 6, 10, -1, 1, ZUL.jacket);
  b.box(-1, 1, 11, 13, -1, 1, SKIN);
  drunkFace(b, 11);
  b.box(-3, -3, 7, 10, 0, 0, ZUL.jacketDark);
  b.set(-3, 6, 1, SKIN);
  // Right hand holds a bottle by the neck.
  b.box(3, 3, 7, 10, 0, 0, ZUL.jacketDark);
  b.set(3, 6, 0, SKIN);
  b.set(3, 5, 0, ZUL.neck);
  b.box(3, 3, 2, 4, 0, 0, ZUL.bottle);
  // Empties next to the crate.
  b.box(4, 4, 0, 0, -2, 0, ZUL.glass);
  b.box(-4, -4, 0, 2, 1, 1, ZUL.bottle);
}

/** Old one in a flat cap with a cardboard under his arm: lies down on it, under a newspaper. */
function cardboard(b: Builder, pose: ZulPose) {
  if (pose === 'walk') {
    person(b, { shoes: ZUL.shoes, legs: ZUL.pants, torso: ZUL.coat });
    drunkFace(b, 10);
    b.box(-1, 1, 13, 13, -1, 1, ZUL.cap);
    b.box(-1, 1, 13, 13, 2, 2, ZUL.capPeak);
    b.box(-4, -4, 4, 9, -3, 3, ZUL.cardboard);
    b.box(-4, -4, 6, 6, -3, 3, ZUL.cardboardDark);
    return;
  }
  // On his back along z, head at +z, face up.
  b.box(-4, 4, 0, 0, -7, 5, ZUL.cardboard);
  for (let z = -6; z <= 5; z += 4) b.box(-4, 4, 0, 0, z, z, ZUL.cardboardDark);
  b.box(-2, -1, 1, 2, -6, -3, ZUL.pants);
  b.box(1, 2, 1, 2, -6, -3, ZUL.pants);
  b.box(-2, -1, 1, 3, -7, -7, ZUL.shoes);
  b.box(1, 2, 1, 3, -7, -7, ZUL.shoes);
  b.box(-2, 2, 3, 3, -6, -3, ZUL.paper); // newspaper over the legs
  b.box(-2, 2, 3, 3, -5, -5, ZUL.ink);
  b.box(-2, 2, 1, 3, -2, 1, ZUL.coat);
  for (const x of [-3, 3]) {
    b.box(x, x, 1, 2, -2, 0, ZUL.coat);
    b.set(x, 1, -3, SKIN);
  }
  b.box(-1, 1, 1, 3, 2, 4, SKIN);
  b.box(-1, 1, 1, 1, 2, 4, ZUL.hair);
  b.box(-1, 1, 4, 4, 2, 2, ZUL.stubble);
  b.set(-1, 4, 3, ZUL.eye);
  b.set(1, 4, 3, ZUL.eye);
  b.set(0, 4, 3, ZUL.nose);
  b.box(-1, 1, 1, 3, 5, 5, ZUL.cap);
  b.box(0, 0, 4, 4, -2, -1, ZUL.bottle); // hugged on the chest
  b.set(0, 4, 0, ZUL.neck);
  b.box(4, 4, 1, 1, 2, 3, ZUL.glass);
}

export function zulVoxels(variant: ZulVariant, pose: ZulPose): BonusVoxel[] {
  const b = new Builder();
  if (variant === 'tracksuit') tracksuit(b);
  else if (variant === 'crate') crate(b, pose);
  else cardboard(b, pose);
  return b.voxels();
}

function zul(): BonusVoxel[] {
  return zulVoxels('tracksuit', 'rest');
}

function fan(): BonusVoxel[] {
  const b = new Builder();
  person(b, { shoes: 0xf0f0f0, legs: 0x34508a, torso: 0xc03030 });
  b.box(-1, 1, 6, 8, 2, 2, 0xf4f4f4); // jersey number patch
  b.set(0, 7, 2, 0xc03030);
  // Striped scarf round the neck, end hanging down the front.
  for (let x = -2; x <= 2; x++) for (const z of [-1, 2]) b.set(x, 9, z, x % 2 === 0 ? 0xf4f4f4 : 0xc03030);
  for (const x of [-2, 2]) b.set(x, 9, 0, 0xc03030);
  b.box(-1, -1, 6, 8, 2, 2, 0xf4f4f4);
  b.set(-1, 7, 2, 0xc03030);
  // Painted cheeks and a raised right fist with a beer.
  b.set(-1, 10, 2, 0xc03030);
  b.set(1, 10, 2, 0xf4f4f4);
  for (let y = 5; y <= 9; y++) b.clear(3, y, 0);
  b.box(3, 3, 9, 12, 0, 0, 0xc03030);
  b.set(3, 13, 0, SKIN);
  b.box(3, 3, 14, 15, 1, 1, 0xe8a820);
  b.set(3, 16, 1, 0xfafafa);
  return b.voxels();
}

function controller(): BonusVoxel[] {
  const b = new Builder();
  person(b, { shoes: 0x151515, legs: 0x1e2433, torso: 0x26324a });
  b.box(-1, 1, 13, 13, -1, 1, 0x26324a); // cap
  b.box(-1, 1, 13, 13, 2, 2, 0x111111); // peak
  b.box(-1, 1, 14, 14, -1, 1, 0xd23030); // red top, so it reads as the one to avoid
  b.set(-1, 8, 2, 0xffd040); // badge
  b.box(-3, -3, 8, 8, 0, 0, 0xd23030); // armband
  // Arm stretched forward holding the ticket reader.
  for (let y = 5; y <= 7; y++) b.clear(3, y, 0);
  b.box(3, 3, 8, 8, 1, 3, 0x26324a);
  b.set(3, 8, 4, SKIN);
  b.box(3, 3, 9, 10, 4, 4, 0x222222);
  b.set(3, 10, 5, 0x40e060);
  return b.voxels();
}

function dog(): BonusVoxel[] {
  const b = new Builder();
  const fur = (x: number, y: number, z: number) => (hash(x, y, z) % 4 === 0 ? 0x4e3420 : 0x6b4a2b);
  for (let x = -1; x <= 1; x++) for (let y = 3; y <= 5; y++) for (let z = -3; z <= 3; z++) b.set(x, y, z, fur(x, y, z));
  for (const x of [-1, 1]) for (const z of [-3, 2]) b.box(x, x, 0, 2, z, z, 0x5a3c22);
  for (let x = -1; x <= 1; x++) for (let y = 5; y <= 7; y++) for (let z = 4; z <= 6; z++) b.set(x, y, z, fur(x, y, z));
  b.box(-1, 1, 5, 5, 7, 7, 0x4a3220); // snout
  b.set(0, 6, 7, 0x4a3220);
  b.set(0, 6, 8, 0x111111); // nose
  b.set(-1, 7, 7, 0x111111);
  b.set(1, 7, 7, 0x111111);
  for (const x of [-2, 2]) b.box(x, x, 5, 7, 5, 5, 0x3e2a18); // floppy ears
  b.box(0, 0, 6, 7, -4, -4, 0x6b4a2b); // tail
  // Water dripping off.
  for (const [x, y, z] of [[0, 9, 0], [-2, 7, -2], [2, 8, 1], [1, 7, -3], [-2, 2, 3], [2, 1, -1]]) b.set(x, y, z, 0x7fc4ec);
  return b.voxels();
}

function kebab(): BonusVoxel[] {
  const b = new Builder();
  const fillings = [0x8a4a2a, 0x8a4a2a, 0xf2e8f0, 0x5aa040, 0xb070b0, 0xf8f4ea];
  for (let y = 0; y <= 8; y++) {
    const r = y < 3 ? 1 : 2;
    for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) {
      if (Math.abs(x) === r && Math.abs(z) === r) continue;
      const edge = Math.abs(x) === r || Math.abs(z) === r;
      let c: number;
      if (y <= 3) c = y === 2 ? 0xc83a2e : 0xf4f0e6; // paper wrap with a red stripe
      else if (edge || y < 8) c = 0xe8c98a; // pita
      else c = fillings[hash(x, y, z) % fillings.length];
      b.set(x, y, z, c);
    }
  }
  for (const [x, z] of [[0, 0], [-1, 1], [1, -1]]) b.set(x, 9, z, fillings[hash(x, 9, z) % 3 + 2]);
  return b.voxels();
}

function herring(): BonusVoxel[] {
  const b = new Builder();
  const inside = [0x9aa9b5, 0x9aa9b5, 0xf3efe2, 0xd8d6a0, 0xc8d2da];
  for (let y = 0; y <= 6; y++) for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) {
    if (Math.abs(x) === 2 && Math.abs(z) === 2) continue;
    // Glass shows the pickled fish and onion; a little air on top.
    b.set(x, y, z, y === 6 ? 0xd2ecf0 : y === 0 ? 0xb8d8de : inside[hash(x, y, z) % inside.length]);
  }
  for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) {
    if (Math.abs(x) === 2 && Math.abs(z) === 2) continue;
    b.set(x, 7, z, (x + z) % 2 === 0 ? 0xc8402a : 0xf4f0e6); // checked lid
  }
  b.box(-1, 1, 8, 8, -1, 1, 0xc8402a);
  return b.voxels();
}

function durian(): BonusVoxel[] {
  const b = new Builder();
  b.ball(0, 3, 0, 3.2, (x, y, z) => ((x + y + z) % 2 === 0 ? 0x6f7a20 : 0x9aa63a));
  // Spikes poking out of the shell.
  for (const [x, y, z] of [[4, 3, 0], [-4, 3, 0], [0, 3, 4], [0, 3, -4], [0, -1, 0], [3, 5, 3], [-3, 5, 3], [3, 5, -3], [-3, 5, -3], [3, 1, 3], [-3, 1, -3], [3, 1, -3], [-3, 1, 3]]) {
    b.set(x, y, z, 0x5c661a);
  }
  b.box(0, 0, 7, 8, 0, 0, 0x5a4020); // stem
  return b.voxels();
}

function trash(): BonusVoxel[] {
  const b = new Builder();
  for (let y = 0; y <= 7; y++) for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) {
    if (Math.abs(x) === 2 && Math.abs(z) === 2) continue;
    b.set(x, y, z, y === 7 ? 0x37493a : y === 5 ? 0x6f8b6a : 0x4f6b4a);
  }
  // Rubbish sticking out of the top: banana, paper, a bottle and a stain.
  b.box(-1, 0, 8, 8, -1, -1, 0xf0d040);
  b.set(1, 8, 0, 0xf4f4f0);
  b.set(1, 9, 0, 0xf4f4f0);
  b.box(-1, -1, 8, 10, 1, 1, 0x2f7a3a);
  b.set(0, 8, 1, 0x6f7a2e);
  for (const [x, y, z] of [[2, 11, -1], [-2, 12, 0], [0, 13, 2]]) b.set(x, y, z, 0x202020); // flies
  return b.voxels();
}

function dropped(): BonusVoxel[] {
  const b = new Builder();
  const puff = (x: number, y: number, z: number) => (hash(x, y, z) % 3 === 0 ? 0x6f9a30 : STINK_GREEN);
  b.ball(0, 2, 0, 2.2, puff);
  b.ball(2, 3, 1, 1.5, puff);
  b.ball(-2, 3, -1, 1.5, puff);
  b.ball(0, 5, 0, 1.2, puff);
  return b.voxels();
}

const MODELS: Record<BonusKind, () => BonusVoxel[]> = {
  zul, kebab, dog, fan, herring, durian, trash, controller, dropped,
};

export function bonusVoxels(kind: BonusKind): BonusVoxel[] {
  return MODELS[kind]();
}

// Unit cube faces: outward normal and corners in counter-clockwise order seen from outside.
const FACES: { n: [number, number, number]; c: [number, number, number][] }[] = [
  { n: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
  { n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
];

function buildGeometry(voxels: BonusVoxel[]): THREE.BufferGeometry {
  const filled = new Set(voxels.map((v) => `${v.x},${v.y},${v.z}`));
  const minY = Math.min(...voxels.map((v) => v.y));
  const cx = (Math.min(...voxels.map((v) => v.x)) + Math.max(...voxels.map((v) => v.x)) + 1) / 2;
  const cz = (Math.min(...voxels.map((v) => v.z)) + Math.max(...voxels.map((v) => v.z)) + 1) / 2;
  const s = BONUS_VOXEL_SIZE;
  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const color = new THREE.Color();
  for (const v of voxels) {
    color.setHex(v.color);
    for (const f of FACES) {
      if (filled.has(`${v.x + f.n[0]},${v.y + f.n[1]},${v.z + f.n[2]}`)) continue;
      const base = pos.length / 3;
      for (const [x, y, z] of f.c) {
        pos.push((v.x + x - cx) * s, (v.y + y - minY) * s, (v.z + z - cz) * s);
        nor.push(...f.n);
        col.push(color.r, color.g, color.b);
      }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  return geo;
}

const cache = new Map<BonusKind, THREE.BufferGeometry>();

/** Shared geometry per bonus kind (built once), origin at the bottom centre. */
export function bonusGeometry(kind: BonusKind): THREE.BufferGeometry {
  let g = cache.get(kind);
  if (!g) {
    g = buildGeometry(bonusVoxels(kind));
    cache.set(kind, g);
  }
  return g;
}

const zulCache = new Map<string, THREE.BufferGeometry>();

/** Shared geometry per drunk look and pose, origin at the bottom centre. */
export function zulGeometry(variant: ZulVariant, pose: ZulPose): THREE.BufferGeometry {
  const key = `${variant}:${pose}`;
  let g = zulCache.get(key);
  if (!g) {
    g = buildGeometry(zulVoxels(variant, pose));
    zulCache.set(key, g);
  }
  return g;
}
