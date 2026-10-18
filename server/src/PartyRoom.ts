import { Room, type Client } from 'colyseus';
import { MAX_PLAYERS, RECONNECT_SECONDS, SIM_DT, SNAPSHOT_INTERVAL_MS } from '../../app/src/shared/config';
import type { BusInput, GameState, PlayerId, Snapshot, Welcome } from '../../app/src/shared/types';
import { addPlayer, createGame, removePlayer, stepGame } from '../../app/src/sim/game';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const randomCode = () => Array.from({ length: 4 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');

/** One room = one party. Runs the authoritative sim and broadcasts plain JSON snapshots. */
export class PartyRoom extends Room {
  maxClients = MAX_PLAYERS;
  private game!: GameState;
  private busInputs = new Map<PlayerId, BusInput>();

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
    this.setSimulationInterval(() => stepGame(this.game, this.busInputs, SIM_DT), SIM_DT * 1000);
    this.clock.setInterval(() => this.broadcast('snapshot', this.snapshot()), SNAPSHOT_INTERVAL_MS);
  }

  onJoin(client: Client, options: { name?: string }) {
    const name = String(options?.name ?? '').trim().slice(0, 16) || 'Kierowca';
    addPlayer(this.game, client.sessionId, name);
  }

  async onDrop(client: Client) {
    this.setConnected(client.sessionId, false);
    this.busInputs.delete(client.sessionId);
    await this.allowReconnection(client, RECONNECT_SECONDS);
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
    const { tick, time, players, buses } = this.game;
    return { tick, time, players, buses };
  }
}
