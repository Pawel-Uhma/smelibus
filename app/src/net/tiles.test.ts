import { describe, expect, it } from 'vitest';
import type { Tile } from '../shared/types';
import { applyTileChanges, createTileTracker } from './tiles';

describe('tile sync', () => {
  it('sends only changed tiles and the client ends up with the same map', () => {
    const server: Tile[] = Array.from({ length: 9 }, () => ({ ownerId: null }));
    const client: Tile[] = server.map((t) => ({ ...t }));
    const tracker = createTileTracker(server);
    expect(tracker.diff()).toEqual([]);

    server[2].ownerId = 'a';
    server[5].ownerId = 'b';
    const first = tracker.diff();
    expect(first).toEqual([[2, 'a'], [5, 'b']]);
    applyTileChanges(client, first);

    server[2].ownerId = null; // e.g. player 'a' dropped for good
    const second = tracker.diff();
    expect(second).toEqual([[2, null]]);
    applyTileChanges(client, second);
    expect(tracker.diff()).toEqual([]);
    expect(client).toEqual(server);
  });
});
