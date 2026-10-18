import type { PlayerId, World } from '../shared/types';

/** A tile of the player's zone that touches a tile owned by someone else (or nobody). */
export interface BorderTile {
  i: number;
  j: number;
  /** Tile centre in world units. */
  x: number;
  z: number;
}

/** True when tile (i, j) belongs to `owner` and one of its 4 neighbours inside the map doesn't. */
function isBorder(world: World, owner: PlayerId, i: number, j: number): boolean {
  const { size, tiles } = world;
  if (tiles[j * size + i]?.ownerId !== owner) return false;
  if (i > 0 && tiles[j * size + i - 1].ownerId !== owner) return true;
  if (i < size - 1 && tiles[j * size + i + 1].ownerId !== owner) return true;
  if (j > 0 && tiles[(j - 1) * size + i].ownerId !== owner) return true;
  if (j < size - 1 && tiles[(j + 1) * size + i].ownerId !== owner) return true;
  return false;
}

/** All border tiles of the owner's zone. The map edge doesn't count as a border. */
export function borderTiles(world: World, owner: PlayerId): BorderTile[] {
  const out: BorderTile[] = [];
  for (let j = 0; j < world.size; j++) {
    for (let i = 0; i < world.size; i++) {
      if (isBorder(world, owner, i, j)) out.push({ i, j, x: i + 0.5, z: j + 0.5 });
    }
  }
  return out;
}

/** Border tile closest to (x, z), or null when the owner has no border (no tiles or the whole map). */
export function nearestBorderTile(world: World, owner: PlayerId, x: number, z: number): BorderTile | null {
  return nearestOf(borderTiles(world, owner), x, z);
}

export function nearestOf(tiles: BorderTile[], x: number, z: number): BorderTile | null {
  let best: BorderTile | null = null;
  let bestD = Infinity;
  for (const t of tiles) {
    const d = (t.x - x) ** 2 + (t.z - z) ** 2;
    if (d < bestD) {
      bestD = d;
      best = t;
    }
  }
  return best;
}

/**
 * Where to put an arrow at the screen edge pointing at screen point (sx, sy).
 * Returns null when the point is on screen. `angle` is in radians, 0 = pointing right,
 * clockwise (CSS rotate). A point behind the camera is mirrored through the centre.
 */
export function edgeArrow(
  w: number, h: number, margin: number, sx: number, sy: number, behind = false,
): { x: number; y: number; angle: number } | null {
  if (!behind && sx >= 0 && sx <= w && sy >= 0 && sy <= h) return null;
  const cx = w / 2, cy = h / 2;
  let dx = sx - cx, dy = sy - cy;
  if (behind) {
    dx = -dx;
    dy = -dy;
  }
  if (dx === 0 && dy === 0) dy = 1;
  const hw = Math.max(1, cx - margin), hh = Math.max(1, cy - margin);
  const k = Math.min(hw / Math.abs(dx || 1e-9), hh / Math.abs(dy || 1e-9));
  return { x: cx + dx * k, y: cy + dy * k, angle: Math.atan2(dy, dx) };
}

/**
 * Minimap pixel of world point (x, z) on a map of `size` tiles drawn `px` pixels wide.
 * Matches the camera: screen up is +z, screen right is -x.
 */
export function toMinimap(x: number, z: number, size: number, px: number): { x: number; y: number } {
  return { x: ((size - x) / size) * px, y: ((size - z) / size) * px };
}
