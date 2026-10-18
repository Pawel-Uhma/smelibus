const KEY = 'smelibus.contrast';

/**
 * Starting value: what the player picked before, else `?kontrast` (`?kontrast=0` turns it off),
 * else the system's `prefers-contrast: more`.
 */
export function initialContrast(search: string, stored: string | null, prefersMore: boolean): boolean {
  const v = new URLSearchParams(search).get('kontrast');
  if (v !== null) return v !== '0' && v !== 'false';
  if (stored !== null) return stored === '1';
  return prefersMore;
}

function load(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}
function save(on: boolean) {
  try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* private mode */ }
}

/**
 * High contrast mode (card 036): a flag for the renderers plus `body.hc` for the CSS.
 * The choice is remembered in localStorage.
 */
export function createContrast(target: Window = window) {
  let on = initialContrast(target.location.search, load(),
    target.matchMedia?.('(prefers-contrast: more)').matches ?? false);
  const apply = () => {
    target.document.body.classList.toggle('hc', on);
    target.document.body.dispatchEvent(new Event('hc-change'));
  };
  apply();

  function set(next: boolean) {
    on = next;
    save(on);
    apply();
  }

  return {
    get on() {
      return on;
    },
    set,
    toggle() {
      set(!on);
    },
    /** HUD toggle button, same look as the mute one. */
    button(): HTMLButtonElement {
      const btn = target.document.createElement('button');
      btn.type = 'button';
      btn.className = 'contrast';
      const render = () => {
        btn.textContent = on ? 'Kontrast: wł.' : 'Kontrast: wył.';
        btn.setAttribute('aria-pressed', String(on));
      };
      btn.onclick = () => {
        set(!on);
        btn.blur();
      };
      target.document.body.addEventListener('hc-change', render);
      render();
      return btn;
    },
  };
}
