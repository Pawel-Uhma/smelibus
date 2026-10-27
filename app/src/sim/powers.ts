import {
  BONUS_STINK, CABBAGE_STINK_MULT, ENERGY_SPEED_BONUS, PACZKOMAT_LOOT_WEIGHTS, PACZKOMAT_REVEAL_S, POWER_SECONDS,
  STINK_MAX,
} from '../shared/config';
import type { Bus, GameState, LootKind, PowerKind } from '../shared/types';
import { rand } from './bonus';
import { countPickup } from './cargo';

/** Locker loot and power-ups (card 043). Pure sim: the HUD only reads `bus.roll` and `bus.power`. */

/** Draws one loot by PACZKOMAT_LOOT_WEIGHTS from the bonus RNG. */
export function rollLoot(state: GameState): LootKind {
  const entries = Object.entries(PACZKOMAT_LOOT_WEIGHTS) as [LootKind, number][];
  let r = rand(state) * entries.reduce((s, [, w]) => s + w, 0);
  for (const [kind, w] of entries) if ((r -= w) < 0) return kind;
  return entries[0][0];
}

/** Starts a roll for `bus`: the reel spins, the loot lands PACZKOMAT_REVEAL_S later. */
export function startRoll(state: GameState, bus: Bus): LootKind {
  const loot = rollLoot(state);
  bus.roll = { loot, at: state.time };
  return loot;
}

export const powerActive = (bus: Bus, kind: PowerKind, time: number) =>
  bus.power?.kind === kind && time >= bus.power.from && time < bus.power.until;

/** Stink a bonus of `amount` gives this bus now: cabbage doubles the good stuff. */
export function stinkGain(bus: Bus, amount: number, time: number): number {
  return amount > 0 && powerActive(bus, 'cabbage', time) ? amount * CABBAGE_STINK_MULT : amount;
}

function apply(state: GameState, bus: Bus, loot: LootKind): void {
  if (loot === 'poop') {
    bus.stink = Math.min(STINK_MAX, bus.stink + stinkGain(bus, BONUS_STINK.poop, state.time));
    countPickup(state, bus, 'poop');
    return;
  }
  bus.power = { kind: loot, from: state.time, until: state.time + POWER_SECONDS[loot] };
}

/**
 * Once per sim step: lands finished rolls, drops expired power-ups and sets the derived flags the
 * rest of the sim reads without a clock (speedMult in updateBus, shielded in rams). `riderBoost`
 * (card 046) adds its share of top speed on top.
 */
export function updatePowers(state: GameState): void {
  for (const bus of state.buses) {
    if (bus.roll && !bus.roll.done && state.time >= bus.roll.at + PACZKOMAT_REVEAL_S) {
      bus.roll = { ...bus.roll, done: true };
      apply(state, bus, bus.roll.loot);
    }
    if (bus.power && state.time >= bus.power.until) bus.power = undefined;
    const mult = 1 + (powerActive(bus, 'energy', state.time) ? ENERGY_SPEED_BONUS : 0) + (bus.riderBoost ?? 0);
    bus.speedMult = mult === 1 ? undefined : mult;
    bus.shielded = powerActive(bus, 'ticket', state.time) || undefined;
  }
}
