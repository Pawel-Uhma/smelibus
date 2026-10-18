/** A change of own stink in one frame at least this big pops at once (pickup, ram, jump). */
export const POP_JUMP_MIN = 2;
/** Slow changes (rain, Harnaś) are summed and popped every POP_WINDOW_S seconds... */
export const POP_WINDOW_S = 1;
/** ...if they add up to at least this much. Above normal decay, so plain driving stays quiet. */
export const POP_DRIFT_MIN = 1.2;

/** Rounds half away from zero, so a gain and a loss of the same size show the same number. */
const round = (v: number) => Math.sign(v) * Math.round(Math.abs(v));

/**
 * Turns the own bus stink, read every frame, into "+N" / "−N" pops for the HUD.
 * Getting into another bus (or out of one) resets it without a pop.
 */
export function createStinkPops() {
  let busId: number | null = null;
  let last = 0;
  let drift = 0;
  let window = 0;

  return {
    /** Returns the deltas to show this frame (rounded, never 0). */
    update(stink: number, ownBusId: number | null, dt: number): number[] {
      if (ownBusId !== busId) {
        busId = ownBusId;
        last = stink;
        drift = 0;
        window = 0;
        return [];
      }
      const pops: number[] = [];
      const delta = stink - last;
      last = stink;
      if (Math.abs(delta) >= POP_JUMP_MIN) pops.push(round(delta));
      else drift += delta;
      window += dt;
      if (window >= POP_WINDOW_S) {
        if (Math.abs(drift) >= POP_DRIFT_MIN) pops.push(round(drift));
        drift = 0;
        window = 0;
      }
      return pops.filter((p) => p !== 0);
    },
  };
}
