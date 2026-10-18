import { describe, expect, it } from 'vitest';
import type { Bus, Snapshot } from '../shared/types';
import { createSnapshotBuffer, lerpAngle } from './interp';

const bus = (x: number): Bus => ({ id: 1, x, z: 0, angle: 0, speed: 0, driverId: null, stink: 0 });
const snap = (serverTick: number, x: number): Snapshot =>
  ({ tick: serverTick, serverTick, time: 0, players: [], buses: [bus(x)] });

// Ticks are 1/60 s, so tick 3k is 50k ms on the server.
describe('createSnapshotBuffer', () => {
  it('places snapshots by server time, so arrival jitter does not move buses', () => {
    const buf = createSnapshotBuffer();
    // Bus moves 1 tile per snapshot; arrivals wobble by up to 40 ms on top of a 1000 ms lag.
    const jitter = [0, 40, 5, 30, 0, 20, 10, 0];
    jitter.forEach((j, k) => buf.push(snap(3 * k, k), 1000 + 50 * k + j));
    // Offset settles on the least-delayed packet (lag 1000 ms): 100 ms back from now = 2 snapshots.
    const x = buf.buses(1000 + 50 * 7 + 25, 100)[0].x;
    expect(x).toBeCloseTo(5.5, 1);
  });

  it('extrapolates a little when the next snapshot is late, then holds', () => {
    const buf = createSnapshotBuffer();
    for (let k = 0; k < 5; k++) buf.push(snap(3 * k, k), 50 * k);
    // Newest is x=4 at server 200 ms. 60 ms past it: keeps going at 1 tile / 50 ms.
    expect(buf.buses(260, 0)[0].x).toBeCloseTo(5.2);
    // Capped at 100 ms past the newest.
    expect(buf.buses(1000, 0)[0].x).toBeCloseTo(6);
  });

  it('starts over when ticks go backwards (new room timeline)', () => {
    const buf = createSnapshotBuffer();
    buf.push(snap(300, 1), 0);
    buf.push(snap(303, 2), 50);
    buf.push(snap(0, 9), 100);
    expect(buf.buses(100, 0)[0].x).toBe(9);
  });

  it('keeps the newer of two snapshots with the same tick', () => {
    const buf = createSnapshotBuffer();
    buf.push(snap(3, 1), 0);
    buf.push(snap(3, 2), 5);
    expect(buf.latest()!.buses[0].x).toBe(2);
  });

  it('falls back to arrival time without serverTick', () => {
    const buf = createSnapshotBuffer();
    const old = (x: number): Snapshot => ({ tick: 0, time: 0, players: [], buses: [bus(x)] });
    buf.push(old(0), 0);
    buf.push(old(2), 50);
    expect(buf.buses(75, 50)[0].x).toBeCloseTo(1);
  });
});

describe('lerpAngle', () => {
  it('takes the short way round', () => {
    expect(lerpAngle(3, -3, 0.5)).toBeCloseTo(Math.PI, 1);
  });
});
