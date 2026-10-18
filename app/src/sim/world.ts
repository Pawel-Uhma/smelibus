import { MAX_PLAYERS, TILES_PER_PLAYER } from '../shared/config';
import type { World } from '../shared/types';

export function mapSizeFor(playerCount: number): number {
  return Math.ceil(Math.sqrt(TILES_PER_PLAYER * Math.max(1, Math.min(playerCount, MAX_PLAYERS))));
}

/** Flat map without buildings (DECISIONS: MVP on a flat map). Card 002 adds elements. */
export function generateWorld(seed: number, playerCount: number): World {
  const size = mapSizeFor(playerCount);
  return { seed, size, tiles: Array.from({ length: size * size }, () => ({ ownerId: null })) };
}
