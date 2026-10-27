import * as THREE from 'three';
import type { Bonus } from '../shared/types';
import { bonusPosition } from '../sim/bonus';
import {
  CONTROLLER_FRAMES, bonusGeometry, controllerStepGeometry, trashKnockedGeometry, zulGeometry, zulVariant,
} from './bonusModels';

const BOB_HEIGHT = 0.15;
const BOB_SPEED = 3;
const SPIN_SPEED = 1.5;
/** Walk cycle: one frame per this many tiles walked. */
const STEP_LENGTH = 0.18;

/** Stink bonuses as voxel models: pickups float and spin, street furniture and people stay grounded. Only reads the bonus list. */
export function createBonusesRender(scene: THREE.Scene) {
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const meshes = new Map<number, THREE.Mesh>();
  let t = 0;
  let clock = 0;

  return {
    update(bonuses: readonly Bonus[], dt: number, serverTime = 0) {
      t += dt;
      // Snapshots tick the server time 20× a second; walk on a smooth local clock that follows it.
      clock = Math.abs(clock + dt - serverTime) > 0.3 ? serverTime : clock + dt + (serverTime - clock - dt) * 0.1;
      const time = clock;
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
        // A trash can stays on the kerb (card 045): knocked over until it respawns.
        if (b.kind === 'trash') {
          mesh.visible = true;
          mesh.geometry = b.active ? bonusGeometry('trash') : trashKnockedGeometry();
          mesh.position.set(b.x, 0, b.z);
          mesh.rotation.y = b.id * 1.7;
          continue;
        }
        mesh.visible = b.active;
        if (!b.active) continue;
        // The ticket controller walks the sidewalk (card 044), facing where he goes.
        if (b.kind === 'controller' && b.patrol) {
          const at = bonusPosition(b, time);
          const ahead = bonusPosition(b, time + 0.05);
          mesh.geometry = controllerStepGeometry(Math.floor((time * b.patrol.speed) / STEP_LENGTH) % CONTROLLER_FRAMES);
          mesh.position.set(at.x, 0, at.z);
          if (ahead.x !== at.x || ahead.z !== at.z) mesh.rotation.y = Math.atan2(ahead.x - at.x, ahead.z - at.z);
          continue;
        }
        // A bonus spot can change kind on respawn.
        const zul = b.kind === 'zul';
        mesh.geometry = zul ? zulGeometry(zulVariant(b.id), 'rest') : bonusGeometry(b.kind);
        const phase = b.id * 1.7;
        if (zul) {
          // A drunk sits or lies still (GAME_DESIGN: Żul spod Żabki), no bobbing or spinning.
          mesh.position.set(b.x, 0, b.z);
          mesh.rotation.y = phase;
          continue;
        }
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
