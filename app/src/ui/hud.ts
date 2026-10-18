import type { Player, PlayerId } from '../shared/types';

/** Minimal sandbox HUD: party code, share link, player list. Card 012 owns the real HUD. */
export function createHud(root: HTMLElement, code: string, me: PlayerId) {
  root.innerHTML = `
    <div class="hud">
      <div class="party">Party <b>${code}</b> <button id="copy">Kopiuj link</button></div>
      <ul id="players"></ul>
      <div class="help">WASD / strzałki: jazda · spacja: hamulec</div>
    </div>
    <div id="banner" class="banner" hidden></div>`;
  const list = root.querySelector<HTMLUListElement>('#players')!;
  const copy = root.querySelector<HTMLButtonElement>('#copy')!;
  copy.onclick = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      copy.textContent = 'Skopiowano';
    } catch {
      copy.textContent = location.href;
    }
    setTimeout(() => (copy.textContent = 'Kopiuj link'), 1500);
  };
  let last = '';
  return {
    update(players: Player[]) {
      const key = players.map((p) => `${p.id}${p.name}${p.color}${p.connected}`).join('|');
      if (key === last) return;
      last = key;
      list.innerHTML = '';
      for (const p of players) {
        const li = document.createElement('li');
        li.style.setProperty('--c', '#' + p.color.toString(16).padStart(6, '0'));
        li.textContent = p.name + (p.id === me ? ' (ty)' : '') + (p.connected ? '' : ' …');
        list.append(li);
      }
    },
    banner(text: string) {
      const b = root.querySelector<HTMLDivElement>('#banner')!;
      b.textContent = text;
      b.hidden = false;
    },
  };
}
