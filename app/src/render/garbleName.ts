import { STINK_LOOK_MAX } from '../shared/config';

const DIACRITIC: Record<string, string> = {
  a: 'ą', c: 'ć', e: 'ę', l: 'ł', n: 'ń', o: 'ó', s: 'ś', z: 'ź',
  i: 'ï', u: 'ü', y: 'ÿ', r: 'ř', k: 'ķ', d: 'đ', g: 'ğ', t: 'ŧ',
};

/** Deterministic 0..1 per (name, index, salt), so the garbling is stable frame to frame. */
function hash01(name: string, i: number, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let k = 0; k < name.length; k++) h = Math.imul(h ^ name.charCodeAt(k), 16777619);
  h = Math.imul(h ^ (i + 1), 2654435761);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/**
 * The stinkier the bus, the more mangled the driver's nick ("Szczepan" → "sZĆPn").
 * Each letter has its own fixed threshold, so more stink only ever adds damage.
 * Stink is quantised to 10 steps so the label texture is not redrawn every frame.
 */
export function garbleName(name: string, stink: number): string {
  const level = Math.floor(Math.min(1, Math.max(0, stink / STINK_LOOK_MAX)) * 10) / 10;
  if (level <= 0) return name;
  const chars = [...name];
  let out = '';
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    // Up to ~85% of letters damaged at max stink.
    if (hash01(name, i, 1) * 1.15 >= level) {
      out += ch;
      continue;
    }
    const kind = hash01(name, i, 2);
    const lower = ch.toLowerCase();
    if (kind < 0.25) continue; // dropped
    if (kind < 0.55) out += DIACRITIC[lower] ? (ch === lower ? DIACRITIC[lower] : DIACRITIC[lower].toUpperCase()) : flip(ch);
    else if (kind < 0.85) out += flip(ch);
    else out += ch + ch; // stutter
  }
  return out || chars[0];
}

function flip(ch: string): string {
  const up = ch.toUpperCase();
  return ch === up ? ch.toLowerCase() : up;
}
