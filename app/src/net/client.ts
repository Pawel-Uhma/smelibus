import { Client, type Room } from '@colyseus/sdk';
import { INTERP_DELAY_MS } from '../shared/config';
import type {
  Bus, BusInput, JoinOptions, LobbyInfo, PartyMetadata, PlayerId, PublicParty, Snapshot, Welcome, World,
} from '../shared/types';
import { applyTileChanges } from './tiles';

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'ws://localhost:2567';
const TOKEN_KEY = 'smelibus.reconnect';

export interface Party {
  code: string;
  playerId: PlayerId;
  /** Kept up to date with the server's tile owners (snapshot `tileChanges`). */
  world: World;
  /** Latest snapshot from the server. */
  latest(): Snapshot;
  /** Remote buses interpolated INTERP_DELAY_MS in the past. */
  interpolatedBuses(now: number): Bus[];
  sendInput(input: BusInput): void;
  onClose(cb: (reason: string) => void): void;
  leave(): void;
  /** Host, started flag, public flag (card 016). */
  lobby(): LobbyInfo;
  onLobby(cb: (info: LobbyInfo) => void): void;
  /** Host only: ends the waiting room. */
  start(): void;
}

const client = new Client(SERVER_URL);

export const createParty = (name: string, opts: Omit<JoinOptions, 'name'> = {}) =>
  connect(() => client.create('party', { ...opts, name }));
export const joinParty = (code: string, name: string, color?: number) =>
  connect(() => client.joinById(code.toUpperCase(), { name, color }));

/** Streams the public party list (Colyseus LobbyRoom). Returns an unsubscribe function. */
export function watchPublicParties(cb: (list: PublicParty[]) => void, onError?: (e: Error) => void): () => void {
  type Listing = { roomId: string; clients: number; maxClients: number; metadata?: PartyMetadata };
  const rooms = new Map<string, Listing>();
  const emit = () =>
    cb([...rooms.values()]
      .filter((r) => r.metadata?.public)
      .map((r) => ({
        code: r.roomId, players: r.clients, maxPlayers: r.maxClients,
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

  const buffer: { at: number; snap: Snapshot }[] = [];
  let lobby: LobbyInfo = { hostId: null, started: true, public: false };
  const lobbyCbs: ((info: LobbyInfo) => void)[] = [];
  room.onMessage('lobby', (info: LobbyInfo) => {
    lobby = info;
    lobbyCbs.forEach((cb) => cb(info));
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
    if (!snap.bonuses) snap.bonuses = buffer[buffer.length - 1]?.snap.bonuses ?? [];
    buffer.push({ at: performance.now(), snap });
    if (buffer.length > 30) buffer.shift();
  });
  room.send('hello');
  const { playerId } = await welcome;
  while (!buffer.length) await new Promise((r) => setTimeout(r, 20));

  let lastSent = '';
  let lastSentAt = 0;
  const closeCbs: ((reason: string) => void)[] = [];
  room.onLeave((code) => closeCbs.forEach((cb) => cb(code === 1000 ? 'Opuszczono party' : 'Połączenie z serwerem zerwane')));

  return {
    code: room.roomId,
    playerId,
    world: world!,
    latest: () => buffer[buffer.length - 1].snap,
    interpolatedBuses(now) {
      const t = now - INTERP_DELAY_MS;
      let i = buffer.length - 1;
      while (i > 0 && buffer[i - 1].at > t) i--;
      const a = buffer[Math.max(0, i - 1)];
      const b = buffer[i];
      if (a === b || b.at === a.at) return b.snap.buses;
      const k = Math.max(0, Math.min(1, (t - a.at) / (b.at - a.at)));
      return b.snap.buses.map((bb) => {
        const ab = a.snap.buses.find((x) => x.id === bb.id);
        if (!ab) return bb;
        return { ...bb, x: lerp(ab.x, bb.x, k), z: lerp(ab.z, bb.z, k), angle: lerpAngle(ab.angle, bb.angle, k) };
      });
    },
    sendInput(input) {
      // Send on change, plus a keepalive so a lost message can't leave the bus stuck.
      const key = `${input.throttle},${input.steer}`;
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
  };
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export function lerpAngle(a: number, b: number, k: number): number {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * k;
}
