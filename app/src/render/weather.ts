import * as THREE from 'three';
import type { WeatherCell, WeatherKind } from '../shared/types';

/** Cloud bottom height, tiles (camera sits at 34, buses are ~1.5 tall). */
export const CLOUD_Y = 6;
const CLOUD_VOXEL = 1.5;
const FADE_S = 2;
/** Fall speed, tiles/s. Cans tumble slower than rain. */
const FALL_SPEED: Record<WeatherKind, number> = { rain: 14, harnas: 6 };
/** Falling things per tile² of cloud area. */
const DENSITY: Record<WeatherKind, number> = { rain: 0.9, harnas: 0.25 };

const LOOK: Record<WeatherKind, { cloud: number; ground: number }> = {
  rain: { cloud: 0x5b6878, ground: 0x3b7bd6 },
  // Foamy beer cloud over an amber puddle.
  harnas: { cloud: 0xf0c75a, ground: 0xd99a1e },
};
/** Low enough that a bus under the cloud stays readable from the camera. */
const CLOUD_OPACITY = 0.3;
const GROUND_OPACITY = 0.3;
/** Share of cloud voxels kept inside the disc; the rim is denser so the edge reads. */
const CLOUD_FILL_INNER = 0.3;
const CLOUD_FILL_RIM = 0.8;
const RAIN_COLOR = 0x5f9cf0;
// Harnaś can: red with a white band.
const CAN_COLORS = [0xc81e2a, 0xf4f4f4];

function hash(a: number, b: number): number {
  let h = Math.imul(a, 73856093) ^ Math.imul(b, 19349663);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return ((h ^ (h >>> 16)) >>> 0) / 2 ** 32;
}

/** 0 → 1 over FADE_S after the cloud appears, back to 0 over FADE_S before it dissolves. */
export function weatherFade(cell: WeatherCell, time: number): number {
  const fadeIn = (time - cell.bornAt) / FADE_S;
  const fadeOut = (cell.endsAt - time) / FADE_S;
  return Math.max(0, Math.min(1, fadeIn, fadeOut));
}

/**
 * Voxel offsets of a cloud, relative to its centre: a dense ragged rim and a sparse middle,
 * so the cloud marks its area without hiding what is under it.
 * Hashed on the cell id so a cloud keeps its shape while it drifts.
 */
export function cloudVoxels(cell: Pick<WeatherCell, 'id' | 'radius'>): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  const n = Math.ceil(cell.radius / CLOUD_VOXEL);
  for (let i = -n; i <= n; i++) {
    for (let k = -n; k <= n; k++) {
      const x = i * CLOUD_VOXEL;
      const z = k * CLOUD_VOXEL;
      const d = Math.hypot(x, z) / cell.radius;
      if (d > 1) continue;
      const h = hash(cell.id * 977 + i, k);
      const rim = d > 0.7;
      if (h > (rim ? CLOUD_FILL_RIM : CLOUD_FILL_INNER)) continue;
      out.push(new THREE.Vector3(x, 0, z));
      if (rim && h < 0.25) out.push(new THREE.Vector3(x, CLOUD_VOXEL, z));
    }
  }
  return out;
}

interface CellView {
  group: THREE.Group;
  cloud: THREE.InstancedMesh;
  cloudMat: THREE.MeshLambertMaterial;
  ground: THREE.Mesh;
  groundMat: THREE.MeshBasicMaterial;
  drops: THREE.InstancedMesh;
  /** Per drop: polar position in the disc and a fall phase. */
  dropSeeds: { r: number; a: number; phase: number }[];
  x: number;
  z: number;
}

/** Rain and Harnaś clouds: voxel cloud, falling drops or cans, tinted ground under it. Only reads state. */
export function createWeatherRender(scene: THREE.Scene) {
  const cube = new THREE.BoxGeometry(CLOUD_VOXEL, CLOUD_VOXEL, CLOUD_VOXEL);
  const drop = new THREE.BoxGeometry(0.1, 0.7, 0.1);
  const can = new THREE.CylinderGeometry(0.16, 0.16, 0.45, 8);
  const rainMat = new THREE.MeshBasicMaterial({ color: RAIN_COLOR, transparent: true, opacity: 0.85 });
  const canMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const views = new Map<number, CellView>();
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  let t = 0;

  function create(cell: WeatherCell): CellView {
    const group = new THREE.Group();
    const voxels = cloudVoxels(cell);
    const cloudMat = new THREE.MeshLambertMaterial({
      color: LOOK[cell.kind].cloud, transparent: true, opacity: 0, depthWrite: false,
    });
    const cloud = new THREE.InstancedMesh(cube, cloudMat, voxels.length);
    voxels.forEach((v, i) => cloud.setMatrixAt(i, m.makeTranslation(v.x, CLOUD_Y + v.y, v.z)));
    cloud.renderOrder = 3;
    group.add(cloud);

    const groundMat = new THREE.MeshBasicMaterial({
      color: LOOK[cell.kind].ground, transparent: true, opacity: 0, depthWrite: false,
    });
    const ground = new THREE.Mesh(new THREE.CircleGeometry(cell.radius, 48), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.06;
    ground.renderOrder = 2;
    group.add(ground);

    const count = Math.round(Math.PI * cell.radius ** 2 * DENSITY[cell.kind]);
    const isCan = cell.kind === 'harnas';
    const drops = new THREE.InstancedMesh(isCan ? can : drop, isCan ? canMat : rainMat, count);
    const dropSeeds = Array.from({ length: count }, (_, i) => ({
      r: Math.sqrt(hash(cell.id, i * 3)) * cell.radius,
      a: hash(cell.id, i * 3 + 1) * Math.PI * 2,
      phase: hash(cell.id, i * 3 + 2),
    }));
    if (isCan) {
      const c = new THREE.Color();
      for (let i = 0; i < count; i++) drops.setColorAt(i, c.setHex(CAN_COLORS[i % 3 === 0 ? 1 : 0]));
    }
    group.add(drops);

    scene.add(group);
    return { group, cloud, cloudMat, ground, groundMat, drops, dropSeeds, x: cell.x, z: cell.z };
  }

  function dispose(v: CellView) {
    scene.remove(v.group);
    v.cloud.dispose();
    v.drops.dispose();
    v.cloudMat.dispose();
    v.groundMat.dispose();
    v.ground.geometry.dispose();
  }

  return {
    /** `time` is the game time of the snapshot the cells come from (for fading). */
    update(cells: readonly WeatherCell[], time: number, dt: number) {
      t += dt;
      const seen = new Set<number>();
      for (const cell of cells) {
        seen.add(cell.id);
        let v = views.get(cell.id);
        if (!v) views.set(cell.id, (v = create(cell)));
        // Snapshots come at 20 Hz; ease toward them so the cloud glides.
        const k = 1 - Math.exp(-dt * 5);
        v.x += (cell.x - v.x) * k;
        v.z += (cell.z - v.z) * k;
        v.group.position.set(v.x, 0, v.z);

        const fade = weatherFade(cell, time);
        v.cloudMat.opacity = CLOUD_OPACITY * fade;
        v.groundMat.opacity = GROUND_OPACITY * fade;

        const isCan = cell.kind === 'harnas';
        const fall = FALL_SPEED[cell.kind];
        const shown = Math.round(v.dropSeeds.length * fade);
        v.drops.count = shown;
        for (let i = 0; i < shown; i++) {
          const s = v.dropSeeds[i];
          const y = CLOUD_Y - ((t * fall / CLOUD_Y + s.phase) % 1) * CLOUD_Y;
          p.set(Math.cos(s.a) * s.r, y, Math.sin(s.a) * s.r);
          if (isCan) q.setFromEuler(e.set(t * 3 + s.phase * 7, s.phase * 6, t * 2 + s.phase * 5));
          else q.identity();
          v.drops.setMatrixAt(i, m.compose(p, q, one));
        }
        v.drops.instanceMatrix.needsUpdate = true;
      }
      for (const [id, v] of views) {
        if (seen.has(id)) continue;
        dispose(v);
        views.delete(id);
      }
    },
  };
}
