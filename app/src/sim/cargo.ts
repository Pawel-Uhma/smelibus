import { ZUL_SIT_SECONDS } from '../shared/config';
import type { BonusCounts, BonusKind, Bus, GameState } from '../shared/types';

/** Adds one `kind` to a count (a new object, so a snapshot copy never shares it). */
export function addCount(counts: BonusCounts | undefined, kind: BonusKind): BonusCounts {
  return { ...counts, [kind]: (counts?.[kind] ?? 0) + 1 };
}

/**
 * Cargo stats (card 039): the only place a pickup is counted. Called from sim/bonus.ts
 * collect(), so the server sim and anything else running stepGame count the same thing.
 * The bus and its driver both get the bonus; a drunk also sits on board for ZUL_SIT_SECONDS.
 */
export function countPickup(state: GameState, bus: Bus, kind: BonusKind): void {
  bus.collected = addCount(bus.collected, kind);
  const driver = bus.driverId === null ? undefined : state.players.find((p) => p.id === bus.driverId);
  if (driver) driver.collected = addCount(driver.collected, kind);
  if (kind === 'zul') {
    bus.zulsUntil = [...(bus.zulsUntil ?? []).filter((t) => t > state.time), state.time + ZUL_SIT_SECONDS];
  }
}

/** Drunks sitting in the bus at game time `time`. */
export function zulsOnBoard(bus: Bus | undefined, time: number): number {
  return bus?.zulsUntil?.filter((t) => t > time).length ?? 0;
}
