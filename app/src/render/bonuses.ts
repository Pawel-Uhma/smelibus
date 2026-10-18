import * as THREE from 'three';
import type { Bonus, BonusKind } from '../shared/types';

/** Placeholder look per bonus kind until there are voxel models: color and box size (tiles). */
const LOOK: Record<BonusKind, { color: number; size: number }> = {
  zul: { color: 0x7a5230, size: 0.55 },
  kebab: { color: 0xd9a05b, size: 0.4 },
  dog: { color: 0x6b4a2b, size: 0.35 },
  fan: { color: 0xf2e9d8, size: 0.4 },
  herring: { color: 0x9fb8c8, size: 0.4 },
  durian: { color: 0xb5c33a, size: 0.5 },
  trash: { color: 0x4a5560, size: 0.5 },
  controller: { color: 0xd23030, size: 0.55 },
  dropped: { color: 0x8cc846, size: 0.35 },
};

const BOB_HEIGHT = 0.15;
const BOB_SPEED = 3;
const SPIN_SPEED = 1.5;

/** Stink bonuses as floating, spinning boxes. Only reads the bonus list. */
export function createBonusesRender(scene: THREE.Scene) {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const materials = new Map<BonusKind, THREE.MeshLambertMaterial>();
  const meshes = new Map<number, THREE.Mesh>();
  let t = 0;

  function material(kind: BonusKind) {
    let m = materials.get(kind);
    if (!m) {
      m = new THREE.MeshLambertMaterial({ color: LOOK[kind].color });
      materials.set(kind, m);
    }
    return m;
  }

  return {
    update(bonuses: readonly Bonus[], dt: number) {
      t += dt;
      const seen = new Set<number>();
      for (const b of bonuses) {
        seen.add(b.id);
        let mesh = meshes.get(b.id);
        if (!mesh) {
          mesh = new THREE.Mesh(geo, material(b.kind));
          scene.add(mesh);
          meshes.set(b.id, mesh);
        }
        mesh.visible = b.active;
        if (!b.active) continue;
        const { size } = LOOK[b.kind];
        mesh.material = material(b.kind);
        mesh.scale.setScalar(size);
        const phase = b.id * 1.7;
        mesh.position.set(b.x, size / 2 + 0.1 + BOB_HEIGHT * (1 + Math.sin(t * BOB_SPEED + phase)), b.z);
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
