import { describe, expect, it } from 'vitest';
import { createStinkPops } from './stinkPops';

describe('stink pops', () => {
  it('pops a pickup and a jump at once', () => {
    const pops = createStinkPops();
    expect(pops.update(10, 1, 0.016)).toEqual([]);
    expect(pops.update(25, 1, 0.016)).toEqual([15]);
    expect(pops.update(0, 1, 0.016)).toEqual([-25]);
  });

  it('stays quiet on normal decay', () => {
    const pops = createStinkPops();
    pops.update(50, 1, 0);
    let all: number[] = [];
    for (let i = 1; i <= 180; i++) all = all.concat(pops.update(50 - i * 0.5 / 60, 1, 1 / 60));
    expect(all).toEqual([]);
  });

  it('sums rain into one pop per second', () => {
    const pops = createStinkPops();
    pops.update(50, 1, 0);
    let all: number[] = [];
    for (let i = 1; i <= 70; i++) all = all.concat(pops.update(50 - i * 3.5 / 60, 1, 1 / 60));
    expect(all).toEqual([-4]);
  });

  it('does not pop when switching buses', () => {
    const pops = createStinkPops();
    pops.update(10, 1, 0.016);
    expect(pops.update(60, 2, 0.016)).toEqual([]);
    expect(pops.update(0, null, 0.016)).toEqual([]);
  });
});
