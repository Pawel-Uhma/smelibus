import { describe, expect, it } from 'vitest';
import { isOldDefaultName, NICK_MAX, stinkyName } from './stinkyName';

describe('stinkyName', () => {
  it('always fits the nick input', () => {
    for (let i = 0; i < 500; i++) expect(stinkyName().length).toBeLessThanOrEqual(NICK_MAX);
  });

  it('is deterministic for a given random source', () => {
    expect(stinkyName(() => 0)).toBe(stinkyName(() => 0));
  });

  it('spots the old default nick', () => {
    expect(isOldDefaultName('Kierowca42')).toBe(true);
    expect(isOldDefaultName('Antek')).toBe(false);
  });
});
