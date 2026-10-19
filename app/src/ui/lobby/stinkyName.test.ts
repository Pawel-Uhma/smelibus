import { describe, expect, it } from 'vitest';
import { BOT_PREFIX, isOldDefaultName, NICK_MAX, stinkyBotName, stinkyName } from './stinkyName';

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

describe('stinkyBotName', () => {
  it('is marked as a bot and fits the nick limit', () => {
    for (let i = 0; i < 500; i++) {
      const name = stinkyBotName(new Set());
      expect(name.startsWith(BOT_PREFIX)).toBe(true);
      expect(name.length).toBeLessThanOrEqual(NICK_MAX);
    }
  });
  it('avoids taken names', () => {
    const first = stinkyBotName(new Set(), () => 0);
    expect(stinkyBotName(new Set([first]), () => 0)).not.toBe(first);
  });
});
