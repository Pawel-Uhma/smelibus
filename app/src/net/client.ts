import { Client, type Room } from '@colyseus/sdk';
import { INTERP_DELAY_MS } from '../shared/config';
import type { Bus, BusInput, PlayerId, Snapshot, Welcome, World } from '../shared/types';
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
}

const client = new Client(SERVER_URL);

export const createParty = (name: string) => connect(() => client.create('party', { name }));
export const joinParty = (code: string, name: string) =>
  connect(() => client.joinById(code.toUpperCase(), { name }));

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
  };
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export function lerpAngle(a: number, b: number, k: number): number {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * k;
}
