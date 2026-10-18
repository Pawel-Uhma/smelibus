import {
  SOUND_CAPTURE_MAX_TILES, SOUND_CAPTURE_TOP_TILES, SOUND_FULL_DIST, SOUND_RAM_PUSH,
} from '../shared/config';
import type { Bonus, PlayerId, Snapshot, Tile, WeatherCell } from '../shared/types';

/** Something audible that happened between two snapshots, at a map position. */
export type SoundEvent =
  | { kind: 'horn'; x: number; z: number }
  | { kind: 'capture'; x: number; z: number; tiles: number; mine: boolean }
  | { kind: 'ram'; x: number; z: number }
  | { kind: 'bonus'; x: number; z: number }
  | { kind: 'controller'; x: number; z: number };

/** Volume 0..1 at distance `d`: full up to SOUND_FULL_DIST, then falls (squared) to 0 at `range`. */
export function distanceGain(d: number, range: number, full = SOUND_FULL_DIST): number {
  if (d <= full) return 1;
  if (d >= range) return 0;
  const k = 1 - (d - full) / (range - full);
  return k * k;
}

/** Where a player is heard from: their bus if they drive, else where they stand. */
function playerPos(snap: Snapshot, id: PlayerId): { x: number; z: number } | null {
  const p = snap.players.find((pl) => pl.id === id);
  if (!p) return null;
  const bus = p.busId !== null ? snap.buses.find((b) => b.id === p.busId) : undefined;
  if (bus) return { x: bus.x, z: bus.z };
  return p.x !== undefined && p.z !== undefined ? { x: p.x, z: p.z } : null;
}

/** A bonus that was on the ground in `prev` and got picked up by `curr`. */
function collected(b: Bonus, now: Bonus | undefined, time: number): boolean {
  if (!b.active) return false;
  if (now) return !now.active;
  // One-offs vanish from the list: a Żabka drunk only when picked up, dropped stink also on expiry.
  if (b.spot === 'zabka') return true;
  if (b.spot === 'dropped') return time < b.respawnAt;
  return false;
}

/**
 * Sounds from the difference of two snapshots: horns of other players (`me` honks locally),
 * bonus pickups, rams. Tile captures come from createCaptureTracker.
 */
export function diffSnapshots(prev: Snapshot, curr: Snapshot, me: PlayerId): SoundEvent[] {
  const out: SoundEvent[] = [];

  for (const p of curr.players) {
    if (p.id === me) continue;
    const before = prev.players.find((pl) => pl.id === p.id);
    // Any change is a press: after a page refresh the client counter starts again from 0.
    if (!before || (p.horn ?? 0) === (before.horn ?? 0)) continue;
    const at = playerPos(curr, p.id);
    if (at) out.push({ kind: 'horn', ...at });
  }

  const prevBonuses = new Map((prev.bonuses ?? []).map((b) => [b.id, b]));
  const currBonuses = new Map((curr.bonuses ?? []).map((b) => [b.id, b]));
  for (const b of prevBonuses.values()) {
    if (!collected(b, currBonuses.get(b.id), curr.time)) continue;
    out.push({ kind: b.kind === 'controller' ? 'controller' : 'bonus', x: b.x, z: b.z });
  }

  // A ram knocks stink out (a new dropped bonus) or at least knocks a bus sideways.
  const rams: { x: number; z: number }[] = [];
  for (const b of currBonuses.values()) {
    if (b.spot === 'dropped' && !prevBonuses.has(b.id)) rams.push({ x: b.x, z: b.z });
  }
  for (const bus of curr.buses) {
    const before = prev.buses.find((b) => b.id === bus.id);
    const push = Math.hypot(bus.pushX ?? 0, bus.pushZ ?? 0);
    const pushBefore = before ? Math.hypot(before.pushX ?? 0, before.pushZ ?? 0) : 0;
    if (push >= SOUND_RAM_PUSH && push > pushBefore + SOUND_RAM_PUSH / 2) rams.push({ x: bus.x, z: bus.z });
  }
  // Both buses of one hit (and its stink drop) are one "bum".
  const ramDedupe = 4;
  for (const r of rams) {
    if (out.some((e) => e.kind === 'ram' && Math.hypot(e.x - r.x, e.z - r.z) < ramDedupe)) continue;
    out.push({ kind: 'ram', ...r });
  }
  return out;
}

/**
 * Remembers tile owners and reports jumps: per player, how many tiles they gained since the
 * last call and where (centroid). Reading the world map, not snapshot tileChanges, so a frame
 * that skips a snapshot still hears the jump.
 */
export function createCaptureTracker(tiles: readonly Tile[], size: number) {
  let owners = tiles.map((t) => t.ownerId);
  return {
    diff(now: readonly Tile[], me: PlayerId): SoundEvent[] {
      const gained = new Map<PlayerId, { n: number; x: number; z: number }>();
      for (let k = 0; k < now.length; k++) {
        const id = now[k].ownerId;
        if (id === owners[k]) continue;
        owners[k] = id;
        if (id === null) continue;
        const g = gained.get(id) ?? { n: 0, x: 0, z: 0 };
        g.n++;
        g.x += (k % size) + 0.5;
        g.z += Math.floor(k / size) + 0.5;
        gained.set(id, g);
      }
      if (owners.length !== now.length) owners = now.map((t) => t.ownerId);
      const out: SoundEvent[] = [];
      for (const [id, g] of gained) {
        if (g.n > SOUND_CAPTURE_MAX_TILES) continue;
        out.push({ kind: 'capture', x: g.x / g.n, z: g.z / g.n, tiles: g.n, mine: id === me });
      }
      return out;
    },
  };
}

/** Rising jump chord: note frequencies (Hz) in play order, higher and fuller for bigger N. */
export function captureChord(tiles: number): number[] {
  const k = Math.min(1, Math.max(0, tiles) / SOUND_CAPTURE_TOP_TILES);
  // Root climbs up to an octave and a half above C4 as N grows.
  const root = 261.63 * 2 ** (Math.round(k * 18) / 12);
  const steps = [0, 4, 7];
  if (tiles >= 20) steps.push(12);
  if (tiles >= 80) steps.push(16);
  return steps.map((s) => root * 2 ** (s / 12));
}

/** How much rain and Harnaś the listener is under, 0..1 each (soft cloud edge, fade in and out). */
export function weatherExposure(
  cells: readonly WeatherCell[], x: number, z: number, time: number,
): { rain: number; harnas: number } {
  const out = { rain: 0, harnas: 0 };
  for (const c of cells) {
    const d = Math.hypot(x - c.x, z - c.z);
    const edge = 2;
    const inside = Math.min(1, Math.max(0, (c.radius - d) / edge + 0.5));
    const fade = Math.min(1, Math.max(0, (time - c.bornAt) / 2), Math.max(0, (c.endsAt - time) / 2));
    const v = inside * fade;
    if (c.kind === 'rain') out.rain = Math.max(out.rain, v);
    else out.harnas = Math.max(out.harnas, v);
  }
  return out;
}
