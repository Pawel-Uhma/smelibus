import { describe, expect, it } from 'vitest';
import { BUS_LENGTH, SIM_DT } from '../shared/config';
import type { Bus, BusInput, InputAck, World } from '../shared/types';
import { NO_INPUT, updateBus } from './bus';
import { createBusPredictor } from './prediction';

const bus = (over: Partial<Bus> = {}): Bus => ({
  id: 0, x: 50, z: 50, angle: 0, speed: 0, driverId: null, stink: 0, ...over,
});
const dist = (a: Bus, b: Bus) => Math.hypot(a.x - b.x, a.z - b.z);

/**
 * Client and server one tick at a time, `lag` ticks each way. The server acks inputs like
 * PartyRoom and sends a snapshot every 3 ticks. Returns the predictor and the server's bus.
 */
function play(script: (tick: number) => BusInput, ticks: number, lag: number) {
  const start = bus();
  const predictor = createBusPredictor(start, 1000);
  const server = { ...start };
  let serverInput = NO_INPUT;
  let ack: InputAck | undefined;
  const up: { at: number; input: BusInput }[] = [];
  const down: { at: number; bus: Bus; ack?: InputAck }[] = [];
  const local = { ...start };
  for (let t = 0; t < ticks; t++) {
    while (down.length && down[0].at <= t) {
      const msg = down.shift()!;
      predictor.reconcile(msg.bus, msg.ack);
    }
    const input = script(t);
    predictor.step(input, SIM_DT);
    updateBus(local, input, SIM_DT, 1000);
    up.push({ at: t + lag, input: { ...input, seq: predictor.seq } });

    while (up.length && up[0].at <= t) {
      const msg = up.shift()!.input;
      serverInput = msg;
      if (ack?.seq !== msg.seq) ack = { seq: msg.seq!, ticks: 0 };
    }
    updateBus(server, serverInput, SIM_DT, 1000);
    if (ack) ack.ticks++;
    if (t % 3 === 0) down.push({ at: t + lag, bus: { ...server }, ack: ack && { ...ack } });
  }
  return { predictor, server, local };
}

describe('createBusPredictor', () => {
  it('matches the local drive exactly in a turn, despite the lag', () => {
    const { predictor, local } = play(() => ({ throttle: 1, steer: 1 }), 180, 12);
    expect(dist(predictor.bus, local)).toBeLessThan(1e-6);
    expect(predictor.bus.angle).toBeCloseTo(local.angle, 6);
  });

  it('ends up exactly where the server is after zigzagging', () => {
    const zigzag = (t: number): BusInput =>
      t < 300 ? { throttle: t % 50 < 40 ? 1 : -1, steer: Math.floor(t / 25) % 2 ? 1 : -1 } : NO_INPUT;
    const { predictor, server } = play(zigzag, 900, 9);
    expect(dist(predictor.bus, server)).toBeLessThan(1e-3);
    expect(predictor.bus.speed).toBe(0);
  });

  it('snaps when the server is far away', () => {
    const predictor = createBusPredictor(bus(), 1000);
    predictor.step(NO_INPUT, SIM_DT);
    predictor.reconcile(bus({ x: 80, stink: 40 }));
    expect(predictor.bus).toMatchObject({ x: 80, stink: 40 });
  });

  it('takes stink from the server right away', () => {
    // Otherwise the driver sees a clean bus while everyone else sees it stinking.
    const predictor = createBusPredictor(bus(), 1000);
    predictor.step(NO_INPUT, SIM_DT);
    predictor.reconcile(bus({ stink: 85 }), { seq: predictor.seq, ticks: 1 });
    expect(predictor.bus.stink).toBe(85);
  });

  it('hides a correction behind an offset that fades out', () => {
    const predictor = createBusPredictor(bus(), 1000);
    predictor.step(NO_INPUT, SIM_DT);
    predictor.reconcile(bus({ x: 51 }), { seq: predictor.seq, ticks: 1 });
    expect(predictor.bus.x).toBeCloseTo(50);
    for (let i = 0; i < 300; i++) predictor.step(NO_INPUT, SIM_DT);
    expect(predictor.bus.x).toBeCloseTo(51, 3);
  });

  it('does not drive through another bus while waiting for the server', () => {
    const predictor = createBusPredictor(bus(), 1000);
    const parked = bus({ id: 1, z: 56 });
    for (let tick = 0; tick < 120; tick++) predictor.step({ throttle: 1, steer: 0 }, SIM_DT, [parked]);
    expect(predictor.bus.z).toBeLessThan(56 - 2.9);
    expect(parked.z).toBe(56);
  });

  it('follows a knock-back only the server saw', () => {
    // Someone rammed us on the server: our copy should start sliding the same way.
    const predictor = createBusPredictor(bus(), 1000);
    for (let tick = 0; tick < 10; tick++) {
      predictor.step({ throttle: 0, steer: 0 }, SIM_DT);
      predictor.reconcile(bus({ pushX: 6 }), { seq: predictor.seq, ticks: tick + 1 });
    }
    expect(predictor.bus.pushX).toBeGreaterThan(0);
  });

  it('stops at buildings like the server does', () => {
    const world: World = { seed: 0, size: 100, tiles: Array.from({ length: 100 * 100 }, () => ({ ownerId: null })) };
    for (let i = 0; i < 100; i++) world.tiles[56 * 100 + i].kind = 'building';
    const predictor = createBusPredictor(bus(), 100, world);
    for (let tick = 0; tick < 120; tick++) predictor.step({ throttle: 1, steer: 0 }, SIM_DT);
    expect(predictor.bus.z + BUS_LENGTH / 2).toBeLessThanOrEqual(56 + 1e-9);
  });
});
