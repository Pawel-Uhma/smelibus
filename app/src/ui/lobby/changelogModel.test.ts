import { describe, expect, it } from 'vitest';
import raw from '../../changelog.txt?raw';
import { parseChangelog, timeAgo, versionOf } from './changelogModel';

describe('changelog', () => {
  it('parses lines newest first and skips junk', () => {
    const e = parseChangelog('2026-10-18T10:00Z | Paweł | a\n\nzle\n2026-10-19T10:00Z | Antek | b\n');
    expect(e.map((x) => [x.who, x.text])).toEqual([['Antek', 'b'], ['Paweł', 'a']]);
    expect(versionOf(e)).toBe('v0.2');
  });

  it('every line of the real changelog parses', () => {
    const lines = raw.split('\n').filter((l) => l.trim());
    expect(parseChangelog(raw)).toHaveLength(lines.length);
  });

  it('says how long ago in Polish', () => {
    const now = new Date('2026-10-19T12:00Z');
    expect(timeAgo(new Date('2026-10-19T11:59:40Z'), now)).toBe('przed chwilą');
    expect(timeAgo(new Date('2026-10-19T11:55Z'), now)).toBe('5 min temu');
    expect(timeAgo(new Date('2026-10-19T09:00Z'), now)).toBe('3 godz. temu');
    expect(timeAgo(new Date('2026-10-18T10:00Z'), now)).toBe('wczoraj');
    expect(timeAgo(new Date('2026-10-15T10:00Z'), now)).toBe('4 dni temu');
  });
});
