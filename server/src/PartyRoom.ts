import { Room, type Client } from 'colyseus';
import { BOT_NAMES, CITY_ENABLED, MAX_PLAYERS, PLAYER_COLORS, RECONNECT_SECONDS, SIM_DT, SNAPSHOT_INTERVAL_MS } from '../../app/src/shared/config';
import type {
  BusInput, GameState, InputAck, JoinOptions, LobbyInfo, MapKind, PartyMetadata, PlayerId, Snapshot, Welcome,
} from '../../app/src/shared/types';
import { rematchGame } from '../../app/src/net/rematch';
import { createTileTracker } from '../../app/src/net/tiles';
import { createBot, type Bot } from '../../app/src/sim/bot';
import { addPlayer, createGame, removePlayer, stepGame } from '../../app/src/sim/game';
import { parkBus } from '../../app/src/sim/bus';
import { nearestDrivable } from '../../app/src/sim/world';
import { assignStartZones, startPoint } from '../../app/src/sim/zones';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
/** Sim steps per snapshot (3 at 60 Hz and 50 ms). */
const SNAPSHOT_EVERY_TICKS = Math.max(1, Math.round(SNAPSHOT_INTERVAL_MS / (SIM_DT * 1000)));
const randomCode = () => Array.from({ length: 4 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');

/** One room = one party. Runs the authoritative sim and broadcasts plain JSON snapshots. */
export class PartyRoom extends Room {
  maxClients = MAX_PLAYERS;
  private game!: GameState;
  private busInputs = new Map<PlayerId, BusInput>();
  private acks = new Map<PlayerId, InputAck>();
  private tiles!: ReturnType<typeof createTileTracker>;
  private lastBonuses = '';
  /** Room sim step (Snapshot.serverTick). */
  private serverTick = 0;
  /** Computer players (card 037): seats in the game, not Colyseus clients. */
  private bots = new Map<PlayerId, Bot>();
  private lobby: LobbyInfo = { hostId: null, started: false, public: false, map: CITY_ENABLED ? 'city' : 'flat' };

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
    map: (client: Client, kind: MapKind) => {
      if (client.sessionId !== this.lobby.hostId || this.lobby.started) return;
      if ((kind !== 'city' && kind !== 'flat') || kind === this.lobby.map) return;
      this.lobby.map = kind;
      this.newGame();
      this.syncLobby();
    },
    // Card 027: after a win the host takes everyone back to the waiting room on a new map.
    rematch: (client: Client) => {
      if (client.sessionId !== this.lobby.hostId || !this.lobby.started || !this.game.winnerId) return;
      this.lobby.started = false;
      this.busInputs.clear();
      this.acks.clear();
      this.syncLobby();
      this.newGame();
    },
    // Card 037: the host fills free seats with computer players in the waiting room.
    addBot: (client: Client) => {
      if (client.sessionId !== this.lobby.hostId || this.lobby.started) return;
      // Counts seats reserved by clients still joining; maxClients already excludes the bots.
      if (this.hasReachedMaxClients()) return;
      const names = new Set(this.game.players.map((p) => p.name));
      const name = BOT_NAMES.find((n) => !names.has(n)) ?? `Bot ${this.bots.size + 1}`;
      let n = 1;
      while (this.game.players.some((p) => p.id === `bot-${n}`)) n++;
      const id = `bot-${n}`;
      addPlayer(this.game, id, name).bot = true;
      this.bots.set(id, createBot(Math.floor(Math.random() * 2 ** 31)));
      this.seatsChanged();
    },
    removeBot: (client: Client, id: PlayerId) => {
      if (client.sessionId !== this.lobby.hostId || this.lobby.started || !this.bots.has(id)) return;
      this.bots.delete(id);
      removePlayer(this.game, id);
      this.seatsChanged();
    },
    input: (client: Client, input: BusInput) => {
      if (typeof input?.throttle !== 'number' || typeof input?.steer !== 'number') return;
      const use = Number.isFinite(input.use) ? Number(input.use) : undefined;
      const jump = Number.isFinite(input.jump) ? Number(input.jump) : undefined;
      this.busInputs.set(client.sessionId, { throttle: input.throttle, steer: input.steer, use, jump });
      // Horn counter goes straight into the player, so every snapshot relays it (card 029).
      const horn = Number(input.horn);
      const player = this.game.players.find((p) => p.id === client.sessionId);
      if (player && Number.isFinite(horn)) player.horn = horn;
      // Keepalives repeat the same seq; only a new one restarts the tick count.
      const seq = Number(input.seq);
      if (Number.isFinite(seq) && this.acks.get(client.sessionId)?.seq !== seq) {
        this.acks.set(client.sessionId, { seq, ticks: 0 });
      }
    },
  };

  onCreate(options: JoinOptions) {
    this.roomId = randomCode();
    this.game = createGame(Math.floor(Math.random() * 2 ** 31), this.lobby.map === 'city');
    this.tiles = createTileTracker(this.game.world.tiles);
    // Private parties stay joinable by code, they are just not on the public list.
    this.lobby.public = options?.public === true;
    this.setPrivate(!this.lobby.public);
    this.syncLobby();
    // Fixed 60 Hz steps from Colyseus's accumulator: a late timer runs catch-up steps instead of
    // slowing the game down, so server ticks stay in step with the client's prediction ticks.
    // Snapshots go out from the same loop, every SNAPSHOT_EVERY_TICKS steps, so each one carries
    // exactly the same amount of movement (two independent timers gave 2 or 4 ticks per snapshot).
    this.setFixedTimestep((ctx) => {
      this.serverTick = ctx.tick;
      // Waiting room until the host clicks Start: the clock and sudden death don't run yet.
      if (this.lobby.started) {
        for (const [id, bot] of this.bots) {
          const input = bot.think(this.game, id, SIM_DT);
          this.busInputs.set(id, input);
          const player = this.game.players.find((p) => p.id === id);
          if (player) player.horn = input.horn;
        }
        stepGame(this.game, this.busInputs, SIM_DT);
        for (const ack of this.acks.values()) ack.ticks++;
      }
      if (ctx.tick % SNAPSHOT_EVERY_TICKS === 0) this.broadcastSnapshot();
    }, Math.round(1 / SIM_DT));
  }

  private broadcastSnapshot() {
    const snap = this.snapshot();
    const tileChanges = this.tiles.diff();
    if (tileChanges.length) snap.tileChanges = tileChanges;
    // Bonuses only when something changed (~100 of them; full list 20×/s would be ~200 KB/s).
    const bonusKey = JSON.stringify(snap.bonuses);
    if (bonusKey === this.lastBonuses) delete snap.bonuses;
    else this.lastBonuses = bonusKey;
    this.broadcast('snapshot', snap);
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
    this.acks.delete(client.sessionId);
    // Not awaited: on timeout Colyseus calls onLeave, which frees the bus and neutralizes the zone.
    this.allowReconnection(client, RECONNECT_SECONDS);
  }

  onReconnect(client: Client) {
    this.setConnected(client.sessionId, true);
  }

  onLeave(client: Client) {
    this.busInputs.delete(client.sessionId);
    this.acks.delete(client.sessionId);
    removePlayer(this.game, client.sessionId);
    // Never a bot: the room closes with its last human anyway.
    if (this.lobby.hostId === client.sessionId) this.lobby.hostId = this.game.players.find((p) => !p.bot)?.id ?? null;
    this.syncLobby();
  }

  /**
   * Waiting room only: a new map of the lobby's kind and a fresh sim with the same players
   * (names, colors, connection), then a new `welcome` to everyone. Clients build the scene after
   * Start, so they just take the latest world.
   */
  private newGame() {
    this.game = rematchGame(this.game, Math.floor(Math.random() * 2 ** 31), this.lobby.map === 'city');
    // Fresh brains: the old ones still remember paths on the previous map.
    for (const id of this.bots.keys()) this.bots.set(id, createBot(Math.floor(Math.random() * 2 ** 31)));
    this.tiles = createTileTracker(this.game.world.tiles);
    this.lastBonuses = '';
    for (const c of this.clients) c.send('welcome', { playerId: c.sessionId, world: this.game.world } satisfies Welcome);
    this.broadcastSnapshot();
  }

  /** Fresh Voronoi split for everyone in the waiting room, each bus parked on its start point. */
  private startGame() {
    const { world, players, buses } = this.game;
    assignStartZones(world, players.map((p) => p.id));
    players.forEach((p, k) => {
      const bus = buses.find((b) => b.id === p.busId);
      if (!bus) return;
      const p0 = startPoint(world.size, k, players.length);
      const at = nearestDrivable(world, p0.x, p0.z);
      parkBus(bus, world, at.x, at.z);
      bus.speed = 0;
    });
    this.lobby.started = true;
    this.syncLobby();
  }

  private syncLobby() {
    const host = this.game.players.find((p) => p.id === this.lobby.hostId);
    const meta: PartyMetadata = {
      public: this.lobby.public, started: this.lobby.started, hostName: host?.name ?? '', bots: this.bots.size,
    };
    this.setMetadata(meta);
    this.broadcast('lobby', this.lobby);
  }

  /** Bots take seats, so fewer are left for real clients; then everyone sees the new list. */
  private seatsChanged() {
    this.maxClients = MAX_PLAYERS - this.bots.size;
    this.syncLobby();
    this.broadcastSnapshot();
  }

  private setConnected(id: PlayerId, connected: boolean) {
    const p = this.game.players.find((pl) => pl.id === id);
    if (p) p.connected = connected;
  }

  private snapshot(): Snapshot {
    const { tick, time, players, buses, winnerId, bonuses, weather } = this.game;
    return {
      tick, serverTick: this.serverTick, time, players, buses, winnerId: winnerId ?? null, bonuses: bonuses ?? [], weather: weather ?? [],
      acks: Object.fromEntries(this.acks),
    };
  }
}
