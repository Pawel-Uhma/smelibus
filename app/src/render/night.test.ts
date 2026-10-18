import { describe, expect, it } from 'vitest';
import { DAY_NIGHT_CYCLE, DAY_NIGHT_CYCLE_S, NIGHT_SHARE, TWILIGHT_S } from '../shared/config';
import { nightLevel, nightModeFromUrl } from './night';

describe('day/night cycle', () => {
  const duskStart = DAY_NIGHT_CYCLE_S * (1 - NIGHT_SHARE);

  it('starts in daylight, gets dark after the dusk, and is day again at the next cycle', () => {
    expect(nightLevel(0)).toBe(0);
    expect(nightLevel(duskStart - 1)).toBe(0);
    expect(nightLevel(duskStart + TWILIGHT_S / 2)).toBeCloseTo(0.5);
    expect(nightLevel(duskStart + TWILIGHT_S + 1)).toBe(1);
    expect(nightLevel(DAY_NIGHT_CYCLE_S - TWILIGHT_S / 2)).toBeCloseTo(0.5);
    expect(nightLevel(DAY_NIGHT_CYCLE_S)).toBe(0);
    expect(nightLevel(DAY_NIGHT_CYCLE_S + duskStart + TWILIGHT_S + 1)).toBe(1);
  });

  it('changes smoothly, without a jump between frames', () => {
    for (let t = 0; t < 2 * DAY_NIGHT_CYCLE_S; t += 0.1) {
      expect(Math.abs(nightLevel(t + 0.1) - nightLevel(t))).toBeLessThan(0.05);
    }
  });

  it('reads ?noc from the URL, falling back to the cycle', () => {
    expect(nightModeFromUrl('?noc')).toBe('night');
    expect(nightModeFromUrl('?code=ABCD&night=1')).toBe('night');
    expect(nightModeFromUrl('?noc=0')).toBe('day');
    expect(nightModeFromUrl('')).toBe(DAY_NIGHT_CYCLE ? 'cycle' : 'day');
  });
});
