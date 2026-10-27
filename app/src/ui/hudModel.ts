import { STINK_MAX, STINK_RELEASE_MIN } from '../shared/config';
import type { BonusCounts, Bus, Player, PlayerId, Tile } from '../shared/types';
import { zulsOnBoard } from '../sim/cargo';
import { nextSuddenDeathAt, suddenDeathMultiplier } from '../sim/zones';

/** What the HUD reads from the game. Plain data, the HUD never writes back. */
export interface HudView {
  time: number;
  players: Player[];
  buses: Bus[];
  tiles: Tile[];
  winnerId?: PlayerId | null;
  /** Own bus on screen (CSS px), where the stink pops rise from. */
  ownScreen?: { x: number; y: number } | null;
}

export interface HudPlayerRow {
  id: PlayerId;
  name: string;
  color: string;
  /** Share of the map, 0..100. */
  percent: number;
  me: boolean;
  connected: boolean;
}

export interface HudModel {
  rows: HudPlayerRow[];
  /** mm:ss since game start. */
  clock: string;
  /** Own bus stink, 0..STINK_MAX (0 when on foot). */
  stink: number;
  stinkMax: number;
  /** Bus the player drives, null on foot. */
  busId: number | null;
  /** Current sudden death multiplier, 1 before 8 min. */
  multiplier: number;
  /** Seconds until the next multiplier step, or null when there is none left. */
  nextStepIn: number | null;
  /** Own bus is full: the HUD tells the driver to press Space (card 042). */
  full: boolean;
  /** Own bus carries enough stink to let it out with Space. */
  canRelease: boolean;
  winner: { id: PlayerId; name: string; color: string; me: boolean } | null;
  /** Drunks sitting in the own bus right now (0 on foot). */
  zuls: number;
  /** Parcels and poops the player picked up this game. */
  parcels: number;
  poops: number;
  /** End-of-game cargo table, one row per player in `rows` order (card 039). */
  cargo: CargoRow[];
}

/** Columns of the cargo table: drunks, parcels, poops, everything else (totals this game). */
export const CARGO_COLUMNS = ['zul', 'parcel', 'poop', 'other'] as const;
export type CargoColumn = (typeof CARGO_COLUMNS)[number];

export interface CargoRow {
  id: PlayerId;
  name: string;
  color: string;
  me: boolean;
  counts: Record<CargoColumn, number>;
  /** Columns this player leads (highest count above 0; ties all lead). */
  leads: CargoColumn[];
}

/** Totals per cargo column; `other` sums every kind except drunks, parcels and poops. */
export function cargoCounts(c: BonusCounts | undefined): Record<CargoColumn, number> {
  let other = 0;
  for (const [k, n] of Object.entries(c ?? {})) if (k !== 'zul' && k !== 'parcel' && k !== 'poop') other += n ?? 0;
  return { zul: c?.zul ?? 0, parcel: c?.parcel ?? 0, poop: c?.poop ?? 0, other };
}

export function buildCargoTable(players: Player[], order: PlayerId[], me: PlayerId): CargoRow[] {
  const byId = new Map(players.map((p) => [p.id, p]));
  const rows = order.flatMap((id) => {
    const p = byId.get(id);
    return p ? [{ id, name: p.name, color: cssColor(p.color), me: id === me, counts: cargoCounts(p.collected), leads: [] as CargoColumn[] }] : [];
  });
  for (const col of CARGO_COLUMNS) {
    const best = Math.max(0, ...rows.map((r) => r.counts[col]));
    if (best > 0) for (const r of rows) if (r.counts[col] === best) r.leads.push(col);
  }
  return rows;
}

export const cssColor = (c: number) => '#' + c.toString(16).padStart(6, '0');

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function buildHudModel(view: HudView, me: PlayerId): HudModel {
  const counts = new Map<PlayerId, number>();
  for (const t of view.tiles) if (t.ownerId) counts.set(t.ownerId, (counts.get(t.ownerId) ?? 0) + 1);
  const total = Math.max(1, view.tiles.length);
  const rows = view.players
    .map((p) => ({
      id: p.id,
      name: p.name,
      color: cssColor(p.color),
      percent: ((counts.get(p.id) ?? 0) / total) * 100,
      me: p.id === me,
      connected: p.connected,
    }))
    .sort((a, b) => b.percent - a.percent || a.name.localeCompare(b.name));

  const meP = view.players.find((p) => p.id === me);
  const ownBus = view.buses.find((b) => b.id === meP?.busId);
  const winP = view.winnerId ? view.players.find((p) => p.id === view.winnerId) : undefined;

  return {
    rows,
    clock: formatClock(view.time),
    stink: Math.max(0, Math.min(STINK_MAX, ownBus?.stink ?? 0)),
    stinkMax: STINK_MAX,
    busId: ownBus?.id ?? null,
    multiplier: suddenDeathMultiplier(view.time),
    nextStepIn: nextSuddenDeathAt(view.time) - view.time,
    full: !!ownBus && ownBus.stink >= STINK_MAX - 0.5,
    canRelease: !!ownBus && ownBus.stink >= STINK_RELEASE_MIN,
    winner: winP ? { id: winP.id, name: winP.name, color: cssColor(winP.color), me: winP.id === me } : null,
    zuls: zulsOnBoard(ownBus, view.time),
    parcels: meP?.collected?.parcel ?? 0,
    poops: meP?.collected?.poop ?? 0,
    cargo: buildCargoTable(view.players, rows.map((r) => r.id), me),
  };
}
