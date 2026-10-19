import raw from '../../changelog.txt?raw';
import { parseChangelog, timeAgo, versionOf } from './changelogModel';
import './changelog.css';

const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

/** Version badge in the bottom-right corner; click opens the list of changes. Returns a remover. */
export function showChangelog(): () => void {
  const entries = parseChangelog(raw);
  const el = document.createElement('div');
  el.className = 'changelog';
  el.innerHTML = `
    <button class="changelog-badge" type="button" aria-expanded="false" title="Co nowego">${versionOf(entries)}</button>
    <div class="changelog-panel" hidden>
      <h2>Co nowego</h2>
      <ul></ul>
    </div>`;
  const badge = el.querySelector<HTMLButtonElement>('.changelog-badge')!;
  const panel = el.querySelector<HTMLDivElement>('.changelog-panel')!;
  const toggle = (open: boolean) => {
    if (open) {
      const now = new Date();
      panel.querySelector('ul')!.innerHTML = entries.map((e) => `
        <li><span class="what">${esc(e.text)}</span>
        <span class="meta">${esc(e.who)} · ${timeAgo(e.at, now)}</span></li>`).join('');
    }
    panel.hidden = !open;
    badge.setAttribute('aria-expanded', String(open));
  };
  badge.onclick = () => toggle(panel.hidden);
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') toggle(false); };
  const onDown = (e: PointerEvent) => { if (!el.contains(e.target as Node)) toggle(false); };
  addEventListener('keydown', onKey);
  addEventListener('pointerdown', onDown);
  document.body.appendChild(el);
  return () => {
    removeEventListener('keydown', onKey);
    removeEventListener('pointerdown', onDown);
    el.remove();
  };
}
