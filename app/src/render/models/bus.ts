import * as THREE from 'three';
import { BUS_LENGTH, STINK_STAGE_LIMITS } from '../../shared/config';
import { BUS_VOXELS_X, BUS_VOXELS_Y, busVoxels, type BusPart, type StinkStage, type Voxel } from './busVoxels';
import { buildVoxelGeometry } from './voxelGeometry';

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

/**
 * Model space: the bus faces +z (bus.angle = 0), y is up, origin at the centre of the footprint.
 * Voxel y = 4 (doors) maps to -x, which is the bus's right side when facing +z.
 */
function buildGeometry(voxels: Voxel[], colorOf: (part: BusPart) => THREE.Color | null): THREE.BufferGeometry {
  const grid = voxels.map((v) => ({ x: BUS_VOXELS_Y - 1 - v.y, y: v.z, z: v.x, color: colorOf(v.part) }));
  return buildVoxelGeometry(grid, BUS_VOXEL_SIZE, [-BUS_VOXELS_Y / 2, 0, -BUS_VOXELS_X / 2]);
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
