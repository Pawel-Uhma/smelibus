import * as THREE from 'three';
import { NEUTRAL_COLOR } from '../shared/config';
import type { Player, PlayerId, Tile, World } from '../shared/types';

/** Texels per tile side. More than 1 so borders are a thin line, not a whole tile. */
export const SUB = 4;
/** How long a freshly taken tile glows, seconds. Visual only, not balance. */
const FLASH_SECONDS = 0.8;
/** Tile fill = player color mixed this much with the neutral ground, so buses stand out. */
const FILL_MIX = 0.45;
/** Border line = player color darkened by this factor. */
const BORDER_DARKEN = 0.75;
/** Peak blend toward white for a freshly taken tile. */
const FLASH_WHITE = 0.65;

type Rgb = [number, number, number];

const rgb = (hex: number): Rgb => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
const mix = (a: Rgb, b: Rgb, k: number): Rgb => [
  a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k,
];
const NEUTRAL = rgb(NEUTRAL_COLOR);
const WHITE: Rgb = [255, 255, 255];

/**
 * Pure painter: writes RGBA texels (size*SUB square, row = z) for the given tiles.
 * Each tile is filled with its owner's color; texels on a tile edge that touches a
 * different owner are drawn darker (the border). `flash[idx]` in 0..1 blends toward white.
 */
export function paintZones(out: Uint8Array, tiles: readonly Tile[], size: number,
  colorOf: (id: PlayerId) => number | undefined, flash?: Float32Array): void {
  const w = size * SUB;
  const ownerAt = (i: number, j: number) => tiles[j * size + i].ownerId;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const idx = j * size + i;
      const owner = tiles[idx].ownerId;
      const hex = owner ? colorOf(owner) : undefined;
      const base = hex === undefined ? NEUTRAL : rgb(hex);
      let fill = hex === undefined ? NEUTRAL : mix(base, NEUTRAL, FILL_MIX);
      let border = hex === undefined ? NEUTRAL : mix(base, [0, 0, 0], 1 - BORDER_DARKEN);
      const f = flash ? flash[idx] : 0;
      if (f > 0) {
        fill = mix(fill, WHITE, f * FLASH_WHITE);
        border = mix(border, WHITE, f * FLASH_WHITE);
      }
      const diffL = i > 0 && ownerAt(i - 1, j) !== owner;
      const diffR = i < size - 1 && ownerAt(i + 1, j) !== owner;
      const diffD = j > 0 && ownerAt(i, j - 1) !== owner;
      const diffU = j < size - 1 && ownerAt(i, j + 1) !== owner;
      for (let sj = 0; sj < SUB; sj++) {
        for (let si = 0; si < SUB; si++) {
          const edge = (si === 0 && diffL) || (si === SUB - 1 && diffR)
            || (sj === 0 && diffD) || (sj === SUB - 1 && diffU);
          const c = edge && owner ? border : fill;
          const p = ((j * SUB + sj) * w + (i * SUB + si)) * 4;
          out[p] = c[0];
          out[p + 1] = c[1];
          out[p + 2] = c[2];
          out[p + 3] = 255;
        }
      }
    }
  }
}

/**
 * Zone overlay: a flat plane over the ground, colored per tile owner, with borders
 * and a short glow on tiles that just changed owner. Only reads the world.
 */
export function createZonesRender(scene: THREE.Scene) {
  let size = 0;
  let pixels = new Uint8Array(0);
  let texture: THREE.DataTexture | null = null;
  let mesh: THREE.Mesh | null = null;
  let lastOwner: (PlayerId | null)[] = [];
  let flash = new Float32Array(0);
  let flashing = false;
  let lastColors = '';

  function rebuild(newSize: number) {
    if (mesh) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      texture?.dispose();
    }
    size = newSize;
    const w = size * SUB;
    pixels = new Uint8Array(w * w * 4);
    texture = new THREE.DataTexture(pixels, w, w, THREE.RGBAFormat);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.flipY = false;
    const geo = new THREE.PlaneGeometry(size, size);
    geo.rotateX(-Math.PI / 2);
    // After rotateX(-90°) the plane's v=0 edge sits at +z; flip v so row 0 is z = 0.
    const uv = geo.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setY(k, 1 - uv.getY(k));
    mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: texture }));
    mesh.position.set(size / 2, 0.005, size / 2);
    scene.add(mesh);
    lastOwner = [];
    flash = new Float32Array(size * size);
  }

  return {
    update(world: World, players: readonly Player[], dt: number) {
      if (world.size !== size || !mesh) rebuild(world.size);
      const tiles = world.tiles;
      const colors = new Map<PlayerId, number>(players.map((p) => [p.id, p.color]));
      const colorKey = players.map((p) => `${p.id}:${p.color}`).join(',');

      const first = lastOwner.length !== tiles.length;
      let changed = first || colorKey !== lastColors;
      for (let idx = 0; idx < tiles.length; idx++) {
        const owner = tiles[idx].ownerId;
        if (!first && lastOwner[idx] === owner) continue;
        // Initial split doesn't glow; later changes (jumps, join carve, neutralized) do.
        if (!first && owner) { flash[idx] = 1; flashing = true; }
        lastOwner[idx] = owner;
        changed = true;
      }
      if (flashing) {
        flashing = false;
        const decay = dt / FLASH_SECONDS;
        for (let idx = 0; idx < flash.length; idx++) {
          if (flash[idx] <= 0) continue;
          flash[idx] = Math.max(0, flash[idx] - decay);
          flashing = true;
        }
        changed = true;
      }
      lastColors = colorKey;
      if (!changed) return;
      paintZones(pixels, tiles, size, (id) => colors.get(id), flash);
      texture!.needsUpdate = true;
    },
  };
}
