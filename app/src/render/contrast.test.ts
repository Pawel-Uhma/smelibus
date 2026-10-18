import { describe, expect, it } from 'vitest';
import { initialContrast } from './contrast';

describe('initialContrast', () => {
  it('follows the system setting when nothing else is set', () => {
    expect(initialContrast('', null, true)).toBe(true);
    expect(initialContrast('', null, false)).toBe(false);
  });
  it('prefers the stored choice over the system', () => {
    expect(initialContrast('', '0', true)).toBe(false);
    expect(initialContrast('', '1', false)).toBe(true);
  });
  it('lets the URL override everything', () => {
    expect(initialContrast('?kontrast', '0', false)).toBe(true);
    expect(initialContrast('?kontrast=0', '1', true)).toBe(false);
  });
});
