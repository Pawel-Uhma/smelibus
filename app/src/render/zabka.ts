import * as THREE from 'three';
import type { World } from '../shared/types';
import { zabkaFront } from '../sim/zabka';
import { BUS_VOXEL_SIZE as VOXEL } from './models/bus';

// Żabka kiosk with a frog on the roof, same voxel size as the bus: 6 voxels a tile, so a
// ZABKA_TILES (2) tile lot is 12 × 12 voxels. Walls 9 high, sign 2, roof 1, frog on top.
// Local space: footprint centred on the origin, shop front (door) faces +z, y up.
const N = 12;
const WALL = 0xf2efe6;
const SIGN = 0x2e8b3a;
const ROOF = 0x3a9a45;
const GRAVEL = 0xbfc3bd;
const LOGO = 0xffffff;
const GLASS = 0x628598;
const DOOR = 0x22303a;
const POSTER = 0xc8443a;
const FROG = 0x46a84f;
const FROG_DARK = 0x2c7438;
const BELLY = 0xe8e2c0;
const PUPIL = 0x202020;

export interface KioskVoxel {
  x: number;
  y: number;
  z: number;
  color: number;
}

function kioskGrid(): Map<string, KioskVoxel> {
  const grid = new Map<string, KioskVoxel>();
  const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, color: number) => {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) grid.set(`${x},${y},${z}`, { x, y, z, color });
  };
  const f = N - 1;
  box(0, f, 0, 8, 0, f, WALL);
  // Front: two shop windows with posters, double door in the middle; a window on each side.
  box(1, 4, 1, 6, f, f, GLASS);
  box(7, 10, 1, 6, f, f, GLASS);
  box(5, 6, 0, 6, f, f, DOOR);
  box(2, 2, 3, 4, f, f, POSTER);
  box(9, 9, 2, 3, f, f, LOGO);
  box(0, 0, 2, 5, 4, 7, GLASS);
  box(f, f, 2, 5, 4, 7, GLASS);
  // Green sign band all round, white logo with two frog eyes on the front.
  box(0, f, 9, 10, 0, f, SIGN);
  box(3, 8, 9, 10, f, f, LOGO);
  box(4, 4, 10, 10, f, f, SIGN);
  box(7, 7, 10, 10, f, f, SIGN);
  // Flat gravel roof with a green rim, so the frog stands out from the top camera.
  box(0, f, 11, 11, 0, f, ROOF);
  box(1, f - 1, 11, 11, 1, f - 1, GRAVEL);
  // The frog: body, belly and mouth on the front, eyes sticking up, folded legs at the sides.
  box(2, 9, 12, 15, 2, 9, FROG);
  for (const x of [2, 9]) for (const z of [2, 9]) grid.delete(`${x},15,${z}`);
  box(3, 8, 12, 13, 9, 9, BELLY);
  box(3, 8, 14, 14, 9, 9, POSTER);
  for (const [x, z] of [[4, 4], [7, 3], [5, 6]]) box(x, x, 15, 15, z, z, FROG_DARK);
  for (const x0 of [2, 7]) {
    box(x0, x0 + 2, 16, 17, 6, 8, LOGO);
    box(x0 + 1, x0 + 1, 16, 17, 8, 8, PUPIL);
  }
  for (const x of [1, 10]) {
    box(x, x, 12, 13, 8, 10, FROG_DARK);
    box(x, x, 12, 14, 2, 5, FROG_DARK);
  }
  return grid;
}

/** Visible voxels of the kiosk (grid coords: x, z 0..11, y up from 0) with their colors. */
export function kioskVoxels(): KioskVoxel[] {
  const grid = kioskGrid();
  const filled = (x: number, y: number, z: number) => y < 0 || grid.has(`${x},${y},${z}`);
  return [...grid.values()].filter(({ x, y, z }) =>
    [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].some(([dx, dy, dz]) => !filled(x + dx, y + dy, z + dz)),
  );
}

/** Heading (rotation.y) that turns the shop front where the sim puts the door. */
function facing(world: World, shop: { x: number; z: number }): number {
  const f = zabkaFront(world, shop);
  return Math.atan2(f.x, f.z);
}

/** Static Żabka kiosks from world.zabkas (card 019). Read-only on the world, built once. */
export function createZabkaRender(scene: THREE.Scene, world: World): void {
  const shops = world.zabkas ?? [];
  if (shops.length === 0) return;
  const voxels = kioskVoxels();
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(VOXEL, VOXEL, VOXEL),
    new THREE.MeshLambertMaterial(),
    voxels.length * shops.length,
  );
  const local = new THREE.Matrix4();
  const place = new THREE.Matrix4();
  const color = new THREE.Color();
  let k = 0;
  for (const shop of shops) {
    place.makeRotationY(facing(world, shop)).setPosition(shop.x, 0, shop.z);
    for (const v of voxels) {
      local.makeTranslation((v.x - (N - 1) / 2) * VOXEL, (v.y + 0.5) * VOXEL, (v.z - (N - 1) / 2) * VOXEL);
      mesh.setMatrixAt(k, local.premultiply(place));
      mesh.setColorAt(k, color.setHex(v.color));
      k++;
    }
  }
  mesh.computeBoundingSphere();
  scene.add(mesh);
}
