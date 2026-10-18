import * as THREE from 'three';
import { BUS_VOXEL_SIZE } from './bus';
import { PEDESTRIAN_VOXELS_Y, pedestrianVoxels, type PedestrianPart } from './pedestrianVoxels';
import { buildVoxelGeometry } from './voxelGeometry';

const FIXED_COLORS: Partial<Record<PedestrianPart, number>> = {
  shoe: 0x202024,
  uniform: 0x2b3448,
  button: 0xffb000,
  skin: 0xf0c39e,
  eye: 0x202024,
  hair: 0x4a3426,
  capBand: 0x202024,
};
/** Only the top of the cap is in the player's colour: it is what the top-down camera sees. */
const PLAYER_PARTS: PedestrianPart[] = ['capTop'];

let geometries: { player: THREE.BufferGeometry; fixed: THREE.BufferGeometry } | null = null;
let fixedMaterial: THREE.MeshLambertMaterial | null = null;

/** Model space like the bus: faces +z, y up, origin at the centre of the body's footprint. */
function buildGeometries() {
  const voxels = pedestrianVoxels();
  const build = (colorOf: (p: PedestrianPart) => THREE.Color | null) =>
    buildVoxelGeometry(
      voxels.map((v) => ({ x: PEDESTRIAN_VOXELS_Y - 1 - v.y, y: v.z, z: v.x, color: colorOf(v.part) })),
      BUS_VOXEL_SIZE,
      // The body is two voxels deep (x 0..1); the cap peak sticks out in front.
      [-PEDESTRIAN_VOXELS_Y / 2, 0, -1],
    );
  const white = new THREE.Color(1, 1, 1);
  return {
    player: build((p) => (PLAYER_PARTS.includes(p) ? white : null)),
    fixed: build((p) => (FIXED_COLORS[p] === undefined ? null : new THREE.Color(FIXED_COLORS[p]))),
  };
}

export interface PedestrianModel {
  group: THREE.Group;
  setColor(hex: number): void;
  dispose(): void;
}

/** One pedestrian (player on foot): two meshes sharing cached geometry, like the bus. */
export function createPedestrianModel(color: number): PedestrianModel {
  geometries ??= buildGeometries();
  fixedMaterial ??= new THREE.MeshLambertMaterial({ vertexColors: true });
  const playerMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, color });
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geometries.player, playerMaterial), new THREE.Mesh(geometries.fixed, fixedMaterial));
  return {
    group,
    setColor(hex) {
      playerMaterial.color.setHex(hex);
    },
    dispose() {
      playerMaterial.dispose();
    },
  };
}
