import * as THREE from 'three';
import type { World } from '../shared/types';
import { BUS_VOXEL_SIZE as VOXEL } from './models/bus';

// InPost parcel locker, same voxel size as the bus: W wide, D deep, H high (≈ the sim box in
// sim/paczkomat.ts). Local space: footprint centred on the origin, locker doors face +z, y up.
const W = 5;
const D = 2;
const H = 6;
const BODY = 0xffcd00;
const CAP = 0x2b2b2b;
const DOOR_A = 0x8a8a8a;
const DOOR_B = 0x6b6b6b;
const SCREEN = 0x1d2b3a;

export interface LockerVoxel {
  x: number;
  y: number;
  z: number;
  color: number;
}

function colorAt(x: number, y: number, z: number): number {
  if (y === H - 1) return x === 0 || x === W - 1 ? CAP : BODY;
  if (z !== D - 1 || y === 0) return BODY;
  if (x === 2 && y === 3) return SCREEN;
  return (x + y) % 2 === 0 ? DOOR_A : DOOR_B;
}

/** Voxels of one locker (grid coords x 0..W-1, y 0..H-1, z 0..D-1) with their colors. */
export function lockerVoxels(): LockerVoxel[] {
  const out: LockerVoxel[] = [];
  for (let y = 0; y < H; y++) for (let z = 0; z < D; z++) for (let x = 0; x < W; x++) {
    out.push({ x, y, z, color: colorAt(x, y, z) });
  }
  return out;
}

/** Static InPost lockers from world.paczkomats. Read-only on the world, built once. */
export function createPaczkomatRender(scene: THREE.Scene, world: World): void {
  const lockers = world.paczkomats ?? [];
  if (lockers.length === 0) return;
  const voxels = lockerVoxels();
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(VOXEL, VOXEL, VOXEL),
    new THREE.MeshLambertMaterial(),
    voxels.length * lockers.length,
  );
  const local = new THREE.Matrix4();
  const place = new THREE.Matrix4();
  const color = new THREE.Color();
  let k = 0;
  for (const p of lockers) {
    place.makeRotationY(Math.atan2(p.fx, p.fz)).setPosition(p.x, 0, p.z);
    for (const v of voxels) {
      local.makeTranslation((v.x - (W - 1) / 2) * VOXEL, (v.y + 0.5) * VOXEL, (v.z - (D - 1) / 2) * VOXEL);
      mesh.setMatrixAt(k, local.premultiply(place));
      mesh.setColorAt(k, color.setHex(v.color));
      k++;
    }
  }
  mesh.computeBoundingSphere();
  scene.add(mesh);
}
