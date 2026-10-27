import * as THREE from 'three';
import {
  HIGH_CONTRAST_BORDER_TEXELS, HIGH_CONTRAST_FILL_ALPHA, HIGH_CONTRAST_FILL_MIX, NEUTRAL_COLOR, ZONE_TINT_ALPHA,
  ZONE_TINT_BORDER_TEXELS,
} from '../shared/config';
import type { Player, PlayerId, Tile, World } from '../shared/types';
import { createCaptureFx } from './captureFx';

/** Texels per tile side. More than 1 so borders are a thin line, not a whole tile. */
export const SUB = 4;
/** How long a freshly taken tile glows, seconds. Visual only, not balance. */
const FLASH_SECONDS = 0.8;
/** Tile fill = player color mixed this much with the neutral ground, so buses stand out. */
const FILL_MIX = 0.45;
/** Border line = player color darkened by this factor. */
const BORDER_DARKEN = 0.75;
/** Zone layer height: under the city ground (render/city.ts, y 0.012), or over it in high contrast. */
const Y_UNDER_CITY = 0.005;
const Y_OVER_CITY = 0.02;
/** Peak blend toward white for a freshly taken tile. */
const FLASH_WHITE = 0.65;
/** A big takeover puffs stink outward over this long, seconds (first to last tile). */
const CAPTURE_SPREAD_S = 0.5;

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
 * `highContrast` (card 036): a see-through fill (unowned tiles fully) and an opaque black border,
 * for a layer drawn over the city ground.
 */
export function paintZones(out: Uint8Array, tiles: readonly Tile[], size: number,
  colorOf: (id: PlayerId) => number | undefined, flash?: Float32Array, highContrast: boolean | 'tint' = false): void {
  const w = size * SUB;
  // 'tint' (card 047): the see-through layer over the city ground, pure player color with
  // thick bright borders, so streets and sidewalks show whose they are.
  const tint = highContrast === 'tint';
  const fillMix = tint ? 0 : highContrast ? HIGH_CONTRAST_FILL_MIX : FILL_MIX;
  const bw = tint ? ZONE_TINT_BORDER_TEXELS : highContrast ? HIGH_CONTRAST_BORDER_TEXELS : 1;
  const fillAlpha = Math.round((tint ? ZONE_TINT_ALPHA : highContrast ? HIGH_CONTRAST_FILL_ALPHA : 1) * 255);
  const ownerAt = (i: number, j: number) => tiles[j * size + i].ownerId;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const idx = j * size + i;
      const owner = tiles[idx].ownerId;
      const hex = owner ? colorOf(owner) : undefined;
      const base = hex === undefined ? NEUTRAL : rgb(hex);
      let fill = hex === undefined ? NEUTRAL : mix(base, NEUTRAL, fillMix);
      let border: Rgb = hex === undefined ? NEUTRAL : tint ? base : highContrast ? [0, 0, 0] : mix(base, [0, 0, 0], 1 - BORDER_DARKEN);
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
          const edge = (si < bw && diffL) || (si >= SUB - bw && diffR)
            || (sj < bw && diffD) || (sj >= SUB - bw && diffU);
          const isBorder = !!(edge && owner);
          const c = isBorder ? border : fill;
          const p = ((j * SUB + sj) * w + (i * SUB + si)) * 4;
          out[p] = c[0];
          out[p + 1] = c[1];
          out[p + 2] = c[2];
          out[p + 3] = isBorder ? 255 : owner ? fillAlpha : highContrast ? 0 : 255;
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
  // Second, see-through layer over the city ground (card 047); only on maps with streets.
  let tintPixels = new Uint8Array(0);
  let tintTexture: THREE.DataTexture | null = null;
  let tintMesh: THREE.Mesh | null = null;
  let lastOwner: (PlayerId | null)[] = [];
  let flash = new Float32Array(0);
  let flashing = false;
  let lastColors = '';
  let lastContrast = false;
  const capture = createCaptureFx(scene);

  function layer(px: Uint8Array): { tex: THREE.DataTexture; m: THREE.Mesh } {
    const w = size * SUB;
    const tex = new THREE.DataTexture(px, w, w, THREE.RGBAFormat);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.flipY = false;
    const geo = new THREE.PlaneGeometry(size, size);
    geo.rotateX(-Math.PI / 2);
    // After rotateX(-90°) the plane's v=0 edge sits at +z; flip v so row 0 is z = 0.
    const uv = geo.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setY(k, 1 - uv.getY(k));
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex }));
    m.position.set(size / 2, Y_UNDER_CITY, size / 2);
    scene.add(m);
    return { tex, m };
  }

  function rebuild(newSize: number, city: boolean) {
    for (const m of [mesh, tintMesh]) {
      if (!m) continue;
      scene.remove(m);
      m.geometry.dispose();
      (m.material as THREE.MeshBasicMaterial).map?.dispose();
      (m.material as THREE.Material).dispose();
    }
    size = newSize;
    const w = size * SUB;
    pixels = new Uint8Array(w * w * 4);
    ({ tex: texture, m: mesh } = layer(pixels));
    tintMesh = null;
    tintTexture = null;
    if (city) {
      tintPixels = new Uint8Array(w * w * 4);
      ({ tex: tintTexture, m: tintMesh } = layer(tintPixels));
      const mat = tintMesh.material as THREE.MeshBasicMaterial;
      mat.transparent = true;
      mat.depthWrite = false;
      tintMesh.position.y = Y_OVER_CITY;
    }
    lastOwner = [];
    flash = new Float32Array(size * size);
  }

  return {
    update(world: World, players: readonly Player[], dt: number, highContrast = false) {
      if (world.size !== size || !mesh) rebuild(world.size, !!world.streets?.length);
      const tiles = world.tiles;
      const colors = new Map<PlayerId, number>(players.map((p) => [p.id, p.color]));
      const colorKey = players.map((p) => `${p.id}:${p.color}`).join(',');

      const first = lastOwner.length !== tiles.length;
      let changed = first || colorKey !== lastColors || highContrast !== lastContrast;
      if (highContrast !== lastContrast || first) {
        const mat = mesh!.material as THREE.MeshBasicMaterial;
        mat.transparent = highContrast;
        mat.depthWrite = !highContrast;
        mat.needsUpdate = true;
        mesh!.position.y = highContrast ? Y_OVER_CITY : Y_UNDER_CITY;
      }
      lastContrast = highContrast;
      // High contrast already draws its own layer over the city; the tint would double it.
      if (tintMesh) tintMesh.visible = !highContrast;
      const taken: number[] = [];
      for (let idx = 0; idx < tiles.length; idx++) {
        const owner = tiles[idx].ownerId;
        if (!first && lastOwner[idx] === owner) continue;
        // Initial split doesn't glow; later changes (jumps, join carve, neutralized) do.
        if (!first && owner) { flash[idx] = 1; flashing = true; taken.push(idx); }
        lastOwner[idx] = owner;
        changed = true;
      }
      // Taken tiles leave green stink. A jump claims the tiles nearest the entry, so ripple
      // the puffs outward from the middle of the taken blob.
      if (taken.length) {
        let cx = 0, cz = 0;
        for (const idx of taken) { cx += idx % size; cz += Math.floor(idx / size); }
        cx /= taken.length;
        cz /= taken.length;
        const dist = taken.map((idx) => Math.hypot(idx % size - cx, Math.floor(idx / size) - cz));
        const far = dist.reduce((a, b) => Math.max(a, b), 1);
        taken.forEach((idx, k) => capture.spawnTile(idx % size, Math.floor(idx / size), (dist[k] / far) * CAPTURE_SPREAD_S));
      }
      capture.update(dt);
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
      paintZones(pixels, tiles, size, (id) => colors.get(id), flash, highContrast);
      texture!.needsUpdate = true;
      if (tintTexture && !highContrast) {
        paintZones(tintPixels, tiles, size, (id) => colors.get(id), flash, 'tint');
        tintTexture.needsUpdate = true;
      }
    },
  };
}
