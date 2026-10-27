import * as THREE from 'three';
import { STINK_LOOK_MAX, STINK_STAGE_LIMITS } from '../shared/config';
import type { Bus } from '../shared/types';
import { BUS_VOXEL_SIZE, stinkStage } from './models/bus';
import { BUS_VOXELS_X, BUS_VOXELS_Y, BUS_VOXELS_Z } from './models/busVoxels';

// Bus voxel model (render/models): length × width × height, front is +z in model space.
const MODEL_L = BUS_VOXELS_X;
const MODEL_W = BUS_VOXELS_Y;
const MODEL_H = BUS_VOXELS_Z;
export const VOXEL = BUS_VOXEL_SIZE;
/** Stink above which the bus "zalatuje" (puffs) and is a "durian" (cloud), same as the model's stages. */
const SMELLY_FROM = STINK_STAGE_LIMITS[0];
const DURIAN_FROM = STINK_STAGE_LIMITS[1];

const STINK_GREEN = 0x8cc846;
/** The durian cloud reaches this many voxels out from the bus body. */
export const CLOUD_REACH = 3;
const CLOUD_OPACITY = 0.4;
/** Share of cloud cells shown at the start of the durian stage and at STINK_MAX. */
export const CLOUD_FILL_MIN = 0.1;
export const CLOUD_FILL_MAX = 0.45;
/** Puffs per second per bus at the start of the smelly stage and at STINK_MAX. */
const PUFF_RATE_MIN = 1.5;
const PUFF_RATE_MAX = 5;
const PUFF_LIFE_S = 1.6;
const PUFF_RISE = 0.9;
const MAX_PUFFS = 400;

function progress(stink: number, limit: number) {
  return Math.min(1, Math.max(0, (stink - limit) / (STINK_LOOK_MAX - limit)));
}

/** Share of cloud cells shown: 0 below stage 2 (durian), then growing with stink. */
export function cloudFill(stink: number): number {
  if (stinkStage(stink) < 2) return 0;
  return CLOUD_FILL_MIN + (CLOUD_FILL_MAX - CLOUD_FILL_MIN) * progress(stink, DURIAN_FROM);
}

/** Puffs per second from the exhaust and roof: 0 while the bus is clean (stage 0). */
export function puffRate(stink: number): number {
  if (stinkStage(stink) < 1) return 0;
  return PUFF_RATE_MIN + (PUFF_RATE_MAX - PUFF_RATE_MIN) * progress(stink, SMELLY_FROM);
}

function hash3(i: number, j: number, k: number): number {
  let h = Math.imul(i, 73856093) ^ Math.imul(j, 19349663) ^ Math.imul(k, 83492791);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return ((h ^ (h >>> 16)) >>> 0) / 2 ** 32;
}

/** Distance of cell v from the range [0, n) along one axis. */
function outside(v: number, n: number) {
  return v < 0 ? -v : v >= n ? v - n + 1 : 0;
}

export interface CloudCell {
  /** Voxel centre in bus-local tiles: bus centre on the ground, front +z. */
  x: number;
  y: number;
  z: number;
  /** Voxels away from the bus body (1..CLOUD_REACH). */
  dist: number;
}

/**
 * Cells around the bus body, in the order they fill in as stink grows: hash-shuffled, nearer
 * ones first. Showing a prefix of this list keeps the cloud stable (no flicker on stink changes).
 */
export function cloudCells(): CloudCell[] {
  const cells: (CloudCell & { key: number })[] = [];
  const r = CLOUD_REACH;
  for (let i = -r; i < MODEL_L + r; i++) {
    for (let j = -r; j < MODEL_W + r; j++) {
      for (let k = 0; k < MODEL_H + r; k++) {
        const dist = Math.max(outside(i, MODEL_L), outside(j, MODEL_W), outside(k, MODEL_H));
        if (dist === 0) continue;
        cells.push({
          x: (j - (MODEL_W - 1) / 2) * VOXEL,
          y: (k + 0.5) * VOXEL,
          z: (i - (MODEL_L - 1) / 2) * VOXEL,
          dist,
          key: hash3(i, j, k) + (dist - 1) * 0.6,
        });
      }
    }
  }
  cells.sort((a, b) => a.key - b.key);
  return cells.map(({ x, y, z, dist }) => ({ x, y, z, dist }));
}

/** Green stink around buses (card 009): puffs from stage 1, plus a voxel cloud at stage 2. */
export function createStinkEffect(scene: THREE.Scene) {
  const box = new THREE.BoxGeometry(VOXEL, VOXEL, VOXEL);
  const cloudMat = new THREE.MeshLambertMaterial({
    color: STINK_GREEN,
    transparent: true,
    opacity: CLOUD_OPACITY,
    depthWrite: false,
  });
  const puffMat = new THREE.MeshLambertMaterial({
    color: STINK_GREEN,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });
  const cells = cloudCells();
  const m = new THREE.Matrix4();

  const buses = new Map<number, { cloud: THREE.InstancedMesh; puffAcc: number }>();

  function busFx(id: number) {
    let fx = buses.get(id);
    if (!fx) {
      const cloud = new THREE.InstancedMesh(box, cloudMat, cells.length);
      cells.forEach((c, i) => cloud.setMatrixAt(i, m.makeTranslation(c.x, c.y, c.z)));
      cloud.computeBoundingSphere();
      scene.add(cloud);
      fx = { cloud, puffAcc: 0 };
      buses.set(id, fx);
    }
    return fx;
  }

  // Puffs live in world space, so a moving bus leaves a short trail.
  const puffs = new THREE.InstancedMesh(box, puffMat, MAX_PUFFS);
  puffs.frustumCulled = false;
  puffs.count = 0;
  scene.add(puffs);
  const pos = new Float32Array(MAX_PUFFS * 3);
  const vel = new Float32Array(MAX_PUFFS * 3);
  const age = new Float32Array(MAX_PUFFS);
  const size = new Float32Array(MAX_PUFFS);
  let live = 0;

  function spawnPuff(bus: Bus) {
    if (live >= MAX_PUFFS) return;
    let lx: number, ly: number, lz: number, push: number;
    if (Math.random() < 0.5) {
      // Exhaust pipe: rear left, low.
      lx = 1.5 * VOXEL;
      ly = 1.5 * VOXEL;
      lz = -(MODEL_L / 2 + 0.5) * VOXEL;
      push = -0.6;
    } else {
      lx = (Math.random() - 0.5) * MODEL_W * VOXEL;
      ly = (MODEL_H + 0.5) * VOXEL;
      lz = (Math.random() - 0.5) * MODEL_L * VOXEL;
      push = 0;
    }
    const cos = Math.cos(bus.angle);
    const sin = Math.sin(bus.angle);
    const p = live * 3;
    pos[p] = bus.x + lx * cos + lz * sin;
    pos[p + 1] = ly;
    pos[p + 2] = bus.z - lx * sin + lz * cos;
    vel[p] = push * sin + (Math.random() - 0.5) * 0.3;
    vel[p + 1] = PUFF_RISE * (0.7 + 0.6 * Math.random());
    vel[p + 2] = push * cos + (Math.random() - 0.5) * 0.3;
    age[live] = 0;
    size[live] = 1 + Math.random() * 0.8;
    live++;
  }

  function stepPuffs(dt: number) {
    for (let i = 0; i < live; i++) {
      age[i] += dt;
      if (age[i] >= PUFF_LIFE_S) {
        // Swap the last live puff into this slot.
        live--;
        pos.copyWithin(i * 3, live * 3, live * 3 + 3);
        vel.copyWithin(i * 3, live * 3, live * 3 + 3);
        age[i] = age[live];
        size[i] = size[live];
        i--;
        continue;
      }
      const p = i * 3;
      pos[p] += vel[p] * dt;
      pos[p + 1] += vel[p + 1] * dt;
      pos[p + 2] += vel[p + 2] * dt;
      // Pop in quickly, shrink away slowly.
      const s = size[i] * Math.min(1, age[i] / 0.2) * (1 - age[i] / PUFF_LIFE_S);
      puffs.setMatrixAt(i, m.makeScale(s, s, s).setPosition(pos[p], pos[p + 1], pos[p + 2]));
    }
    puffs.count = live;
    puffs.instanceMatrix.needsUpdate = true;
  }

  let time = 0;

  return {
    /** Call once per frame with the buses as drawn (same positions as their meshes). */
    update(list: Bus[], dt: number) {
      time += dt;
      const seen = new Set<number>();
      for (const bus of list) {
        seen.add(bus.id);
        const fx = busFx(bus.id);
        fx.cloud.count = Math.round(cells.length * cloudFill(bus.stink));
        fx.cloud.visible = fx.cloud.count > 0;
        // Slow bobbing so the cloud doesn't look glued to the bus.
        fx.cloud.position.set(bus.x, Math.sin(time * 2 + bus.id) * 0.04, bus.z);
        fx.cloud.rotation.y = bus.angle;
        fx.puffAcc += puffRate(bus.stink) * dt;
        while (fx.puffAcc >= 1) {
          fx.puffAcc -= 1;
          spawnPuff(bus);
        }
      }
      for (const [id, fx] of buses) {
        if (seen.has(id)) continue;
        scene.remove(fx.cloud);
        fx.cloud.dispose();
        buses.delete(id);
      }
      stepPuffs(dt);
    },
  };
}
