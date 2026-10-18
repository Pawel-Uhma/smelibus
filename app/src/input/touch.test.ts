import { describe, expect, it } from 'vitest';
import { mergeInputs, stickToInput } from './touch';

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
  it('adds axes with a clamp and sums the use counters', () => {
    expect(mergeInputs({ throttle: 1, steer: -0.5, use: 2 }, { throttle: 1, steer: 0.2, use: 3 }))
      .toEqual({ throttle: 1, steer: expect.closeTo(-0.3), use: 5, jump: 0 });
  });
});
