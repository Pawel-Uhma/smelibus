import * as THREE from 'three';
import type { World } from '../shared/types';
import { zabkaFront } from '../sim/zabka';
import { BUS_VOXEL_SIZE as VOXEL } from './models/bus';

// Żabka kiosk, same voxel size as the bus: 6 × 6 voxels = one tile, 6 voxels high.
// Local space: footprint centred on the origin, shop front (door) faces +z, y up.
const N = 6;
const WALL = 0xf2efe6;
const SIGN = 0x2e8b3a;
const ROOF = 0x3a9a45;
const LOGO = 0xffffff;
const GLASS = 0x628598;
const DOOR = 0x22303a;

export interface KioskVoxel {
  x: number;
  y: number;
  z: number;
  color: number;
}

function colorAt(x: number, y: number, z: number): number {
  const front = z === N - 1;
  const mid = x === 2 || x === 3;
  if (y === N - 1) return mid && (z === 2 || z === 3) ? LOGO : ROOF;
  if (y === N - 2) return front && mid ? LOGO : SIGN;
  if (front && mid && y <= 2) return DOOR;
  if (front && !mid && (y === 1 || y === 2)) return GLASS;
  return WALL;
}

/** Surface voxels of the kiosk (grid coords 0..5) with their colors. */
export function kioskVoxels(): KioskVoxel[] {
  const out: KioskVoxel[] = [];
  for (let y = 0; y < N; y++) {
    for (let z = 0; z < N; z++) {
      for (let x = 0; x < N; x++) {
        const surface = x === 0 || z === 0 || x === N - 1 || z === N - 1 || y === N - 1;
        if (surface) out.push({ x, y, z, color: colorAt(x, y, z) });
      }
    }
  }
  return out;
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
