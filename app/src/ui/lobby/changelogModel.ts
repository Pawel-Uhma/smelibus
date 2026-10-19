export interface ChangelogEntry {
  at: Date;
  who: string;
  text: string;
}

/** Lines `2026-10-19T12:50Z | Paweł | street lamps`, oldest first; returns newest first. */
export function parseChangelog(raw: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  for (const line of raw.split('\n')) {
    const [at, who, ...rest] = line.split('|').map((s) => s.trim());
    const text = rest.join(' ');
    const date = new Date(at);
    if (!text || Number.isNaN(date.getTime())) continue;
    entries.push({ at: date, who, text });
  }
  return entries.sort((a, b) => b.at.getTime() - a.at.getTime());
}

/** One entry = one step, so the version grows with every change. */
export function versionOf(entries: ChangelogEntry[]): string {
  return `v0.${entries.length}`;
}

/** Polish "ile czasu temu": "przed chwilą", "5 min temu", "3 godz. temu", "wczoraj", "4 dni temu". */
export function timeAgo(at: Date, now: Date): string {
  const min = Math.floor((now.getTime() - at.getTime()) / 60_000);
  if (min < 1) return 'przed chwilą';
  if (min < 60) return `${min} min temu`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} godz. temu`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'wczoraj';
  if (d < 30) return `${d} dni temu`;
  return at.toLocaleDateString('pl-PL');
}
