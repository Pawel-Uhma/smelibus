import { describe, expect, it } from 'vitest';
import { SIM_DT } from '../shared/config';
import type { Bus, BusInput } from '../shared/types';
import { updateBus } from './bus';
import { createBusPredictor } from './prediction';

const bus = (over: Partial<Bus> = {}): Bus => ({
  id: 0, x: 50, z: 50, angle: 0, speed: 0, driverId: null, stink: 0, ...over,
});
const turning: BusInput = { throttle: 1, steer: 1 };
const dist = (a: Bus, b: Bus) => Math.hypot(a.x - b.x, a.z - b.z);

describe('createBusPredictor', () => {
  it('does not drift in a turn when the server lags behind on the same path', () => {
    const start = bus({ speed: 8 });
    const predictor = createBusPredictor(start, 1000);
    const local = { ...start };
    const server = { ...start };
    const lag = 12; // ticks, ~200 ms
    for (let tick = 0; tick < 180; tick++) {
      updateBus(local, turning, SIM_DT, 1000);
      if (tick >= lag) updateBus(server, turning, SIM_DT, 1000);
      predictor.step(turning, SIM_DT);
      predictor.reconcile(server, SIM_DT);
    }
    expect(dist(predictor.bus, local)).toBeLessThan(0.05);
  });

  it('eases toward the server when they really disagree', () => {
    const predictor = createBusPredictor(bus(), 1000);
    const server = bus({ x: 51 });
    for (let tick = 0; tick < 180; tick++) {
      predictor.step({ throttle: 0, steer: 0 }, SIM_DT);
      predictor.reconcile(server, SIM_DT);
    }
    expect(predictor.bus.x).toBeCloseTo(51, 1);
  });

  it('snaps when the server is far away', () => {
    const predictor = createBusPredictor(bus(), 1000);
    predictor.reconcile(bus({ x: 80, stink: 40 }), SIM_DT);
    expect(predictor.bus).toMatchObject({ x: 80, stink: 40 });
  });

  it('takes stink from the server right away while easing', () => {
    // Otherwise the driver sees a clean bus while everyone else sees it stinking.
    const predictor = createBusPredictor(bus(), 1000);
    predictor.step({ throttle: 0, steer: 0 }, SIM_DT);
    predictor.reconcile(bus({ x: 50.5, stink: 85 }), SIM_DT);
    expect(predictor.bus.stink).toBe(85);
    expect(predictor.bus.x).toBeLessThan(50.5);
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
      predictor.reconcile(bus({ pushX: 6 }), SIM_DT);
    }
    expect(predictor.bus.pushX).toBeGreaterThan(0);
  });
});
