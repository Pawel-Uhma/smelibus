/** Small data credit in the bottom-left corner (ODbL needs it while OSM map data is shown). */
export function showAttribution(text: string): void {
  let el = document.getElementById('data-attribution');
  if (!el) {
    el = document.createElement('a');
    el.id = 'data-attribution';
    (el as HTMLAnchorElement).href = 'https://www.openstreetmap.org/copyright';
    (el as HTMLAnchorElement).target = '_blank';
    (el as HTMLAnchorElement).rel = 'noopener';
    Object.assign(el.style, {
      position: 'fixed', left: '6px', bottom: '4px', zIndex: '5', font: '11px system-ui, sans-serif',
      color: '#fff', background: 'rgba(0,0,0,0.45)', padding: '1px 6px', borderRadius: '4px',
      textDecoration: 'none',
    });
    document.body.appendChild(el);
  }
  el.textContent = text;
}
