import { PREDICTION_CORRECT_RATE, PREDICTION_SNAP_DIST, SIM_DT } from '../shared/config';
import type { Bus, BusInput } from '../shared/types';
import { collideWithOthers, updateBus } from './bus';

/** Local ticks kept for matching against the server (covers pings up to ~1.5 s). */
const HISTORY_TICKS = 90;

interface Sample {
  x: number;
  z: number;
  angle: number;
  speed: number;
  pushX: number;
  pushZ: number;
}

const angleDiff = (from: number, to: number) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

export interface BusPredictor {
  /** The locally predicted bus to draw. */
  readonly bus: Bus;
  /** Runs the sim for `dt` seconds of local input (fixed SIM_DT steps), blocked by `others` as drawn. */
  step(input: BusInput, dt: number, others?: readonly Bus[]): void;
  /** Eases toward the server's version of the bus. */
  reconcile(server: Bus, dt: number): void;
}

/**
 * Client-side prediction of the player's own bus. The server's bus lags behind by the ping, so
 * it is compared with the local state from back then (the closest recent sample), not with the
 * current one. Pulling toward the lagging position directly made the bus slide sideways in turns.
 */
export function createBusPredictor(start: Bus, mapSize: number): BusPredictor {
  const bus: Bus = { ...start };
  let history: Sample[] = [];
  let acc = 0;
  let lastOthers: readonly Bus[] = [];

  function record() {
    history.push({
      x: bus.x, z: bus.z, angle: bus.angle, speed: bus.speed, pushX: bus.pushX ?? 0, pushZ: bus.pushZ ?? 0,
    });
    if (history.length > HISTORY_TICKS) history.shift();
  }
  record();

  return {
    bus,
    step(input, dt, others = []) {
      acc += dt;
      while (acc >= SIM_DT) {
        updateBus(bus, input, SIM_DT, mapSize);
        collideWithOthers(bus, others, mapSize);
        lastOthers = others;
        record();
        acc -= SIM_DT;
      }
    },
    reconcile(server, dt) {
      // Everything except motion comes straight from the server.
      const { x, z, angle, speed, pushX = 0, pushZ = 0, ...rest } = server;
      Object.assign(bus, rest);

      let best = history[history.length - 1];
      let bestScore = Infinity;
      for (const s of history) {
        const score = (s.x - x) ** 2 + (s.z - z) ** 2 + angleDiff(s.angle, angle) ** 2;
        if (score < bestScore) {
          bestScore = score;
          best = s;
        }
      }
      const ex = x - best.x;
      const ez = z - best.z;
      if (Math.hypot(ex, ez) > PREDICTION_SNAP_DIST) {
        Object.assign(bus, { x, z, angle, speed, pushX, pushZ });
        history = [];
        record();
        return;
      }
      const ea = angleDiff(best.angle, angle);
      const es = speed - best.speed;
      const epx = pushX - best.pushX;
      const epz = pushZ - best.pushZ;
      const k = 1 - Math.exp(-dt * PREDICTION_CORRECT_RATE);
      // Shift the whole history too, so the same snapshot is not corrected for twice.
      for (const s of history) {
        s.x += ex * k;
        s.z += ez * k;
        s.angle += ea * k;
        s.speed += es * k;
        s.pushX += epx * k;
        s.pushZ += epz * k;
      }
      bus.x += ex * k;
      bus.z += ez * k;
      bus.angle += ea * k;
      bus.speed += es * k;
      // A knock-back only the server saw (someone rammed us) shows up here.
      if (epx || epz) {
        bus.pushX = (bus.pushX ?? 0) + epx * k;
        bus.pushZ = (bus.pushZ ?? 0) + epz * k;
      }
      // Easing must not pull the bus into one it was blocked by.
      collideWithOthers(bus, lastOthers, mapSize);
    },
  };
}
