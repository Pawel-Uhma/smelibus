import { createMenuBackdrop, type MenuBackdrop } from '../../render/menuScene';
import { createParty, joinParty, rejoinParty, watchPublicParties, type Party } from '../../net/client';
import { joinErrorMessage, normalizePartyCode } from '../../net/partyCode';
import { MAX_PLAYERS, PLAYER_COLORS } from '../../shared/config';
import type { MapKind, Player, PublicParty } from '../../shared/types';
import { showChangelog } from './changelog';
import { isOldDefaultName, stinkyName } from './stinkyName';
import './lobby.css';

const NAME_KEY = 'smelibus.name';
const COLOR_KEY = 'smelibus.color';
const PUBLIC_KEY = 'smelibus.public';

const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');
const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

/**
 * Home screen: nickname + color, create party (public or private), join by code, public list.
 * `/p/ABCD` joins directly. Resolves once the game is running (after the waiting room).
 */
export async function showLobby(root: HTMLElement): Promise<Party> {
  const backdrop = createMenuBackdrop();
  const hideChangelog = showChangelog();
  try {
    const party = await showHome(root, backdrop);
    history.replaceState(null, '', `/p/${party.code}`);
    if (!party.lobby().started) await showWaitingRoom(root, party, backdrop);
    root.innerHTML = '';
    return party;
  } finally {
    hideChangelog();
    backdrop.dispose();
  }
}

function showHome(root: HTMLElement, backdrop: MenuBackdrop): Promise<Party> {
  const codeFromUrl = normalizePartyCode(location.pathname.match(/^\/p\/([A-Za-z0-9]+)/)?.[1] ?? '');
  root.innerHTML = `
    <div class="lobby">
      <div class="card">
      <h1 class="logo">Smeli<span>bus</span></h1>
      <p class="tag">Śmierdzące autobusy przejmują miasto</p>
      <div class="nick">
        <label>Nick <input id="name" maxlength="16" autocomplete="off"></label>
        <button id="reroll" type="button" title="Losuj śmierdzący nick" aria-label="Losuj śmierdzący nick">🎲</button>
      </div>
      <div class="colors" id="colors" role="radiogroup" aria-label="Kolor"></div>
      <div class="create">
        <button id="create">Stwórz party</button>
        <label class="check"><input type="checkbox" id="public"> publiczne</label>
      </div>
      <form class="join" id="join-form" novalidate>
        <input id="code" name="code" placeholder="KOD" aria-label="Kod party" value="${esc(codeFromUrl)}"
          autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false"
          inputmode="text" enterkeyhint="go">
        <button id="join" type="submit">Dołącz</button>
      </form>
      <p id="msg" class="msg"></p>
      <section class="public-list">
        <h2>Publiczne party</h2>
        <ul id="list"><li class="empty">Ładowanie…</li></ul>
      </section>
      </div>
    </div>`;
  const $ = <T extends HTMLElement>(id: string) => root.querySelector<T>('#' + id)!;
  const nameInput = $<HTMLInputElement>('name');
  const codeInput = $<HTMLInputElement>('code');
  const publicInput = $<HTMLInputElement>('public');
  const msg = $('msg');
  const list = $<HTMLUListElement>('list');
  const saved = safeGet(NAME_KEY);
  nameInput.value = saved && !isOldDefaultName(saved) ? saved : stinkyName();
  $('reroll').onclick = () => {
    nameInput.value = stinkyName();
    safeSet(NAME_KEY, nameInput.value);
  };
  publicInput.checked = safeGet(PUBLIC_KEY) === '1';

  let color = Number(safeGet(COLOR_KEY));
  if (!PLAYER_COLORS.includes(color)) color = PLAYER_COLORS[0];
  const colors = $('colors');
  // Your bus leads the convoy, three rivals in the next colours follow.
  const showColors = () => {
    const i = PLAYER_COLORS.indexOf(color);
    backdrop.setColors([0, 2, 4, 6].map((k) => PLAYER_COLORS[(i + k) % PLAYER_COLORS.length]));
  };
  showColors();
  for (const c of PLAYER_COLORS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.style.setProperty('--c', hex(c));
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-label', hex(c));
    b.setAttribute('aria-checked', String(c === color));
    b.onclick = () => {
      color = c;
      safeSet(COLOR_KEY, String(c));
      showColors();
      colors.querySelectorAll('.swatch').forEach((s) => s.setAttribute('aria-checked', String(s === b)));
    };
    colors.append(b);
  }

  return new Promise((resolve) => {
    let busy = false;
    const stopList = watchPublicParties(renderList, () => {
      list.innerHTML = '<li class="empty">Serwer nie odpowiada</li>';
    });
    const done = (party: Party) => {
      stopList();
      resolve(party);
    };
    const go = async (open: (name: string) => Promise<Party>, errorText = joinErrorMessage) => {
      if (busy) return;
      busy = true;
      const name = nameInput.value.trim() || 'Kierowca';
      safeSet(NAME_KEY, name);
      msg.textContent = 'Łączenie…';
      try {
        done(await open(name));
      } catch (e) {
        msg.textContent = errorText(e, '');
        busy = false;
      }
    };
    const joinCode = (code: string) =>
      go((name) => joinParty(code, name, color), (e) => joinErrorMessage(e, code));

    function renderList(parties: PublicParty[]) {
      list.innerHTML = '';
      if (!parties.length) {
        list.innerHTML = '<li class="empty">Nikt teraz nie gra publicznie</li>';
        return;
      }
      for (const p of parties) {
        const li = document.createElement('li');
        const full = p.players >= p.maxPlayers;
        li.innerHTML = `
          <span class="code">${esc(p.code)}</span>
          <span class="host">${esc(p.hostName || '—')}</span>
          <span class="count">${p.players}/${p.maxPlayers}${p.started ? ' · w grze' : ''}</span>`;
        const b = document.createElement('button');
        b.textContent = full ? 'Pełne' : 'Dołącz';
        b.disabled = full;
        b.onclick = () => joinCode(p.code);
        li.append(b);
        list.append(li);
      }
    }

    $('create').onclick = () => {
      safeSet(PUBLIC_KEY, publicInput.checked ? '1' : '0');
      go((name) => createParty(name, { public: publicInput.checked, color }));
    };
    // A real form: Enter on desktop and "Go" on phone keyboards both submit, also mid-IME.
    $<HTMLFormElement>('join-form').onsubmit = (e) => {
      e.preventDefault();
      const code = normalizePartyCode(codeInput.value);
      codeInput.value = code;
      if (!code) {
        msg.textContent = 'Wpisz kod party';
        return void codeInput.focus();
      }
      codeInput.blur(); // closes the phone keyboard
      joinCode(code);
    };
    // The value is only cleaned on paste and blur, never while typing: rewriting it during
    // Android IME composition duplicates or eats letters. CSS shows it uppercase meanwhile.
    codeInput.addEventListener('paste', (e) => {
      const text = e.clipboardData?.getData('text');
      if (!text) return;
      e.preventDefault();
      codeInput.value = normalizePartyCode(text);
    });
    codeInput.addEventListener('blur', () => (codeInput.value = normalizePartyCode(codeInput.value)));
    // Don't yank focus from a field the player already tapped while rejoin was checking.
    const focusName = () => {
      if (!root.contains(document.activeElement)) nameInput.focus();
    };

    if (codeFromUrl) {
      rejoinParty(codeFromUrl).then((party) => {
        if (party && !busy) {
          busy = true;
          done(party);
        } else focusName();
      });
    } else focusName();
  });
}

/** Before Start: link, code, who's in. Only the host gets the Start button. */
function showWaitingRoom(root: HTMLElement, party: Party, backdrop: MenuBackdrop): Promise<void> {
  const link = `${location.origin}/p/${party.code}`;
  root.innerHTML = `
    <div class="lobby">
      <div class="card">
      <h1 class="logo">Smeli<span>bus</span></h1>
      <p class="tag">Party <b class="party-code">${esc(party.code)}</b> · <span id="kind"></span></p>
      <div class="join">
        <input id="link" readonly value="${esc(link)}">
        <button id="copy">Kopiuj link</button>
      </div>
      <ul class="waiting" id="players"></ul>
      <button id="add-bot" type="button" hidden>+ Bot</button>
      <div class="map-pick" role="group" aria-label="Mapa">
        <button type="button" data-map="city">Miasto</button>
        <button type="button" data-map="flat">Płaska</button>
      </div>
      <button id="start" hidden>Start</button>
      <p id="msg" class="msg"></p>
      </div>
    </div>`;
  const $ = <T extends HTMLElement>(id: string) => root.querySelector<T>('#' + id)!;
  const list = $<HTMLUListElement>('players');
  const start = $<HTMLButtonElement>('start');
  const msg = $('msg');
  const copy = $<HTMLButtonElement>('copy');
  copy.onclick = async () => {
    try {
      await navigator.clipboard.writeText(link);
      copy.textContent = 'Skopiowano';
    } catch {
      $<HTMLInputElement>('link').select();
    }
    setTimeout(() => (copy.textContent = 'Kopiuj link'), 1500);
  };
  const addBot = $<HTMLButtonElement>('add-bot');
  addBot.onclick = () => party.addBot();
  start.onclick = () => {
    start.disabled = true;
    party.start();
  };
  // Map pick: the host switches it, everyone sees the current one.
  const mapButtons = [...root.querySelectorAll<HTMLButtonElement>('.map-pick button')];
  for (const b of mapButtons) b.onclick = () => party.setMap(b.dataset.map as MapKind);

  let lastKey = '';
  const render = () => {
    const info = party.lobby();
    const players = party.latest().players;
    const isHost = info.hostId === party.playerId;
    const key = JSON.stringify([info, players.map((p) => [p.id, p.name, p.color, p.connected, p.bot])]);
    if (key === lastKey) return;
    lastKey = key;
    $('kind').textContent = info.public ? 'publiczne' : 'prywatne';
    start.hidden = !isHost;
    addBot.hidden = !isHost;
    addBot.disabled = players.length >= MAX_PLAYERS;
    for (const b of mapButtons) {
      b.setAttribute('aria-pressed', String(b.dataset.map === (info.map ?? 'city')));
      b.disabled = !isHost;
    }
    msg.textContent = isHost
      ? players.length < 2 ? 'Zacznij sam, poczekaj na innych albo dodaj boty' : ''
      : 'Czekamy, aż host kliknie Start';
    backdrop.setColors(players.map((p) => p.color));
    list.innerHTML = '';
    for (const p of players) {
      const li = playerItem(p, p.id === party.playerId, p.id === info.hostId);
      if (p.bot && isHost) {
        const kick = document.createElement('button');
        kick.type = 'button';
        kick.className = 'kick';
        kick.textContent = '×';
        kick.title = kick.ariaLabel = `Usuń: ${p.name}`;
        kick.onclick = () => party.removeBot(p.id);
        li.append(kick);
      }
      list.append(li);
    }
  };
  render();

  return new Promise((resolve) => {
    const timer = setInterval(render, 200);
    let closed = false;
    party.onClose((reason) => {
      closed = true;
      clearInterval(timer);
      msg.textContent = `${reason}. Odśwież stronę.`;
      start.hidden = true;
    });
    party.onLobby((info) => {
      if (closed) return;
      if (info.started) {
        closed = true;
        clearInterval(timer);
        resolve();
      } else render();
    });
  });
}

function playerItem(p: Player, me: boolean, host: boolean): HTMLLIElement {
  const li = document.createElement('li');
  li.style.setProperty('--c', hex(p.color));
  li.textContent = (p.bot ? '🤖 ' : '') + p.name + (me ? ' (ty)' : '') + (host ? ' · host' : '') + (p.connected ? '' : ' …');
  return li;
}

function safeGet(k: string): string | null {
  try { return localStorage.getItem(k); } catch { return null; }
}
function safeSet(k: string, v: string) {
  try { localStorage.setItem(k, v); } catch { /* private mode */ }
}
