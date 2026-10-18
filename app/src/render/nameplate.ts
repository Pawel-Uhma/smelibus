import * as THREE from 'three';

const FONT_PX = 48;
const PAD_PX = 14;
/** World height of the label; width follows the text. */
const WORLD_HEIGHT = 0.7;

export interface Nameplate {
  sprite: THREE.Sprite;
  set(name: string, color: number): void;
  dispose(): void;
}

/** Player nick drawn on a canvas sprite, always facing the camera and never hidden behind buildings. */
export function createNameplate(): Nameplate {
  const canvas = document.createElement('canvas');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.renderOrder = 10;
  let key = '';

  return {
    sprite,
    set(name, color) {
      const next = `${name}|${color}`;
      if (next === key) return;
      key = next;
      const ctx = canvas.getContext('2d')!;
      const font = `bold ${FONT_PX}px system-ui, sans-serif`;
      ctx.font = font;
      const w = Math.ceil(ctx.measureText(name).width) + PAD_PX * 2;
      const h = FONT_PX + PAD_PX;
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
      texture.needsUpdate = true;
      sprite.scale.set((WORLD_HEIGHT * w) / h, WORLD_HEIGHT, 1);
    },
    dispose() {
      texture.dispose();
      material.dispose();
    },
  };
}
