import { describe, expect, it } from 'vitest';
import { STINK_MAX } from '../shared/config';
import { garbleName } from './garbleName';

describe('garbleName', () => {
  it('leaves a fresh bus alone', () => {
    expect(garbleName('Szczepan', 0)).toBe('Szczepan');
  });

  it('is stable for the same stink', () => {
    expect(garbleName('Szczepan', 60)).toBe(garbleName('Szczepan', 60));
  });

  it('mangles the nick at max stink but never empties it', () => {
    const g = garbleName('Szczepan', STINK_MAX);
    expect(g).not.toBe('Szczepan');
    expect(g.length).toBeGreaterThan(0);
    expect(garbleName('A', STINK_MAX).length).toBeGreaterThan(0);
  });
});
