import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CITY_STREETS, STREETLIGHT_GLOW, STREETLIGHT_POOL_R, STREETLIGHT_STEP } from '../shared/config';
import type { World } from '../shared/types';

const POLE = 0x4a4f57;
const BULB = 0xffd27a;
const POOL = 0xffb54d;
const POLE_H = 2.2;
/** Arm length over the road, tiles. */
const ARM = 0.55;
/** Lamp foot sits this far outside the carriageway edge. */
const CURB = 0.2;

export interface StreetlightSpot {
  x: number;
  z: number;
  /** Unit direction from the foot toward the road, where the arm and the light point. */
  dx: number;
  dz: number;
}

/**
 * Lamps along both kerbs of every street, sides staggered by half a step, none inside junctions
 * or on building tiles. Looks only: the sim doesn't know about them, buses drive through.
 */
export function streetlightSpots(world: World): StreetlightSpot[] {
  const { size, tiles } = world;
  const out: StreetlightSpot[] = [];
  for (const s of world.streets ?? []) {
    const p = CITY_STREETS[s.kind];
    const len = Math.hypot(s.bx - s.ax, s.bz - s.az);
    if (!len) continue;
    const ux = (s.bx - s.ax) / len, uz = (s.bz - s.az) / len;
    const off = p.median + p.road + CURB;
    for (const side of [1, -1]) {
      // Normal (-uz, ux) points to side 1; the lamp looks back at the road.
      const nx = -uz * side, nz = ux * side;
      const first = s.trimA + 1 + (side === 1 ? 0 : STREETLIGHT_STEP / 2);
      for (let t = first; t < len - s.trimB - 1; t += STREETLIGHT_STEP) {
        const x = s.ax + ux * t + nx * off, z = s.az + uz * t + nz * off;
        if (x < 0.5 || z < 0.5 || x > size - 0.5 || z > size - 0.5) continue;
        if (tiles[Math.floor(z) * size + Math.floor(x)]?.kind === 'building') continue;
        out.push({ x, z, dx: -nx, dz: -nz });
      }
    }
  }
  return out;
}

const placeAll = (mesh: THREE.InstancedMesh, spots: StreetlightSpot[], y = 0) => {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const one = new THREE.Vector3(1, 1, 1);
  spots.forEach((sp, i) => {
    // Local +x is the arm, turned toward the road.
    q.setFromAxisAngle(up, Math.atan2(-sp.dz, sp.dx));
    m.compose(new THREE.Vector3(sp.x, y, sp.z), q, one);
    mesh.setMatrixAt(i, m);
  });
  return mesh;
};

/** Poles with their arm and lamp head, there day and night. */
export function createStreetlightPoles(scene: THREE.Scene, world: World): void {
  const spots = streetlightSpots(world);
  if (!spots.length) return;
  const geo = mergeGeometries([
    new THREE.BoxGeometry(0.1, POLE_H, 0.1).translate(0, POLE_H / 2, 0),
    new THREE.BoxGeometry(ARM, 0.07, 0.07).translate(ARM / 2, POLE_H - 0.03, 0),
    new THREE.BoxGeometry(0.34, 0.1, 0.2).translate(ARM, POLE_H - 0.05, 0),
  ]);
  scene.add(placeAll(new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: POLE }), spots.length), spots));
}

/**
 * Night side of the lamps: the bulb under each head and a warm pool of light on the ground.
 * No real lights (hundreds would kill the frame rate), just additive glow scaled by darkness `k`.
 */
export function createStreetlightGlow(root: THREE.Object3D, world: World, glowTex: THREE.Texture) {
  const spots = streetlightSpots(world);
  const bulbMat = new THREE.MeshBasicMaterial({ color: BULB, transparent: true, opacity: 0 });
  const poolMat = new THREE.MeshBasicMaterial({
    map: glowTex, color: POOL, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  if (spots.length) {
    const bulbs = placeAll(new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.26, 0.04, 0.14).translate(ARM, POLE_H - 0.11, 0), bulbMat, spots.length), spots);
    const d = STREETLIGHT_POOL_R * 2;
    // The pool falls a bit toward the road, under the head.
    const pools = placeAll(new THREE.InstancedMesh(
      new THREE.PlaneGeometry(d, d).rotateX(-Math.PI / 2).translate(ARM, 0, 0), poolMat, spots.length), spots, 0.035);
    pools.renderOrder = 4;
    for (const mesh of [bulbs, pools]) {
      mesh.userData.nightUnlit = true;
      root.add(mesh);
    }
  }
  return {
    /** Darkness 0 (day) .. 1 (night). */
    set(k: number) {
      bulbMat.opacity = k;
      poolMat.opacity = STREETLIGHT_GLOW * k;
    },
  };
}
