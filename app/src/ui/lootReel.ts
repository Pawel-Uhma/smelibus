import { PACZKOMAT_REVEAL_S } from '../shared/config';
import type { LootKind, PowerKind } from '../shared/types';

/** How each locker loot looks in the HUD (card 043). */
export const LOOT_LOOK: Record<LootKind, { icon: string; name: string; got: string }> = {
  poop: { icon: '💩', name: 'Kupa', got: 'Kupa! +30 smrodu' },
  energy: { icon: '⚡', name: 'Energetyk', got: 'Energetyk! +35% prędkości' },
  ticket: { icon: '🎫', name: 'Bilet', got: 'Bilet miesięczny! Kontroler i taran nic nie zabierają' },
  cabbage: { icon: '🥬', name: 'Kapusta', got: 'Kiszona kapusta! Smród ×2' },
};
const KINDS = Object.keys(LOOT_LOOK) as LootKind[];
const SLOT = 84;
const SLOTS = 32;
const FINAL = 27;

/**
 * Locker roll: a strip of loot that spins under a frame at the bottom of the screen and stops on
 * what the server rolled, then says what it was. Plus the active power-up chip with its timer.
 */
export function createLootReel(root: HTMLElement) {
  const box = document.createElement('div');
  box.className = 'loot-reel';
  box.hidden = true;
  box.innerHTML = `<div class="loot-title">Paczkomat…</div><div class="loot-window"><div class="loot-strip"></div></div><div class="loot-got"></div>`;
  const chip = document.createElement('div');
  chip.className = 'power-chip';
  chip.hidden = true;
  chip.innerHTML = `<span class="ico"></span><span class="name"></span><span class="left"></span><i></i>`;
  root.append(box, chip);
  const strip = box.querySelector<HTMLDivElement>('.loot-strip')!;
  const got = box.querySelector<HTMLDivElement>('.loot-got')!;
  const title = box.querySelector<HTMLDivElement>('.loot-title')!;
  let shownAt: number | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let lastPower = '';

  function spin(loot: LootKind, elapsed: number) {
    const items = Array.from({ length: SLOTS }, (_, i) => (i === FINAL ? loot : KINDS[Math.floor(Math.random() * KINDS.length)]));
    strip.innerHTML = items.map((k) => `<div class="loot-slot"><span>${LOOT_LOOK[k].icon}</span><small>${LOOT_LOOK[k].name}</small></div>`).join('');
    got.textContent = '';
    title.textContent = 'Paczkomat…';
    box.hidden = false;
    box.classList.remove('done');
    const target = () => box.querySelector<HTMLDivElement>('.loot-window')!.clientWidth / 2 - (FINAL * SLOT + SLOT / 2);
    const left = Math.max(0, PACZKOMAT_REVEAL_S - elapsed);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    strip.style.transition = 'none';
    strip.style.transform = 'translateX(0)';
    void strip.offsetWidth;
    strip.style.transition = reduce || left < 0.2 ? 'none' : `transform ${left}s cubic-bezier(.12,.75,.18,1)`;
    strip.style.transform = `translateX(${target()}px)`;
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      box.classList.add('done');
      title.textContent = 'Masz!';
      got.textContent = LOOT_LOOK[loot].got;
      hideTimer = setTimeout(() => (box.hidden = true), 2200);
    }, left * 1000);
  }

  return {
    update(roll: { loot: LootKind; at: number; spinning: boolean } | null, power: { kind: PowerKind; left: number; total: number } | null, time: number) {
      // A new roll that is still spinning; one we join late (after a reload) is not replayed.
      if (roll && roll.at !== shownAt) {
        shownAt = roll.at;
        if (roll.spinning) spin(roll.loot, time - roll.at);
      }
      const key = power ? `${power.kind}|${Math.ceil(power.left)}` : '';
      if (key !== lastPower) {
        lastPower = key;
        chip.hidden = !power;
        if (power) {
          chip.querySelector('.ico')!.textContent = LOOT_LOOK[power.kind].icon;
          chip.querySelector('.name')!.textContent = LOOT_LOOK[power.kind].name;
          chip.querySelector('.left')!.textContent = `${Math.ceil(power.left)} s`;
        }
      }
      if (power) chip.style.setProperty('--f', String(power.left / power.total));
    },
  };
}
