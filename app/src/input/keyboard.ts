import type { BusInput } from '../shared/types';

/** One player per computer: WASD or arrows. Turns key events into a BusInput. */
export function createKeyboard(target: Window = window): { read(): BusInput } {
  const down = new Set<string>();
  // E presses are counted, so one press can't get lost between two input messages.
  let use = 0;
  target.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement) return;
    down.add(e.code);
    if (e.code === 'KeyE' && !e.repeat) use++;
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  });
  target.addEventListener('keyup', (e) => down.delete(e.code));
  target.addEventListener('blur', () => down.clear());
  const any = (...codes: string[]) => codes.some((c) => down.has(c));
  return {
    read: () => ({
      throttle: (any('KeyW', 'ArrowUp') ? 1 : 0) - (any('KeyS', 'ArrowDown', 'Space') ? 1 : 0),
      steer: (any('KeyD', 'ArrowRight') ? 1 : 0) - (any('KeyA', 'ArrowLeft') ? 1 : 0),
      use,
    }),
  };
}
