import * as THREE from 'three';

const STINK_GREEN = 0x8cc846;
/** Voxel side of one particle, tiles. */
const VOXEL = 0.18;
/** Particles per taken tile, and a hard cap so a huge jump doesn't flood the scene. */
const PER_TILE = 2;
const MAX_PARTICLES = 900;
const LIFE_S = 1.3;
const RISE = 1.1;

/**
 * Green stink voxels rising off tiles that just changed owner (a zone takeover). Visual only,
 * lives in world space: tile (i, j) centre is (i + 0.5, j + 0.5).
 */
export function createCaptureFx(scene: THREE.Scene) {
  const mat = new THREE.MeshLambertMaterial({
    color: STINK_GREEN,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(VOXEL, VOXEL, VOXEL), mat, MAX_PARTICLES);
  mesh.frustumCulled = false;
  mesh.count = 0;
  scene.add(mesh);
  const pos = new Float32Array(MAX_PARTICLES * 3);
  const vel = new Float32Array(MAX_PARTICLES * 3);
  const age = new Float32Array(MAX_PARTICLES);
  const life = new Float32Array(MAX_PARTICLES);
  const size = new Float32Array(MAX_PARTICLES);
  const m = new THREE.Matrix4();
  let live = 0;

  return {
    /** Puff green stink off tile (i, j). `delay` staggers big takeovers outward from the entry. */
    spawnTile(i: number, j: number, delay = 0) {
      for (let k = 0; k < PER_TILE && live < MAX_PARTICLES; k++) {
        const p = live * 3;
        pos[p] = i + 0.15 + Math.random() * 0.7;
        pos[p + 1] = 0.05;
        pos[p + 2] = j + 0.15 + Math.random() * 0.7;
        vel[p] = (Math.random() - 0.5) * 0.4;
        vel[p + 1] = RISE * (0.6 + 0.8 * Math.random());
        vel[p + 2] = (Math.random() - 0.5) * 0.4;
        age[live] = -delay - Math.random() * 0.15;
        life[live] = LIFE_S * (0.7 + 0.6 * Math.random());
        size[live] = 0.8 + Math.random() * 0.9;
        live++;
      }
    },
    update(dt: number) {
      for (let i = 0; i < live; i++) {
        age[i] += dt;
        if (age[i] >= life[i]) {
          // Swap the last live particle into this slot.
          live--;
          pos.copyWithin(i * 3, live * 3, live * 3 + 3);
          vel.copyWithin(i * 3, live * 3, live * 3 + 3);
          age[i] = age[live];
          life[i] = life[live];
          size[i] = size[live];
          i--;
          continue;
        }
        const p = i * 3;
        let s = 0;
        if (age[i] > 0) {
          pos[p] += vel[p] * dt;
          pos[p + 1] += vel[p + 1] * dt;
          pos[p + 2] += vel[p + 2] * dt;
          // Pop in, then shrink away as it rises.
          s = size[i] * Math.min(1, age[i] / 0.15) * (1 - age[i] / life[i]);
        }
        mesh.setMatrixAt(i, m.makeScale(s, s, s).setPosition(pos[p], pos[p + 1], pos[p + 2]));
      }
      mesh.count = live;
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
