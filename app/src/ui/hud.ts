import type { PlayerId } from '../shared/types';
import { buildHudModel, CARGO_COLUMNS, formatClock, type CargoColumn, type CargoRow, type HudView } from './hudModel';
import { createLootReel } from './lootReel';
import { createStinkPops } from './stinkPops';

export type { HudView } from './hudModel';

/** Rematch controls on the win screen (card 027): the host gets the button, the rest wait. */
export interface HudRematch {
  isHost(): boolean;
  request(): void;
}

/** Leaves the party for good (issue #1); the HUD then sends the player to the home screen. */
export type HudLeave = () => Promise<void>;

/** Stink cloud with three wavy fumes, colored by the pop's CSS (currentColor). */
const STINK_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" stroke="#1b1b1b" stroke-width="1.5" d="M6 20a4 4 0 0 1-.6-8 5 5 0 0 1 9.6-1.5A4 4 0 1 1 18 20z"/><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M8 7c-1-1 1-2 0-4M12 6c-1-1 1-2 0-4M16 7c-1-1 1-2 0-4"/></svg>`;

/** Fill colour along the stink bar: pale yellow when fresh, deep toxic green when full. */
function stinkColor(f: number): string {
  return `hsl(${Math.round(58 + f * 55)} ${Math.round(62 + f * 25)}% ${Math.round(66 - f * 22)}%)`;
}

const CARGO_HEAD: Record<CargoColumn, [icon: string, label: string]> = {
  zul: ['🍺', 'Żule'], poop: ['💩', 'Kupy'], other: ['➕', 'Reszta'],
};

/** End-of-game cargo table (card 039): totals per player, the leader of each column marked. */
function cargoTable(rows: CargoRow[]): HTMLTableElement {
  const table = document.createElement('table');
  table.className = 'cargo';
  const head = table.createTHead().insertRow();
  const who = document.createElement('th');
  who.textContent = 'Gracz';
  head.append(who);
  for (const c of CARGO_COLUMNS) {
    const [icon, label] = CARGO_HEAD[c];
    const th = document.createElement('th');
    th.title = label;
    th.innerHTML = `${icon}<span class="lbl"> ${label}</span>`;
    head.append(th);
  }
  const body = table.createTBody();
  for (const r of rows) {
    const tr = body.insertRow();
    if (r.me) tr.classList.add('me');
    const name = tr.insertCell();
    name.className = 'who';
    name.style.setProperty('--c', r.color);
    name.textContent = r.name + (r.me ? ' (ty)' : '');
    for (const c of CARGO_COLUMNS) {
      const td = tr.insertCell();
      td.textContent = String(r.counts[c]);
      if (r.leads.includes(c)) {
        td.classList.add('lead');
        td.title = 'Najwięcej';
      }
    }
  }
  return table;
}

function stinkTier(f: number): string {
  if (f < 0.15) return 'Świeży';
  if (f < 0.35) return 'Zalatuje';
  if (f < 0.6) return 'Śmierdzi';
  if (f < 0.85) return 'Cuchnie';
  return 'SMELIBUS!';
}

/**
 * In-game HUD over the canvas: party code, map share per player, clock with sudden death,
 * own bus stink, and the win screen. Only reads the view passed to update().
 */
export function createHud(root: HTMLElement, code: string, me: PlayerId, rematch?: HudRematch, leave?: HudLeave) {
  root.innerHTML = `
    <div class="hud">
      <div class="party"><span class="code">Party <b>${code}</b></span><button id="copy" class="icon" title="Kopiuj link" aria-label="Kopiuj link">🔗</button><button id="help-toggle" class="icon" title="Sterowanie" aria-label="Sterowanie" aria-expanded="false">?</button><button id="leave" class="icon leave" title="Wyjdź z party" aria-label="Wyjdź z party">🚪</button></div>
      <ul id="players"></ul>
      <div class="help">WASD / strzałki: jazda i chodzenie · S: hamulec · spacja: wypuść smród (od 20) · E: wsiądź / wysiądź · H: klakson · K: kontrast</div>
      <div class="help help-touch">Prawy kciuk: wskaż, gdzie jechać albo iść · przyciski po lewej: wsiądź / wysiądź, klakson</div>
    </div>
    <div class="hud-clock">
      <div id="clock" class="time">0:00</div>
      <div id="sudden" class="sudden" hidden></div>
    </div>
    <div id="stink" class="hud-stink">
      <div class="hud-cargo">
        <span title="Żule w autobusie teraz">🍺 <b id="cargo-zul">0</b></span>
        <span title="Kupy w tej grze">💩 <b id="cargo-poop">0</b></span>
      </div>
      <div class="stink-head">
        <span class="stink-icon">${STINK_ICON}</span>
        <span id="stink-tier" class="stink-tier">${stinkTier(0)}</span>
        <b id="stink-val" class="stink-val">0</b>
      </div>
      <div class="stink-tube">
        <div id="stink-bar" class="stink-fill">${'<i></i>'.repeat(6)}</div>
        <div class="stink-ticks"></div>
      </div>
      <div class="stink-fumes"><i></i><i></i><i></i></div>
      <div id="speed" class="speed-row" title="Bonus do prędkości: kukuryniarze i energetyk"><span>🛴</span><div class="speed-tube"><i></i></div><b>+0%</b></div>
    </div>
    <div id="stink-pops" class="stink-pops"></div>
    <div id="full" class="hud-full" hidden><b>NACIŚNIJ SPACJĘ</b><span>Autobus pełny smrodu. Wypuść go tutaj albo wjedź do swojej strefy.</span></div>
    <div id="win" class="win" hidden>
      <div class="card">
        <div class="swatch" id="win-swatch"></div>
        <h2 id="win-title"></h2>
        <p id="win-sub"></p>
        <div id="win-cargo"></div>
        <button id="win-rematch" class="rematch" hidden>Rewanż</button>
        <button id="win-close">Patrz dalej</button>
        <p class="rematch-wait" hidden>Czekamy na hosta…</p>
      </div>
    </div>
    <div id="rematch-bar" class="rematch-bar" hidden>
      <button id="bar-rematch" class="rematch" hidden>Rewanż</button>
      <span class="rematch-wait" hidden>Czekamy na hosta…</span>
    </div>
    <div id="banner" class="banner" hidden></div>`;
  const $ = <T extends HTMLElement>(id: string) => root.querySelector<T>('#' + id)!;
  const list = $<HTMLUListElement>('players');
  const copy = $<HTMLButtonElement>('copy');
  const clock = $('clock');
  const sudden = $('sudden');
  const stinkVal = $('stink-val');
  const stinkBox = $('stink');
  const stinkTierEl = $('stink-tier');
  const win = $('win');
  const popsBox = $('stink-pops');
  const cargoEls = { zul: $('cargo-zul'), poop: $('cargo-poop') };
  const winCargo = $('win-cargo');
  const fullBox = $('full');
  const speedRow = $('speed');
  const speedVal = speedRow.querySelector('b')!;
  let lastSpeed = -1;
  let lastRider = 0;
  let lastRiderBus: number | null = null;
  if (matchMedia('(pointer: coarse)').matches) fullBox.querySelector('b')!.textContent = 'NACIŚNIJ 💨 SMRÓD';
  let lastFull = false;
  const pops = createStinkPops();
  const reel = createLootReel(root);
  let lastUpdate = performance.now();
  copy.onclick = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      copy.textContent = '✓';
    } catch {
      prompt('Link do party', location.href);
    }
    setTimeout(() => (copy.textContent = '🔗'), 1500);
  };
  // Controls help: open for the first seconds on desktop, then folded behind the "?" button.
  const hudBox = root.querySelector<HTMLElement>('.hud')!;
  const helpToggle = $<HTMLButtonElement>('help-toggle');
  const setHelp = (open: boolean) => {
    hudBox.classList.toggle('help-open', open);
    helpToggle.setAttribute('aria-expanded', String(open));
  };
  helpToggle.onclick = () => {
    setHelp(!hudBox.classList.contains('help-open'));
    helpToggle.blur();
  };
  if (!matchMedia('(pointer: coarse)').matches) {
    setHelp(true);
    setTimeout(() => setHelp(false), 15000);
  }
  // Leave: the first click arms the button, a second one within 3 s leaves (no browser dialog).
  const leaveBtn = $<HTMLButtonElement>('leave');
  let leaveArmed: ReturnType<typeof setTimeout> | null = null;
  leaveBtn.onclick = async () => {
    if (!leaveArmed) {
      leaveBtn.textContent = 'Wyjść?';
      leaveBtn.classList.add('armed');
      leaveArmed = setTimeout(() => {
        leaveArmed = null;
        leaveBtn.textContent = '🚪';
        leaveBtn.classList.remove('armed');
      }, 3000);
      return;
    }
    leaveBtn.disabled = true;
    await leave?.();
    location.href = '/';
  };
  let dismissedWinner: PlayerId | null = null;
  $<HTMLButtonElement>('win-close').onclick = () => {
    dismissedWinner = shownWinner;
    win.hidden = true;
  };

  const rematchBar = $('rematch-bar');
  const rematchButtons = root.querySelectorAll<HTMLButtonElement>('.rematch');
  const rematchWaits = root.querySelectorAll<HTMLElement>('.rematch-wait');
  rematchButtons.forEach((b) => (b.onclick = () => {
    rematchButtons.forEach((x) => (x.disabled = true));
    rematch?.request();
  }));
  let lastRematch = '';

  let lastRows = '';
  let lastClock = '';
  let lastSudden = '';
  let lastStink = -1;
  let lastCargo = '';
  let lastWinCargo = '';
  let shownWinner: PlayerId | null = null;

  /** Re-triggers a one-shot CSS animation class on the stink bar. */
  function flash(cls: 'up' | 'down') {
    stinkBox.classList.remove('up', 'down');
    void stinkBox.offsetWidth;
    stinkBox.classList.add(cls);
  }

  /** An outlined "+N" / "−N" that jumps out above the own bus and floats away. */
  function showPop(delta: number, at: { x: number; y: number }) {
    const el = document.createElement('div');
    el.className = 'stink-pop ' + (delta > 0 ? 'plus' : 'minus');
    el.style.left = `${at.x + (Math.random() - 0.5) * 50}px`;
    el.style.top = `${at.y}px`;
    el.style.fontSize = `${18 + Math.min(Math.abs(delta), 20) * 0.7}px`;
    el.style.setProperty('--drift', `${(Math.random() - 0.5) * 40}px`);
    el.textContent = `${delta > 0 ? '+' : '−'}${Math.abs(delta)}`;
    el.addEventListener('animationend', () => el.remove());
    popsBox.append(el);
    while (popsBox.childElementCount > 8) popsBox.firstElementChild!.remove();
    flash(delta > 0 ? 'up' : 'down');
  }

  function showSpeedPop(pct: number, at: { x: number; y: number }) {
    const el = document.createElement('div');
    el.className = 'stink-pop speed';
    el.style.left = `${at.x + (Math.random() - 0.5) * 50}px`;
    el.style.top = `${at.y - 20}px`;
    el.style.fontSize = '24px';
    el.style.setProperty('--drift', `${(Math.random() - 0.5) * 40}px`);
    el.textContent = `+${pct}% 🛴`;
    el.addEventListener('animationend', () => el.remove());
    popsBox.append(el);
  }

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

      const now = performance.now();
      reel.update(m.roll, m.power, view.time);
      for (const d of pops.update(m.stink, m.busId, (now - lastUpdate) / 1000)) if (view.ownScreen) showPop(d, view.ownScreen);
      lastUpdate = now;

      const stink = Math.round(m.stink);
      if (stink !== lastStink) {
        lastStink = stink;
        stinkVal.textContent = String(stink);
        const f = Math.min(1, Math.max(0, m.stink / m.stinkMax));
        stinkBox.style.setProperty('--s', f.toFixed(3));
        stinkBox.style.setProperty('--c', stinkColor(f));
        stinkBox.classList.toggle('max', f >= 0.85);
        const tier = stinkTier(f);
        if (stinkTierEl.textContent !== tier) stinkTierEl.textContent = tier;
      }

      if (m.full !== lastFull) {
        lastFull = m.full;
        fullBox.hidden = !m.full;
      }
      stinkBox.classList.toggle('ready', m.canRelease);
      // Eating a scooter rider: a blue "+4% 🛴" pop, so it doesn't read as stink.
      if (m.busId === lastRiderBus && m.riderBoost > lastRider + 0.005 && view.ownScreen) {
        showSpeedPop(Math.round((m.riderBoost - lastRider) * 100), view.ownScreen);
      }
      lastRider = m.riderBoost;
      lastRiderBus = m.busId;
      // Speed bar (card 046): scooter riders plus the energy drink, scaled to both at their most.
      const pct = Math.round(m.speedBonus * 100);
      if (pct !== lastSpeed) {
        lastSpeed = pct;
        speedVal.textContent = `+${pct}%`;
        speedRow.style.setProperty('--v', String(Math.min(1, m.speedBonus / 0.85)));
        speedRow.classList.toggle('on', pct > 0);
      }

      const cargo = `${m.zuls}|${m.poops}`;
      if (cargo !== lastCargo) {
        lastCargo = cargo;
        cargoEls.zul.textContent = String(m.zuls);
        cargoEls.poop.textContent = String(m.poops);
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
      const winCargoKey = win.hidden ? '' : JSON.stringify(m.cargo);
      if (winCargoKey !== lastWinCargo) {
        lastWinCargo = winCargoKey;
        winCargo.replaceChildren(...(winCargoKey ? [cargoTable(m.cargo)] : []));
      }
      // Host can change mid-game (the old one left), so this is re-checked every frame.
      const host = !!rematch?.isHost();
      const rematchKey = `${winnerId}|${win.hidden}|${host}`;
      if (rematch && rematchKey !== lastRematch) {
        lastRematch = rematchKey;
        rematchBar.hidden = !winnerId || !win.hidden;
        rematchButtons.forEach((b) => (b.hidden = !host));
        rematchWaits.forEach((w) => (w.hidden = host));
      }
    },
    banner(text: string) {
      const b = $<HTMLDivElement>('banner');
      b.textContent = text;
      b.hidden = false;
    },
  };
}
