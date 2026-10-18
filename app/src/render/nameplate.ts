import * as THREE from 'three';

const FONT_PX = 48;
/** World height of the label; width follows the text. */
const WORLD_HEIGHT = 0.9;

export interface Nameplate {
  sprite: THREE.Sprite;
  /** Where the label wants to be (above its bus), before stacking. */
  anchor: THREE.Vector3;
  /** Current shift along the camera's up axis, eased toward the stacked target. */
  lift: number;
  set(name: string, color: number): void;
  dispose(): void;
}

/** Player nick drawn on a canvas sprite, always facing the camera and never hidden behind buildings. */
export function createNameplate(): Nameplate {
  const material = new THREE.SpriteMaterial({ depthTest: false, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.renderOrder = 10;
  let key = '';

  return {
    sprite,
    anchor: new THREE.Vector3(),
    lift: 0,
    set(name, color) {
      const next = `${name}|${color}`;
      if (next === key) return;
      key = next;
      // A fresh canvas and texture each time: the nick length changes with stink, and three.js
      // keeps a texture's GPU storage at its first size, so resizing one in place smears it.
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const font = `bold ${FONT_PX}px system-ui, sans-serif`;
      ctx.font = font;
      // Extra height so accents over capitals (Ć, Ÿ) and tails (ą, ę) stay inside the pill;
      // side padding as wide as the rounded ends, so they never cut the first or last letter.
      const h = Math.ceil(FONT_PX * 1.6);
      const w = Math.ceil(ctx.measureText(name).width) + h;
      canvas.width = w;
      canvas.height = h;
      ctx.font = font;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.roundRect(0, 0, w, h, h / 2);
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
      ctx.fillText(name, w / 2, h / 2 + 2);
      material.map?.dispose();
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      material.map = texture;
      material.needsUpdate = true;
      sprite.scale.set((WORLD_HEIGHT * w) / h, WORLD_HEIGHT, 1);
    },
    dispose() {
      material.map?.dispose();
      material.dispose();
    },
  };
}

const right = new THREE.Vector3();
const up = new THREE.Vector3();

/**
 * Stacks labels that would overlap on screen (buses side by side, rams) one above the other.
 * Works in the camera plane: x along the camera's right axis, y along its up axis.
 * Order is fixed by the caller (bus id), so labels do not swap places while driving.
 */
export function stackNameplates(plates: Nameplate[], camera: THREE.Camera, dt: number) {
  right.setFromMatrixColumn(camera.matrixWorld, 0);
  up.setFromMatrixColumn(camera.matrixWorld, 1);
  const placed: { x: number; y: number; w: number; h: number }[] = [];
  const k = 1 - Math.exp(-dt * 12);
  for (const p of plates) {
    const w = p.sprite.scale.x;
    const h = p.sprite.scale.y;
    const x = p.anchor.dot(right);
    const base = p.anchor.dot(up);
    let y = base;
    for (let moved = true, guard = 0; moved && guard < plates.length; guard++) {
      moved = false;
      for (const q of placed) {
        if (Math.abs(q.x - x) < (q.w + w) / 2 + 0.1 && Math.abs(q.y - y) < (q.h + h) / 2 + 0.05) {
          y = q.y + (q.h + h) / 2 + 0.05;
          moved = true;
        }
      }
    }
    placed.push({ x, y, w, h });
    p.lift += (y - base - p.lift) * k;
    p.sprite.position.copy(p.anchor).addScaledVector(up, p.lift);
  }
}
