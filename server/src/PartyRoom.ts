import { Room, type Client } from 'colyseus';
import { MAX_PLAYERS, RECONNECT_SECONDS, SIM_DT, SNAPSHOT_INTERVAL_MS } from '../../app/src/shared/config';
import type { BusInput, GameState, PlayerId, Snapshot, Welcome } from '../../app/src/shared/types';
import { createTileTracker } from '../../app/src/net/tiles';
import { addPlayer, createGame, removePlayer, stepGame } from '../../app/src/sim/game';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const randomCode = () => Array.from({ length: 4 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');

/** One room = one party. Runs the authoritative sim and broadcasts plain JSON snapshots. */
export class PartyRoom extends Room {
  maxClients = MAX_PLAYERS;
  private game!: GameState;
  private busInputs = new Map<PlayerId, BusInput>();
  private tiles!: ReturnType<typeof createTileTracker>;
  private lastBonuses = '';

  messages = {
    hello: (client: Client) => {
      const welcome: Welcome = { playerId: client.sessionId, world: this.game.world };
      client.send('welcome', welcome);
      client.send('snapshot', this.snapshot());
    },
    input: (client: Client, input: BusInput) => {
      if (typeof input?.throttle !== 'number' || typeof input?.steer !== 'number') return;
      this.busInputs.set(client.sessionId, { throttle: input.throttle, steer: input.steer });
    },
  };

  onCreate() {
    this.roomId = randomCode();
    this.game = createGame(Math.floor(Math.random() * 2 ** 31));
    this.tiles = createTileTracker(this.game.world.tiles);
    this.setSimulationInterval(() => stepGame(this.game, this.busInputs, SIM_DT), SIM_DT * 1000);
    this.clock.setInterval(() => {
      const snap = this.snapshot();
      const tileChanges = this.tiles.diff();
      if (tileChanges.length) snap.tileChanges = tileChanges;
      // Bonuses only when something changed (~100 of them; full list 20×/s would be ~200 KB/s).
      const bonusKey = JSON.stringify(snap.bonuses);
      if (bonusKey === this.lastBonuses) delete snap.bonuses;
      else this.lastBonuses = bonusKey;
      this.broadcast('snapshot', snap);
    }, SNAPSHOT_INTERVAL_MS);
  }

  onJoin(client: Client, options: { name?: string }) {
    const name = String(options?.name ?? '').trim().slice(0, 16) || 'Kierowca';
    addPlayer(this.game, client.sessionId, name);
  }

  onDrop(client: Client) {
    this.setConnected(client.sessionId, false);
    this.busInputs.delete(client.sessionId);
    // Not awaited: on timeout Colyseus calls onLeave, which frees the bus and neutralizes the zone.
    this.allowReconnection(client, RECONNECT_SECONDS);
  }

  onReconnect(client: Client) {
    this.setConnected(client.sessionId, true);
  }

  onLeave(client: Client) {
    this.busInputs.delete(client.sessionId);
    removePlayer(this.game, client.sessionId);
  }

  private setConnected(id: PlayerId, connected: boolean) {
    const p = this.game.players.find((pl) => pl.id === id);
    if (p) p.connected = connected;
  }

  private snapshot(): Snapshot {
    const { tick, time, players, buses, winnerId, bonuses } = this.game;
    return { tick, time, players, buses, winnerId: winnerId ?? null, bonuses: bonuses ?? [] };
  }
}
