import {
  BORDER_ARROW_MARGIN_PX, MINIMAP_BUILDING_SHADE, MINIMAP_BUS_DOT, MINIMAP_CLOUD_ALPHA, MINIMAP_OWN_BUS_DOT,
  MINIMAP_PEDESTRIAN_DOT, MINIMAP_SIZE_PX, MINIMAP_SIZE_TOUCH_PX, NEUTRAL_COLOR,
} from '../shared/config';
import type { Bus, Player, PlayerId, WeatherCell, World } from '../shared/types';
import { cssColor } from './hudModel';
import { borderTiles, edgeArrow, nearestOf, toMinimap } from './minimapModel';
import './minimap.css';

export interface MinimapView {
  world: World;
  players: Player[];
  buses: Bus[];
  weather: WeatherCell[];
  /** World point → canvas CSS px, null behind the camera (render/scene.ts toScreen). */
  toScreen(x: number, y: number, z: number): { x: number; y: number } | null;
}

const UNKNOWN_COLOR = 0x9a9a9a;
const CLOUD_COLORS = { rain: '#3b82f6', harnas: '#f0a020' } as const;

/**
 * Minimap in a HUD corner (2D canvas, card 030) plus an arrow at the screen edge pointing to
 * the nearest border of the player's own zone when no border is on screen. Only reads the view.
 * Tiles go through a size × size ImageData that is rebuilt only when an owner or color changes.
 */
export function createMinimap(root: HTMLElement, me: PlayerId) {
  const wrap = document.createElement('div');
  wrap.className = 'minimap';
  wrap.style.setProperty('--mm', `${MINIMAP_SIZE_PX}px`);
  wrap.style.setProperty('--mm-touch', `${MINIMAP_SIZE_TOUCH_PX}px`);
  const canvas = document.createElement('canvas');
  wrap.append(canvas);
  const arrow = document.createElement('div');
  arrow.className = 'border-arrow';
  arrow.hidden = true;
  root.append(wrap, arrow);
  const ctx = canvas.getContext('2d')!;

  const tileCanvas = document.createElement('canvas');
  const tileCtx = tileCanvas.getContext('2d')!;
  let image: ImageData | null = null;
  let owners: (PlayerId | null)[] = [];
  let colorsKey = '';
  let tilesDirty = true;
  let border: ReturnType<typeof borderTiles> = [];

  /** Rebuilds the tile image and the own border list when ownership or player colors changed. */
  function syncTiles(world: World, players: Player[]) {
    const n = world.size;
    if (tileCanvas.width !== n) {
      tileCanvas.width = tileCanvas.height = n;
      image = tileCtx.createImageData(n, n);
      owners = new Array(n * n).fill(undefined);
    }
    const key = players.map((p) => p.id + ':' + p.color).join('|');
    if (key !== colorsKey) {
      colorsKey = key;
      tilesDirty = true;
    }
    for (let k = 0; k < world.tiles.length && !tilesDirty; k++) {
      if (owners[k] !== world.tiles[k].ownerId) tilesDirty = true;
    }
    if (!tilesDirty || !image) return;
    tilesDirty = false;
    const color = new Map(players.map((p) => [p.id, p.color]));
    const data = image.data;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const tile = world.tiles[j * n + i];
        owners[j * n + i] = tile.ownerId;
        const c = tile.ownerId === null ? NEUTRAL_COLOR : color.get(tile.ownerId) ?? UNKNOWN_COLOR;
        const shade = tile.kind === 'building' ? MINIMAP_BUILDING_SHADE : 1;
        // Screen right is -x and screen up is +z, so both axes flip (see toMinimap).
        const o = ((n - 1 - j) * n + (n - 1 - i)) * 4;
        data[o] = ((c >> 16) & 255) * shade;
        data[o + 1] = ((c >> 8) & 255) * shade;
        data[o + 2] = (c & 255) * shade;
        data[o + 3] = 255;
      }
    }
    tileCtx.putImageData(image, 0, 0);
    border = borderTiles(world, me);
  }

  function dot(x: number, y: number, r: number, fill: string, outline = '#1b1b1b') {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = Math.max(1, r * 0.35);
    ctx.strokeStyle = outline;
    ctx.stroke();
  }

  function draw(view: MinimapView) {
    const { world, players, buses, weather } = view;
    const dpr = window.devicePixelRatio || 1;
    const px = Math.round((canvas.clientWidth || MINIMAP_SIZE_PX) * dpr);
    if (canvas.width !== px) canvas.width = canvas.height = px;
    const n = world.size;
    const at = (x: number, z: number) => toMinimap(x, z, n, px);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tileCanvas, 0, 0, px, px);

    for (const c of weather) {
      const p = at(c.x, c.z);
      ctx.globalAlpha = MINIMAP_CLOUD_ALPHA;
      ctx.beginPath();
      ctx.arc(p.x, p.y, (c.radius / n) * px, 0, Math.PI * 2);
      ctx.fillStyle = CLOUD_COLORS[c.kind];
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    const color = new Map(players.map((p) => [p.id, cssColor(p.color)]));
    for (const p of players) {
      if (p.busId !== null || p.x === undefined || p.z === undefined) continue;
      const q = at(p.x, p.z);
      dot(q.x, q.y, MINIMAP_PEDESTRIAN_DOT * px, color.get(p.id)!, p.id === me ? '#fff' : '#1b1b1b');
    }

    let own: Bus | null = null;
    for (const b of buses) {
      if (b.driverId === me) {
        own = b;
        continue;
      }
      const q = at(b.x, b.z);
      dot(q.x, q.y, MINIMAP_BUS_DOT * px, (b.driverId && color.get(b.driverId)) || '#bbbbbb');
    }
    if (own) {
      const q = at(own.x, own.z);
      const r = MINIMAP_OWN_BUS_DOT * px;
      dot(q.x, q.y, r, color.get(me) ?? '#fff', '#fff');
      // Direction arrow: world forward (sin, cos) is (-sin, -cos) on the minimap.
      const fx = -Math.sin(own.angle), fy = -Math.cos(own.angle);
      ctx.beginPath();
      ctx.moveTo(q.x + fx * r * 2.2, q.y + fy * r * 2.2);
      ctx.lineTo(q.x + fx * r * 0.9 - fy * r * 0.8, q.y + fy * r * 0.9 + fx * r * 0.8);
      ctx.lineTo(q.x + fx * r * 0.9 + fy * r * 0.8, q.y + fy * r * 0.9 - fx * r * 0.8);
      ctx.closePath();
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.lineWidth = Math.max(1, r * 0.3);
      ctx.strokeStyle = '#1b1b1b';
      ctx.stroke();
    }
  }

  function updateArrow(view: MinimapView, focus: { x: number; z: number } | null) {
    const w = window.innerWidth, h = window.innerHeight;
    const visible = border.some((t) => {
      const s = view.toScreen(t.x, 0, t.z);
      return s !== null && s.x >= 0 && s.x <= w && s.y >= 0 && s.y <= h;
    });
    const target = !visible && focus ? nearestOf(border, focus.x, focus.z) : null;
    // The top-down camera never has map tiles behind it, so a null projection just hides the arrow.
    const s = target ? view.toScreen(target.x, 0, target.z) : null;
    const place = s ? edgeArrow(w, h, BORDER_ARROW_MARGIN_PX, s.x, s.y) : null;
    arrow.hidden = !place;
    if (!place) return;
    const mine = view.players.find((p) => p.id === me);
    arrow.style.setProperty('--c', mine ? cssColor(mine.color) : '#fff');
    arrow.style.transform = `translate(${place.x}px, ${place.y}px) rotate(${place.angle}rad)`;
  }

  return {
    update(view: MinimapView) {
      syncTiles(view.world, view.players);
      draw(view);
      const mine = view.players.find((p) => p.id === me);
      const bus = mine?.busId != null ? view.buses.find((b) => b.id === mine.busId) : undefined;
      const focus = bus ?? (mine?.x !== undefined && mine.z !== undefined ? { x: mine.x, z: mine.z } : null);
      updateArrow(view, focus);
    },
  };
}
