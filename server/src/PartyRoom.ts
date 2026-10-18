import { Room, type Client } from 'colyseus';
import { MAX_PLAYERS, PLAYER_COLORS, RECONNECT_SECONDS, SIM_DT, SNAPSHOT_INTERVAL_MS } from '../../app/src/shared/config';
import type {
  BusInput, GameState, JoinOptions, LobbyInfo, PartyMetadata, PlayerId, Snapshot, Welcome,
} from '../../app/src/shared/types';
import { createTileTracker } from '../../app/src/net/tiles';
import { addPlayer, createGame, removePlayer, stepGame } from '../../app/src/sim/game';
import { assignStartZones, startPoint } from '../../app/src/sim/zones';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const randomCode = () => Array.from({ length: 4 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');

/** One room = one party. Runs the authoritative sim and broadcasts plain JSON snapshots. */
export class PartyRoom extends Room {
  maxClients = MAX_PLAYERS;
  private game!: GameState;
  private busInputs = new Map<PlayerId, BusInput>();
  private tiles!: ReturnType<typeof createTileTracker>;
  private lastBonuses = '';
  private lobby: LobbyInfo = { hostId: null, started: false, public: false };

  messages = {
    hello: (client: Client) => {
      const welcome: Welcome = { playerId: client.sessionId, world: this.game.world };
      client.send('lobby', this.lobby);
      client.send('welcome', welcome);
      client.send('snapshot', this.snapshot());
    },
    start: (client: Client) => {
      if (client.sessionId !== this.lobby.hostId || this.lobby.started) return;
      this.startGame();
    },
    input: (client: Client, input: BusInput) => {
      if (typeof input?.throttle !== 'number' || typeof input?.steer !== 'number') return;
      this.busInputs.set(client.sessionId, { throttle: input.throttle, steer: input.steer });
    },
  };

  onCreate(options: JoinOptions) {
    this.roomId = randomCode();
    this.game = createGame(Math.floor(Math.random() * 2 ** 31));
    this.tiles = createTileTracker(this.game.world.tiles);
    // Private parties stay joinable by code, they are just not on the public list.
    this.lobby.public = options?.public === true;
    this.setPrivate(!this.lobby.public);
    this.syncLobby();
    // Waiting room until the host clicks Start: the clock and sudden death don't run yet.
    this.setSimulationInterval(() => {
      if (this.lobby.started) stepGame(this.game, this.busInputs, SIM_DT);
    }, SIM_DT * 1000);
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

  onJoin(client: Client, options: JoinOptions) {
    const name = String(options?.name ?? '').trim().slice(0, 16) || 'Kierowca';
    const player = addPlayer(this.game, client.sessionId, name);
    const wanted = Number(options?.color);
    if (PLAYER_COLORS.includes(wanted) && !this.game.players.some((p) => p.color === wanted)) {
      player.color = wanted;
    }
    if (!this.lobby.hostId) this.lobby.hostId = client.sessionId;
    this.syncLobby();
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
    if (this.lobby.hostId === client.sessionId) this.lobby.hostId = this.game.players[0]?.id ?? null;
    this.syncLobby();
  }

  /** Fresh Voronoi split for everyone in the waiting room, each bus parked on its start point. */
  private startGame() {
    const { world, players, buses } = this.game;
    assignStartZones(world, players.map((p) => p.id));
    players.forEach((p, k) => {
      const bus = buses.find((b) => b.id === p.busId);
      if (!bus) return;
      const at = startPoint(world.size, k, players.length);
      bus.x = at.x;
      bus.z = at.z;
      bus.speed = 0;
    });
    this.lobby.started = true;
    this.syncLobby();
  }

  private syncLobby() {
    const host = this.game.players.find((p) => p.id === this.lobby.hostId);
    const meta: PartyMetadata = { public: this.lobby.public, started: this.lobby.started, hostName: host?.name ?? '' };
    this.setMetadata(meta);
    this.broadcast('lobby', this.lobby);
  }

  private setConnected(id: PlayerId, connected: boolean) {
    const p = this.game.players.find((pl) => pl.id === id);
    if (p) p.connected = connected;
  }

  private snapshot(): Snapshot {
    const { tick, time, players, buses, winnerId, bonuses, weather } = this.game;
    return { tick, time, players, buses, winnerId: winnerId ?? null, bonuses: bonuses ?? [], weather: weather ?? [] };
  }
}
