import { PREDICTION_CORRECT_RATE, PREDICTION_SNAP_DIST, SIM_DT } from '../shared/config';
import type { Bus, BusInput, InputAck } from '../shared/types';
import { collideWithOthers, updateBus } from './bus';
import { collideZabkas } from './zabka';

/** Local ticks kept for replaying on top of the server (covers pings up to ~1.5 s). */
const HISTORY_TICKS = 90;

/** Numbers input changes. Module-wide, so a new predictor (bus change) never reuses an acked seq. */
let lastSeq = 0;

export interface BusPredictor {
  /** The locally predicted bus to draw. */
  readonly bus: Bus;
  /** Seq of the current input; send it with the input so the server can ack it. */
  readonly seq: number;
  /** Runs the sim for `dt` seconds of local input (fixed SIM_DT steps), blocked by `others` as drawn. */
  step(input: BusInput, dt: number, others?: readonly Bus[]): void;
  /** Call once per new snapshot: takes the server's bus and replays the ticks it hasn't seen yet. */
  reconcile(server: Bus, ack?: InputAck, others?: readonly Bus[]): void;
}

const angleDiff = (from: number, to: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

/**
 * Client-side prediction of the player's own bus. The server acks the last input seq it got and
 * how many ticks it has run it for, so its bus matches an exact local tick. Reconciling starts
 * from the server's bus and replays the local inputs after that tick: no guessing, no drift.
 * The jump between the old and new prediction is hidden by a visual offset that fades out.
 */
export function createBusPredictor(
  start: Bus, mapSize: number, zabkas?: readonly { x: number; z: number }[],
): BusPredictor {
  const sim: Bus = { ...start };
  const bus: Bus = { ...start };
  /** Inputs of local ticks [base, tick). */
  let inputs: BusInput[] = [];
  let tick = 0;
  /** Local tick at which each recent input seq started. */
  const starts = new Map<number, number>();
  let current: BusInput | null = null;
  let acc = 0;
  let ox = 0, oz = 0, oa = 0;

  const simulate = (input: BusInput, others: readonly Bus[]) => {
    updateBus(sim, input, SIM_DT, mapSize);
    collideZabkas(sim, zabkas);
    collideWithOthers(sim, others, mapSize);
  };
  const draw = () => {
    Object.assign(bus, sim);
    bus.x += ox;
    bus.z += oz;
    bus.angle += oa;
  };

  return {
    bus,
    get seq() {
      return lastSeq;
    },
    step(input, dt, others = []) {
      if (!current || input.throttle !== current.throttle || input.steer !== current.steer) {
        current = { throttle: input.throttle, steer: input.steer };
        starts.set(++lastSeq, tick);
        if (starts.size > 200) starts.delete(starts.keys().next().value!);
      }
      acc += dt;
      while (acc >= SIM_DT) {
        simulate(current, others);
        inputs.push(current);
        if (inputs.length > HISTORY_TICKS) inputs.shift();
        tick++;
        acc -= SIM_DT;
      }
      const k = Math.exp(-dt * PREDICTION_CORRECT_RATE);
      ox *= k;
      oz *= k;
      oa *= k;
      draw();
    },
    reconcile(server, ack, others = []) {
      const base = tick - inputs.length;
      const begun = ack && starts.get(ack.seq);
      // No ack for this predictor's inputs yet: the server has seen none of them, replay them all.
      // Otherwise it ran the acked input for ack.ticks ticks, but never past where the next one began.
      const from = begun === undefined
        ? base
        : Math.max(base, Math.min(begun + ack!.ticks, starts.get(ack!.seq + 1) ?? tick, tick));
      const shown = { x: bus.x, z: bus.z, angle: bus.angle };
      inputs = inputs.slice(from - base);
      Object.assign(sim, server);
      for (const input of inputs) simulate(input, others);
      ox = shown.x - sim.x;
      oz = shown.z - sim.z;
      oa = angleDiff(sim.angle, shown.angle);
      if (Math.hypot(ox, oz) > PREDICTION_SNAP_DIST) ox = oz = oa = 0;
      draw();
    },
  };
}
