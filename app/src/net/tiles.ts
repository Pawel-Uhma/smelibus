import type { PlayerId, Tile, TileChange } from '../shared/types';

/**
 * Server side: remembers who owned each tile at the last snapshot, so a snapshot
 * carries only the tiles that changed (the full map goes once in `welcome`).
 */
export function createTileTracker(tiles: readonly Tile[]) {
  const seen: (PlayerId | null)[] = tiles.map((t) => t.ownerId);
  return {
    /** Changes since the previous call. */
    diff(): TileChange[] {
      const out: TileChange[] = [];
      for (let i = 0; i < tiles.length; i++) {
        const owner = tiles[i].ownerId;
        if (owner !== seen[i]) {
          seen[i] = owner;
          out.push([i, owner]);
        }
      }
      return out;
    },
  };
}

/** Client side: apply a snapshot's tile changes to the local copy of the map. */
export function applyTileChanges(tiles: Tile[], changes: readonly TileChange[] | undefined): void {
  if (!changes) return;
  for (const [i, ownerId] of changes) if (tiles[i]) tiles[i].ownerId = ownerId;
}
