import * as THREE from 'three';
import type { Bonus } from '../shared/types';
import { bonusGeometry } from './bonusModels';

const BOB_HEIGHT = 0.15;
const BOB_SPEED = 3;
const SPIN_SPEED = 1.5;

/** Stink bonuses as floating, spinning voxel models. Only reads the bonus list. */
export function createBonusesRender(scene: THREE.Scene) {
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const meshes = new Map<number, THREE.Mesh>();
  let t = 0;

  return {
    update(bonuses: readonly Bonus[], dt: number) {
      t += dt;
      const seen = new Set<number>();
      for (const b of bonuses) {
        // Żabka drunks walk and fall over: render/zul.ts draws them.
        if (b.spot === 'zabka') continue;
        seen.add(b.id);
        let mesh = meshes.get(b.id);
        if (!mesh) {
          mesh = new THREE.Mesh(bonusGeometry(b.kind), material);
          scene.add(mesh);
          meshes.set(b.id, mesh);
        }
        mesh.visible = b.active;
        if (!b.active) continue;
        // A bonus spot can change kind on respawn.
        mesh.geometry = bonusGeometry(b.kind);
        const phase = b.id * 1.7;
        mesh.position.set(b.x, 0.05 + BOB_HEIGHT * (1 + Math.sin(t * BOB_SPEED + phase)), b.z);
        mesh.rotation.y = t * SPIN_SPEED + phase;
      }
      for (const [id, mesh] of meshes) {
        if (seen.has(id)) continue;
        scene.remove(mesh);
        meshes.delete(id);
      }
    },
  };
}
