import * as THREE from 'three';
import { BUS_LENGTH, STINK_STAGE_LIMITS } from '../../shared/config';
import { BUS_VOXELS_X, BUS_VOXELS_Y, busVoxels, type BusPart, type StinkStage, type Voxel } from './busVoxels';

/** Voxels are cubes; the model is as long as the bus in the sim. */
export const BUS_VOXEL_SIZE = BUS_LENGTH / BUS_VOXELS_X;

// Fixed colours (GAME_DESIGN palette). Player-coloured parts use a brightness factor instead.
const FIXED_COLORS: Partial<Record<BusPart, number>> = {
  window: 0x3b5566,
  windshield: 0x628598,
  door: 0x22303a,
  tire: 0x202024,
  hub: 0xb8bec4,
  bumper: 0x2c2c31,
  headlight: 0xffe7a0,
  taillight: 0xd8432f,
  sign: 0xffb000,
  ac: 0xc3c7cb,
  stain: 0x6f7a2e,
  crack: 0xc9d6dc,
};
const PLAYER_SHADE: Partial<Record<BusPart, number>> = { body: 1, bodyDark: 0.7 };

// Unit cube faces: outward normal and corners in counter-clockwise order seen from outside.
const FACES: { n: [number, number, number]; c: [number, number, number][] }[] = [
  { n: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
  { n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
];

/**
 * Model space: the bus faces +z (bus.angle = 0), y is up, origin at the centre of the footprint.
 * Voxel y = 4 (doors) maps to -x, which is the bus's right side when facing +z.
 */
function toGrid(v: Voxel): [number, number, number] {
  return [BUS_VOXELS_Y - 1 - v.y, v.z, v.x];
}

function buildGeometry(voxels: Voxel[], colorOf: (part: BusPart) => THREE.Color | null): THREE.BufferGeometry {
  const filled = new Set(voxels.map((v) => toGrid(v).join(',')));
  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const s = BUS_VOXEL_SIZE;
  const ox = -BUS_VOXELS_Y / 2;
  const oz = -BUS_VOXELS_X / 2;
  for (const v of voxels) {
    const color = colorOf(v.part);
    if (!color) continue;
    const [gx, gy, gz] = toGrid(v);
    for (const f of FACES) {
      if (filled.has(`${gx + f.n[0]},${gy + f.n[1]},${gz + f.n[2]}`)) continue;
      const base = pos.length / 3;
      for (const [cx, cy, cz] of f.c) {
        pos.push((gx + cx + ox) * s, (gy + cy) * s, (gz + cz + oz) * s);
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

interface StageGeometries {
  /** Player-coloured parts; vertex colour is a brightness factor multiplied by the material colour. */
  player: THREE.BufferGeometry;
  fixed: THREE.BufferGeometry;
}

const cache = new Map<StinkStage, StageGeometries>();

function geometriesFor(stage: StinkStage): StageGeometries {
  let g = cache.get(stage);
  if (!g) {
    const voxels = busVoxels(stage);
    const fixedColors = new Map<BusPart, THREE.Color>();
    for (const [part, hex] of Object.entries(FIXED_COLORS)) fixedColors.set(part as BusPart, new THREE.Color(hex));
    g = {
      player: buildGeometry(voxels, (p) => {
        const k = PLAYER_SHADE[p];
        return k === undefined ? null : new THREE.Color(k, k, k);
      }),
      fixed: buildGeometry(voxels, (p) => fixedColors.get(p) ?? null),
    };
    cache.set(stage, g);
  }
  return g;
}

let fixedMaterial: THREE.MeshLambertMaterial | null = null;

export function stinkStage(stink: number): StinkStage {
  if (stink > STINK_STAGE_LIMITS[1]) return 2;
  if (stink > STINK_STAGE_LIMITS[0]) return 1;
  return 0;
}

export interface BusModel {
  group: THREE.Group;
  setColor(hex: number): void;
  setStink(stink: number): void;
  dispose(): void;
}

/** One bus: two meshes sharing cached geometry, so many buses cost little. */
export function createBusModel(color: number): BusModel {
  fixedMaterial ??= new THREE.MeshLambertMaterial({ vertexColors: true });
  const playerMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, color });
  const g0 = geometriesFor(0);
  const playerMesh = new THREE.Mesh(g0.player, playerMaterial);
  const fixedMesh = new THREE.Mesh(g0.fixed, fixedMaterial);
  const group = new THREE.Group();
  group.add(playerMesh, fixedMesh);
  let stage: StinkStage = 0;
  return {
    group,
    setColor(hex) {
      playerMaterial.color.setHex(hex);
    },
    setStink(stink) {
      const next = stinkStage(stink);
      if (next === stage) return;
      stage = next;
      const g = geometriesFor(stage);
      playerMesh.geometry = g.player;
      fixedMesh.geometry = g.fixed;
    },
    dispose() {
      playerMaterial.dispose();
    },
  };
}
