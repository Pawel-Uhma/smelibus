import * as THREE from 'three';
import type { Bonus } from '../shared/types';
import { bonusPosition } from '../sim/bonus';
import { BUS_VOXEL_SIZE as VOXEL } from './models/bus';
import { buildVoxelGeometry } from './models/voxelGeometry';

const SHOE = 0x2a2420;
const PANTS = 0x4a4e5a;
const JACKET = 0x7a5c3a;
const SKIN = 0xe8b08e;
const NOSE = 0xc8483c;
const BEANIE = 0x8a8a86;
const STINK_GREEN = 0x8cc846;
/** Seconds the fall-over takes once he reaches his spot. */
const FALL_S = 0.35;
/** Green puffs hovering over a drunk lying on the ground. */
const PUFFS = 5;

export interface ZulVoxel {
  x: number;
  y: number;
  z: number;
  color: number;
}

/** Drunk: 3 wide × 2 deep × 8 high voxels, front at grid z = 1 (red nose). */
export function zulVoxels(): ZulVoxel[] {
  const out: ZulVoxel[] = [];
  for (let y = 0; y < 8; y++) {
    for (let z = 0; z < 2; z++) {
      for (let x = 0; x < 3; x++) {
        let color: number | null;
        if (y === 0) color = x === 1 ? null : SHOE;
        else if (y <= 2) color = x === 1 && y === 1 ? null : PANTS;
        else if (y <= 5) color = JACKET;
        else if (y === 6) color = z === 1 && x === 1 ? NOSE : SKIN;
        else color = BEANIE;
        if (color !== null) out.push({ x, y, z, color });
      }
    }
  }
  return out;
}

/**
 * Żabka drunks (card 019): walk out of the shop swaying, fall on their face, then lie there with
 * a green cloud over them. Positions come from Bonus.walk, so the walk is smooth between snapshots.
 */
export function createZulRender(scene: THREE.Scene) {
  const geo = buildVoxelGeometry(
    zulVoxels().map((v) => ({ ...v, color: new THREE.Color(v.color) })),
    VOXEL,
    [-1.5, 0, -1],
  );
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const puffGeo = new THREE.BoxGeometry(VOXEL * 1.4, VOXEL * 1.4, VOXEL * 1.4);
  const puffMat = new THREE.MeshLambertMaterial({
    color: STINK_GREEN, transparent: true, opacity: 0.6, depthWrite: false,
  });
  const models = new Map<number, { group: THREE.Group; body: THREE.Mesh; puffs: THREE.Mesh[] }>();
  /** Game time, advanced every frame and pulled towards the snapshot time. */
  let clock = 0;

  function model(id: number) {
    let m = models.get(id);
    if (!m) {
      const group = new THREE.Group();
      const body = new THREE.Mesh(geo, mat);
      const puffs = Array.from({ length: PUFFS }, () => new THREE.Mesh(puffGeo, puffMat));
      group.add(body, ...puffs);
      scene.add(group);
      m = { group, body, puffs };
      models.set(id, m);
    }
    return m;
  }

  return {
    update(bonuses: readonly Bonus[], time: number, dt: number) {
      clock += dt;
      if (Math.abs(time - clock) > 0.3) clock = time;
      else clock += (time - clock) * Math.min(1, dt * 5);

      const seen = new Set<number>();
      for (const b of bonuses) {
        if (b.spot !== 'zabka' || !b.active) continue;
        seen.add(b.id);
        const { group, body, puffs } = model(b.id);
        const at = bonusPosition(b, clock);
        group.position.set(at.x, 0, at.z);
        const w = b.walk;
        if (w) group.rotation.y = Math.atan2(b.x - w.x, b.z - w.z);
        const fall = w ? Math.min(1, Math.max(0, (clock - w.until) / FALL_S)) : 1;
        const phase = b.id * 1.3;
        if (fall === 0) {
          // Staggering walk: sway side to side with a little bob.
          body.rotation.set(0, 0, Math.sin(clock * 6 + phase) * 0.25);
          body.position.y = Math.abs(Math.sin(clock * 6 + phase)) * 0.04;
        } else {
          // Face down towards where he was going; an ease-in so it looks like a topple.
          body.rotation.set((Math.PI / 2) * fall * fall, 0, 0);
          body.position.y = 0;
        }
        puffs.forEach((p, k) => {
          p.visible = fall === 1;
          if (!p.visible) return;
          const a = (k / PUFFS) * Math.PI * 2 + clock * 0.8 + phase;
          p.position.set(Math.cos(a) * 0.3, 0.45 + 0.12 * Math.sin(clock * 2 + k), 0.6 + Math.sin(a) * 0.3);
        });
      }
      for (const [id, m] of models) {
        if (seen.has(id)) continue;
        scene.remove(m.group);
        models.delete(id);
      }
    },
  };
}
