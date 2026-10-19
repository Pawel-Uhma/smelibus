import { describe, expect, it } from 'vitest';
import { aimToInput, mergeInputs, stickToInput } from './touch';

describe('stickToInput', () => {
  it('ignores a thumb inside the dead zone', () => {
    expect(stickToInput(3, -4, 56)).toEqual({ throttle: 0, steer: 0 });
  });

  it('maps up to gas and right to steer right', () => {
    expect(stickToInput(0, -56, 56)).toEqual({ throttle: 1, steer: 0 });
    expect(stickToInput(56, 0, 56)).toEqual({ throttle: 0, steer: 1 });
    expect(stickToInput(0, 28, 56).throttle).toBeCloseTo(-0.5);
  });

  it('keeps only the direction past the rim', () => {
    const far = stickToInput(300, -300, 56);
    expect(far.throttle).toBeCloseTo(0.7);
    expect(far.steer).toBeCloseTo(0.7);
  });

  it('rounds to steps so tiny thumb jitter keeps the same input', () => {
    expect(stickToInput(22, -40, 56)).toEqual(stickToInput(23, -40, 56));
  });
});

describe('mergeInputs', () => {
  it('adds axes with a clamp and sums the use, jump and horn counters', () => {
    expect(mergeInputs({ throttle: 1, steer: -0.5, use: 2, horn: 1 }, { throttle: 1, steer: 0.2, use: 3 }))
      .toEqual({ throttle: 1, steer: expect.closeTo(-0.3), use: 5, jump: 0, horn: 1 });
  });
});

describe('aimToInput', () => {
  // Bus angle 0 faces +z, which is up on screen.
  const up = { angle: 0, speed: 5 };

  it('drives straight when the stick points where the bus faces', () => {
    expect(aimToInput(0, -56, up)).toEqual({ throttle: 1, steer: 0 });
  });

  it('turns toward the stick: right on screen steers right', () => {
    expect(aimToInput(56, 0, up)).toEqual({ throttle: 1, steer: 1 });
    expect(aimToInput(-56, 0, up)).toEqual({ throttle: 1, steer: -1 });
  });

  it('uses the screen direction, not the wheels: a bus facing right goes straight on stick right', () => {
    expect(aimToInput(56, 0, { angle: -Math.PI / 2, speed: 5 })).toEqual({ throttle: 1, steer: 0 });
  });

  it('a stopped bus backs up toward a stick behind it', () => {
    expect(aimToInput(0, 56, { angle: 0, speed: 0 })).toEqual({ throttle: -1, steer: 0 });
  });

  it('a fast bus told to go back turns around and coasts', () => {
    const turn = aimToInput(10, 56, { angle: 0, speed: 12 });
    expect(turn.throttle).toBe(0);
    expect(Math.abs(turn.steer)).toBe(1);
  });

  it('ignores a thumb inside the dead zone', () => {
    expect(aimToInput(2, -3, up)).toEqual({ throttle: 0, steer: 0 });
  });
});
