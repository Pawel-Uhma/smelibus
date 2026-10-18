import * as THREE from 'three';
import type { World } from '../shared/types';

const ROAD_COLOR = 0x3a3d44;
/** Roads are a translucent layer over the zone colors, so ownership still reads on streets. */
const ROAD_OPACITY = 0.55;
const BUILDING_COLORS = [0xe8dcc4, 0xd6c3a0, 0xc9b8a8, 0xb9c4cc, 0xe0b8a0, 0xcfd6c4];
const ROOF_DARKEN = 0.8;
const TREE_TRUNK = 0x7a5232;
const TREE_CROWN = 0x3f8f3a;
/** One tree per this many park tiles (pattern, not random: render must not touch sim rng). */
const TREE_EVERY = 3;

/** Static city meshes from World.tiles kinds. Read-only on the world, built once. */
export function createCityRender(scene: THREE.Scene, world: World): void {
  const { size, tiles } = world;
  const at = (idx: number) => ({ x: idx % size, z: Math.floor(idx / size) });
  const m = new THREE.Matrix4();
  const color = new THREE.Color();

  const roads = tiles.flatMap((t, idx) => (t.kind === 'road' ? [idx] : []));
  const roadMesh = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: ROAD_COLOR, transparent: true, opacity: ROAD_OPACITY, depthWrite: false }),
    roads.length,
  );
  roads.forEach((idx, k) => {
    const { x, z } = at(idx);
    roadMesh.setMatrixAt(k, m.makeTranslation(x + 0.5, 0.01, z + 0.5));
  });
  scene.add(roadMesh);

  // Buildings: one box per tile, so lots of any shape work; a lot shares one color by height+lot seed.
  const buildings = tiles.flatMap((t, idx) => (t.kind === 'building' ? [idx] : []));
  const boxGeo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  // Roofs a shade darker than walls: color the top face's vertices.
  const shade = new Float32Array(boxGeo.attributes.position.count * 3).fill(1);
  const pos = boxGeo.attributes.position;
  for (let v = 0; v < pos.count; v++) {
    if (pos.getY(v) > 0.99 && boxGeo.attributes.normal.getY(v) > 0.5) shade.fill(ROOF_DARKEN, v * 3, v * 3 + 3);
  }
  boxGeo.setAttribute('color', new THREE.BufferAttribute(shade, 3));
  const buildingMesh = new THREE.InstancedMesh(
    boxGeo, new THREE.MeshLambertMaterial({ vertexColors: true }), buildings.length,
  );
  buildings.forEach((idx, k) => {
    const { x, z } = at(idx);
    const h = tiles[idx].height ?? 1;
    buildingMesh.setMatrixAt(k, m.makeScale(1, h, 1).setPosition(x + 0.5, 0, z + 0.5));
    // Neighbouring tiles of one lot share a height, so color by height keeps a lot uniform.
    buildingMesh.setColorAt(k, color.setHex(BUILDING_COLORS[(h * 7 + Math.floor(world.seed)) % BUILDING_COLORS.length]));
  });
  scene.add(buildingMesh);

  const parks = tiles.flatMap((t, idx) => (t.kind === 'park' ? [idx] : []))
    .filter((idx) => { const { x, z } = at(idx); return (x + 2 * z) % TREE_EVERY === 0; });
  const trunk = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.2, 0.6, 0.2).translate(0, 0.3, 0),
    new THREE.MeshLambertMaterial({ color: TREE_TRUNK }), parks.length,
  );
  const crown = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.7, 0.7, 0.7).translate(0, 0.95, 0),
    new THREE.MeshLambertMaterial({ color: TREE_CROWN }), parks.length,
  );
  parks.forEach((idx, k) => {
    const { x, z } = at(idx);
    m.makeTranslation(x + 0.5, 0, z + 0.5);
    trunk.setMatrixAt(k, m);
    crown.setMatrixAt(k, m);
  });
  scene.add(trunk, crown);
}
