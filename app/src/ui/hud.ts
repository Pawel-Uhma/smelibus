import type { PlayerId } from '../shared/types';
import { buildHudModel, formatClock, type HudView } from './hudModel';

export type { HudView } from './hudModel';

/**
 * In-game HUD over the canvas: party code, map share per player, clock with sudden death,
 * own bus stink, and the win screen. Only reads the view passed to update().
 */
export function createHud(root: HTMLElement, code: string, me: PlayerId) {
  root.innerHTML = `
    <div class="hud">
      <div class="party">Party <b>${code}</b> <button id="copy">Kopiuj link</button></div>
      <ul id="players"></ul>
      <div class="help">WASD / strzałki: jazda · spacja: hamulec</div>
    </div>
    <div class="hud-clock">
      <div id="clock" class="time">0:00</div>
      <div id="sudden" class="sudden" hidden></div>
    </div>
    <div class="hud-stink">
      <div class="label">Smród <b id="stink-val">0</b></div>
      <div class="bar"><div id="stink-bar"></div></div>
    </div>
    <div id="win" class="win" hidden>
      <div class="card">
        <div class="swatch" id="win-swatch"></div>
        <h2 id="win-title"></h2>
        <p id="win-sub"></p>
        <button id="win-close">Patrz dalej</button>
      </div>
    </div>
    <div id="banner" class="banner" hidden></div>`;
  const $ = <T extends HTMLElement>(id: string) => root.querySelector<T>('#' + id)!;
  const list = $<HTMLUListElement>('players');
  const copy = $<HTMLButtonElement>('copy');
  const clock = $('clock');
  const sudden = $('sudden');
  const stinkVal = $('stink-val');
  const stinkBar = $('stink-bar');
  const win = $('win');
  copy.onclick = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      copy.textContent = 'Skopiowano';
    } catch {
      copy.textContent = location.href;
    }
    setTimeout(() => (copy.textContent = 'Kopiuj link'), 1500);
  };
  let dismissedWinner: PlayerId | null = null;
  $<HTMLButtonElement>('win-close').onclick = () => {
    dismissedWinner = shownWinner;
    win.hidden = true;
  };

  let lastRows = '';
  let lastClock = '';
  let lastSudden = '';
  let lastStink = -1;
  let shownWinner: PlayerId | null = null;

  return {
    update(view: HudView) {
      const m = buildHudModel(view, me);

      const rowsKey = m.rows.map((r) => `${r.id}${r.name}${r.color}${r.connected}${r.percent.toFixed(1)}`).join('|');
      if (rowsKey !== lastRows) {
        lastRows = rowsKey;
        list.innerHTML = '';
        for (const r of m.rows) {
          const li = document.createElement('li');
          li.style.setProperty('--c', r.color);
          li.style.setProperty('--p', `${r.percent}%`);
          if (r.me) li.classList.add('me');
          const name = document.createElement('span');
          name.className = 'name';
          name.textContent = r.name + (r.me ? ' (ty)' : '') + (r.connected ? '' : ' …');
          const pct = document.createElement('span');
          pct.className = 'pct';
          pct.textContent = `${r.percent.toFixed(1)}%`;
          li.append(name, pct);
          list.append(li);
        }
      }

      if (m.clock !== lastClock) {
        lastClock = m.clock;
        clock.textContent = m.clock;
      }
      const suddenText = m.multiplier > 1
        ? `SUDDEN DEATH ×${m.multiplier}` +
          (m.nextStepIn !== null ? ` · ×${m.multiplier + 1} za ${formatClock(m.nextStepIn)}` : '')
        : m.nextStepIn !== null && m.nextStepIn <= 60 ? `Sudden death za ${formatClock(m.nextStepIn)}` : '';
      if (suddenText !== lastSudden) {
        lastSudden = suddenText;
        sudden.textContent = suddenText;
        sudden.hidden = !suddenText;
        sudden.classList.toggle('on', m.multiplier > 1);
      }

      const stink = Math.round(m.stink);
      if (stink !== lastStink) {
        lastStink = stink;
        stinkVal.textContent = String(stink);
        stinkBar.style.width = `${(m.stink / m.stinkMax) * 100}%`;
      }

      const winnerId = m.winner?.id ?? null;
      if (winnerId !== shownWinner) {
        shownWinner = winnerId;
        if (m.winner) {
          $('win-swatch').style.background = m.winner.color;
          $('win-title').textContent = m.winner.me ? 'Wygrałeś!' : `Wygrywa ${m.winner.name}`;
          $('win-sub').textContent = m.winner.me
            ? `Cała mapa śmierdzi Tobą. Czas gry ${m.clock}.`
            : `${m.winner.name} zasmrodził całą mapę. Czas gry ${m.clock}.`;
        }
        win.hidden = !m.winner || dismissedWinner === winnerId;
      }
    },
    banner(text: string) {
      const b = $<HTMLDivElement>('banner');
      b.textContent = text;
      b.hidden = false;
    },
  };
}
