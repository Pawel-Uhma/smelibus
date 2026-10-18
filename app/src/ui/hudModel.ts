import { STINK_MAX, SUDDEN_DEATH } from '../shared/config';
import type { Bus, Player, PlayerId, Tile } from '../shared/types';
import { suddenDeathMultiplier } from '../sim/zones';

/** What the HUD reads from the game. Plain data, the HUD never writes back. */
export interface HudView {
  time: number;
  players: Player[];
  buses: Bus[];
  tiles: Tile[];
  winnerId?: PlayerId | null;
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
  winner: { id: PlayerId; name: string; color: string; me: boolean } | null;
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
  const next = SUDDEN_DEATH.filter((s) => s.after > view.time).sort((a, b) => a.after - b.after)[0];
  const winP = view.winnerId ? view.players.find((p) => p.id === view.winnerId) : undefined;

  return {
    rows,
    clock: formatClock(view.time),
    stink: Math.max(0, Math.min(STINK_MAX, ownBus?.stink ?? 0)),
    stinkMax: STINK_MAX,
    busId: ownBus?.id ?? null,
    multiplier: suddenDeathMultiplier(view.time),
    nextStepIn: next ? next.after - view.time : null,
    winner: winP ? { id: winP.id, name: winP.name, color: cssColor(winP.color), me: winP.id === me } : null,
  };
}
