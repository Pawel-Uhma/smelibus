import { CITY_STREETS } from '../shared/config';
import type { CityStreet, World } from '../shared/types';
import { streetHalfWidth } from './city';

/** Spots on the city sidewalks for street furniture and walkers (cards 044, 045). */

/** A trash can stands this far outside the carriageway edge, on the kerb side of the sidewalk. */
const CURB_OFFSET = 0.35;

interface Side {
  s: CityStreet;
  side: number;
  /** Usable length between the junction trims. */
  from: number;
  to: number;
}

function sides(world: World): Side[] {
  const out: Side[] = [];
  for (const s of world.streets ?? []) {
    const len = Math.hypot(s.bx - s.ax, s.bz - s.az);
    const from = s.trimA + 1, to = len - s.trimB - 1;
    if (to - from < 4) continue;
    for (const side of [1, -1]) out.push({ s, side, from, to });
  }
  return out;
}

/** Point at distance `t` along a street, `off` to its `side`. */
function at(s: CityStreet, t: number, side: number, off: number): { x: number; z: number } {
  const len = Math.hypot(s.bx - s.ax, s.bz - s.az);
  const ux = (s.bx - s.ax) / len, uz = (s.bz - s.az) / len;
  return { x: s.ax + ux * t - uz * side * off, z: s.az + uz * t + ux * side * off };
}

/** Picks a street side with chance by its length. */
function pickSide(all: Side[], rand: () => number): Side | null {
  const total = all.reduce((n, a) => n + (a.to - a.from), 0);
  let r = rand() * total;
  for (const a of all) if ((r -= a.to - a.from) < 0) return a;
  return all[all.length - 1] ?? null;
}

const inside = (world: World, p: { x: number; z: number }) => {
  const { size, tiles } = world;
  if (p.x < 1.5 || p.z < 1.5 || p.x > size - 1.5 || p.z > size - 1.5) return false;
  return tiles[Math.floor(p.z) * size + Math.floor(p.x)]?.kind === 'road';
};

/** A spot on the kerb of a random street (a trash can), or null on a map without streets. */
export function curbSpot(world: World, rand: () => number): { x: number; z: number } | null {
  const all = sides(world);
  for (let tries = 0; tries < 20 && all.length; tries++) {
    const a = pickSide(all, rand)!;
    const p = CITY_STREETS[a.s.kind];
    const spot = at(a.s, a.from + rand() * (a.to - a.from), a.side, p.median + p.road + CURB_OFFSET);
    if (inside(world, spot)) return spot;
  }
  return null;
}

/** A stretch of sidewalk to walk up and down (a ticket controller), or null without streets. */
export function sidewalkPatrol(world: World, rand: () => number, maxLength: number):
  { ax: number; az: number; bx: number; bz: number } | null {
  const all = sides(world);
  for (let tries = 0; tries < 200 && all.length; tries++) {
    const a = pickSide(all, rand)!;
    const off = streetHalfWidth(a.s, a.side) - CITY_STREETS[a.s.kind].walk / 2;
    const length = Math.min(maxLength, a.to - a.from);
    const t0 = a.from + rand() * (a.to - a.from - length);
    // Every step of the way must be sidewalk (streets can run off the map edge).
    let ok = true;
    for (let d = 0; d <= length && ok; d += 0.1) ok = inside(world, at(a.s, t0 + d, a.side, off));
    if (!ok) continue;
    const p0 = at(a.s, t0, a.side, off), p1 = at(a.s, t0 + length, a.side, off);
    return { ax: p0.x, az: p0.z, bx: p1.x, bz: p1.z };
  }
  return null;
}
