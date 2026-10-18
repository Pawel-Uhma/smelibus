import { createParty, joinParty, rejoinParty, type Party } from '../../net/client';

const NAME_KEY = 'smelibus.name';

/** Home screen: nickname, create party, join by code. `/p/ABCD` joins directly. */
export function showLobby(root: HTMLElement): Promise<Party> {
  const codeFromUrl = location.pathname.match(/^\/p\/([A-Za-z0-9]+)/)?.[1]?.toUpperCase() ?? '';
  root.innerHTML = `
    <div class="lobby">
      <h1>Smelibus</h1>
      <p class="tag">Śmierdzące autobusy przejmują miasto</p>
      <label>Nick <input id="name" maxlength="16" autocomplete="off"></label>
      <button id="create">Stwórz party</button>
      <div class="join">
        <input id="code" placeholder="KOD" maxlength="6" autocomplete="off" value="${codeFromUrl}">
        <button id="join">Dołącz</button>
      </div>
      <p id="msg" class="msg"></p>
    </div>`;
  const $ = <T extends HTMLElement>(id: string) => root.querySelector<T>('#' + id)!;
  const nameInput = $<HTMLInputElement>('name');
  const codeInput = $<HTMLInputElement>('code');
  const msg = $('msg');
  nameInput.value = safeGet(NAME_KEY) ?? `Kierowca${Math.floor(Math.random() * 90 + 10)}`;

  return new Promise((resolve) => {
    let busy = false;
    const go = async (open: (name: string) => Promise<Party>) => {
      if (busy) return;
      busy = true;
      const name = nameInput.value.trim() || 'Kierowca';
      safeSet(NAME_KEY, name);
      msg.textContent = 'Łączenie…';
      try {
        const party = await open(name);
        history.replaceState(null, '', `/p/${party.code}`);
        root.innerHTML = '';
        resolve(party);
      } catch (e) {
        msg.textContent = `Nie udało się: ${(e as Error).message || 'serwer nie odpowiada'}`;
        busy = false;
      }
    };
    $('create').onclick = () => go(createParty);
    $('join').onclick = () => {
      const code = codeInput.value.trim();
      if (!code) return void (msg.textContent = 'Wpisz kod party');
      go((name) => joinParty(code, name));
    };
    codeInput.onkeydown = (e) => e.key === 'Enter' && $('join').click();

    if (codeFromUrl) {
      rejoinParty(codeFromUrl).then((party) => {
        if (party && !busy) {
          root.innerHTML = '';
          resolve(party);
        } else nameInput.focus();
      });
    } else nameInput.focus();
  });
}

function safeGet(k: string): string | null {
  try { return localStorage.getItem(k); } catch { return null; }
}
function safeSet(k: string, v: string) {
  try { localStorage.setItem(k, v); } catch { /* private mode */ }
}
