import { describe, expect, it } from 'vitest';
import { joinErrorMessage, normalizePartyCode } from './partyCode';

describe('normalizePartyCode', () => {
  it('uppercases and trims', () => {
    expect(normalizePartyCode('  abcd ')).toBe('ABCD');
  });
  it('drops inner spaces, dashes and newlines', () => {
    expect(normalizePartyCode('ab cd')).toBe('ABCD');
    expect(normalizePartyCode('AB-CD\n')).toBe('ABCD');
    expect(normalizePartyCode('\tA B C D')).toBe('ABCD');
  });
  it('takes the code out of a pasted link', () => {
    expect(normalizePartyCode('https://smelibus.pl/p/wxyz')).toBe('WXYZ');
    expect(normalizePartyCode('Wbijaj: smelibus.pl/p/QRST?x=1')).toBe('QRST');
  });
  it('returns empty for nothing useful', () => {
    expect(normalizePartyCode('   ')).toBe('');
    expect(normalizePartyCode('')).toBe('');
  });
});

describe('joinErrorMessage', () => {
  it('maps Colyseus matchmaking errors', () => {
    expect(joinErrorMessage(new Error('room "ABCD" not found'), 'ABCD')).toBe('Nie ma party o kodzie ABCD');
    expect(joinErrorMessage(new Error('room "ABCD" is locked'), 'ABCD')).toBe('Party ABCD jest pełne');
    expect(joinErrorMessage(new Error(''), 'ABCD')).toBe('Nie udało się: serwer nie odpowiada');
  });
});
