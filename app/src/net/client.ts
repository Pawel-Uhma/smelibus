import { Client, type Room } from '@colyseus/sdk';
import { INTERP_DELAY_MS } from '../shared/config';
import type {
  Bus, BusInput, JoinOptions, LobbyInfo, MapKind, PartyMetadata, PlayerId, PublicParty, Snapshot, Welcome, World,
} from '../shared/types';
import { createSnapshotBuffer } from './interp';
import { normalizePartyCode } from './partyCode';
import { applyTileChanges } from './tiles';

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'ws://localhost:2567';
const TOKEN_KEY = 'smelibus.reconnect';

export interface Party {
  code: string;
  playerId: PlayerId;
  /** Kept up to date with the server's tile owners (snapshot `tileChanges`); replaced by a new `welcome`. */
  readonly world: World;
  /** Latest snapshot from the server. */
  latest(): Snapshot;
  /** Remote buses interpolated INTERP_DELAY_MS in the past (on the server's timeline). */
  interpolatedBuses(now: number): Bus[];
  sendInput(input: BusInput): void;
  onClose(cb: (reason: string) => void): void;
  leave(): void;
  /** Host, started flag, public flag (card 016). */
  lobby(): LobbyInfo;
  onLobby(cb: (info: LobbyInfo) => void): void;
  /** Host only: ends the waiting room. */
  start(): void;
  /** Host only, waiting room: everyone gets a new map of this kind. */
  setMap(kind: MapKind): void;
  /** Host only, after a win: same room, new map, back to the waiting room (card 027). */
  rematch(): void;
  /** The game went back to the waiting room (a rematch); a new `welcome` follows. */
  onRematch(cb: () => void): void;
  /** Host only, waiting room: a computer player takes a free seat (card 037). */
  addBot(): void;
  /** Host only, waiting room: the bot leaves. */
  removeBot(id: PlayerId): void;
}

const client = new Client(SERVER_URL);

export const createParty = (name: string, opts: Omit<JoinOptions, 'name'> = {}) =>
  connect(() => client.create('party', { ...opts, name }));
export const joinParty = (code: string, name: string, color?: number) =>
  connect(() => client.joinById(normalizePartyCode(code), { name, color }));

/** Streams the public party list (Colyseus LobbyRoom). Returns an unsubscribe function. */
export function watchPublicParties(cb: (list: PublicParty[]) => void, onError?: (e: Error) => void): () => void {
  type Listing = { roomId: string; clients: number; maxClients: number; metadata?: PartyMetadata };
  const rooms = new Map<string, Listing>();
  const emit = () =>
    cb([...rooms.values()]
      .filter((r) => r.metadata?.public)
      .map((r) => ({
        // Bots hold seats outside Colyseus's client count (card 037).
        code: r.roomId, players: r.clients + (r.metadata?.bots ?? 0), maxPlayers: r.maxClients + (r.metadata?.bots ?? 0),
        started: !!r.metadata?.started, hostName: r.metadata?.hostName ?? '',
      })));
  let room: Room | null = null;
  let closed = false;
  client.joinOrCreate('lobby', { filter: { name: 'party' } }).then((r) => {
    if (closed) return void r.leave();
    room = r;
    r.onMessage('rooms', (list: Listing[]) => {
      rooms.clear();
      for (const l of list) rooms.set(l.roomId, l);
      emit();
    });
    r.onMessage('+', ([id, l]: [string, Listing]) => {
      rooms.set(id, l);
      emit();
    });
    r.onMessage('-', (id: string) => {
      rooms.delete(id);
      emit();
    });
  }, (e: Error) => onError?.(e));
  return () => {
    closed = true;
    room?.leave();
  };
}

/** Comes back to the same seat after a page refresh (RECONNECT_SECONDS). */
export async function rejoinParty(code: string): Promise<Party | null> {
  const saved = sessionStorage.getItem(TOKEN_KEY);
  if (!saved) return null;
  const { code: savedCode, token } = JSON.parse(saved) as { code: string; token: string };
  if (savedCode !== code.toUpperCase()) return null;
  try {
    return await connect(() => client.reconnect(token));
  } catch {
    sessionStorage.removeItem(TOKEN_KEY);
    return null;
  }
}

async function connect(open: () => Promise<Room>): Promise<Party> {
  const room = await open();
  sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ code: room.roomId, token: room.reconnectionToken }));

  const buffer = createSnapshotBuffer();
  let lobby: LobbyInfo = { hostId: null, started: true, public: false };
  const lobbyCbs: ((info: LobbyInfo) => void)[] = [];
  const rematchCbs: (() => void)[] = [];
  room.onMessage('lobby', (info: LobbyInfo) => {
    const rematch = lobby.started && !info.started && world !== null;
    lobby = info;
    lobbyCbs.forEach((cb) => cb(info));
    if (rematch) rematchCbs.forEach((cb) => cb());
  });
  let world: World | null = null;
  const welcome = new Promise<Welcome>((resolve) =>
    room.onMessage('welcome', (w: Welcome) => {
      world = w.world;
      resolve(w);
    }),
  );
  room.onMessage('snapshot', (snap: Snapshot) => {
    // Changes sent before `welcome` are already in the welcome map.
    if (world) applyTileChanges(world.tiles, snap.tileChanges);
    if (!snap.bonuses) snap.bonuses = buffer.latest()?.bonuses ?? [];
    buffer.push(snap, performance.now());
  });
  room.send('hello');
  const { playerId } = await welcome;
  while (!buffer.latest()) await new Promise((r) => setTimeout(r, 20));

  let lastSent = '';
  let lastSentAt = 0;
  const closeCbs: ((reason: string) => void)[] = [];
  room.onLeave((code) => closeCbs.forEach((cb) => cb(code === 1000 ? 'Opuszczono party' : 'Połączenie z serwerem zerwane')));

  return {
    code: room.roomId,
    playerId,
    get world() {
      return world!;
    },
    latest: () => buffer.latest()!,
    interpolatedBuses: (now) => buffer.buses(now, INTERP_DELAY_MS),
    sendInput(input) {
      // Send on change, plus a keepalive so a lost message can't leave the bus stuck.
      const key = `${input.throttle},${input.steer},${input.seq},${input.use},${input.jump},${input.horn}`;
      const now = performance.now();
      if (key === lastSent && now - lastSentAt < 250) return;
      lastSent = key;
      lastSentAt = now;
      room.send('input', input);
    },
    onClose: (cb) => closeCbs.push(cb),
    leave: () => {
      sessionStorage.removeItem(TOKEN_KEY);
      room.leave(true);
    },
    lobby: () => lobby,
    onLobby: (cb) => lobbyCbs.push(cb),
    start: () => room.send('start'),
    setMap: (kind) => room.send('map', kind),
    rematch: () => room.send('rematch'),
    onRematch: (cb) => rematchCbs.push(cb),
    addBot: () => room.send('addBot'),
    removeBot: (id) => room.send('removeBot', id),
  };
}
