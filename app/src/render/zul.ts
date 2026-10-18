import * as THREE from 'three';
import type { Bonus } from '../shared/types';
import { bonusPosition } from '../sim/bonus';
import { BONUS_VOXEL_SIZE as VOXEL, bonusGeometry } from './bonusModels';

const STINK_GREEN = 0x8cc846;
/** Seconds the fall-over takes once he reaches his spot. */
const FALL_S = 0.35;
/** Green puffs hovering over a drunk lying on the ground. */
const PUFFS = 5;

/**
 * Żabka drunks (card 019): walk out of the shop swaying, fall on their face, then lie there with
 * a green cloud over them. Positions come from Bonus.walk, so the walk is smooth between snapshots.
 */
export function createZulRender(scene: THREE.Scene) {
  // Same drunk as on bus stops (render/bonusModels.ts): front +z, origin at the feet.
  const geo = bonusGeometry('zul');
  geo.computeBoundingBox();
  const height = geo.boundingBox!.max.y;
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const puffGeo = new THREE.BoxGeometry(VOXEL * 2, VOXEL * 2, VOXEL * 2);
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
          p.position.set(Math.cos(a) * 0.35, 0.6 + 0.12 * Math.sin(clock * 2 + k), height / 2 + Math.sin(a) * 0.4);
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
