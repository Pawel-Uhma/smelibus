import { SIM_DT } from '../shared/config';
import type { Bus, Snapshot } from '../shared/types';

const TICK_MS = SIM_DT * 1000;
/** How far past the newest snapshot remote buses may be extrapolated when one arrives late, ms. */
const MAX_EXTRAPOLATE_MS = 100;
/** How fast the clock offset follows the least-delayed recent snapshot, per snapshot. */
const OFFSET_RATE = 0.1;
/** An offset this far off (ms) is a new timeline (reconnect, hitch), not jitter: jump to it. */
const OFFSET_SNAP_MS = 250;

interface Entry {
  /** Server time of the snapshot, ms. */
  t: number;
  /** Local arrival time, ms. */
  at: number;
  snap: Snapshot;
}

/**
 * Remote buses on the server's timeline. Snapshots are placed by `serverTick`, not by when they
 * arrived, so network jitter doesn't show as jerks. The local clock maps onto the server's through
 * the smallest arrival lag in the buffer (the least-delayed packet), eased so it never jumps.
 */
export function createSnapshotBuffer(size = 30) {
  const buf: Entry[] = [];
  let offset: number | null = null;

  return {
    push(snap: Snapshot, at: number) {
      // Older servers don't send serverTick: fall back to arrival time.
      const t = snap.serverTick !== undefined ? snap.serverTick * TICK_MS : at;
      const last = buf[buf.length - 1];
      if (last && t < last.t) {
        buf.length = 0;
        offset = null;
      }
      // Same tick twice (the `hello` reply right after a broadcast): keep the newer one.
      if (last && t === last.t) buf.pop();
      buf.push({ t, at, snap });
      if (buf.length > size) buf.shift();
      const lag = Math.min(...buf.map((e) => e.at - e.t));
      offset = offset === null || Math.abs(lag - offset) > OFFSET_SNAP_MS ? lag : offset + (lag - offset) * OFFSET_RATE;
    },
    latest: (): Snapshot | undefined => buf[buf.length - 1]?.snap,
    /** Buses as they were `delay` ms before the newest data, interpolated between snapshots. */
    buses(now: number, delay: number): Bus[] {
      const newest = buf[buf.length - 1];
      if (!newest || offset === null) return [];
      const t = now - offset - delay;
      let i = buf.findIndex((e) => e.t >= t);
      if (i === 0 || buf.length === 1) return buf[0].snap.buses;
      // Past the newest snapshot (the next one is late): carry on along the last two for a bit.
      if (i === -1) i = buf.length - 1;
      const a = buf[i - 1];
      const b = buf[i];
      const k = Math.min((t - a.t) / (b.t - a.t), 1 + MAX_EXTRAPOLATE_MS / (b.t - a.t));
      return b.snap.buses.map((bb) => {
        const ab = a.snap.buses.find((x) => x.id === bb.id);
        if (!ab) return bb;
        return { ...bb, x: lerp(ab.x, bb.x, k), z: lerp(ab.z, bb.z, k), angle: lerpAngle(ab.angle, bb.angle, k) };
      });
    },
  };
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export function lerpAngle(a: number, b: number, k: number): number {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * k;
}
