const ADJECTIVES = [
  'Kiszony', 'Zgniły', 'Spocony', 'Kwaśny', 'Stęchły', 'Zatęchły', 'Cuchnący', 'Lepki', 'Mokry',
  'Śledziowy', 'Czosnkowy', 'Cebulowy', 'Siarkowy', 'Gnijący', 'Zjełczały', 'Spleśniały', 'Brudny',
];
const NOUNS = [
  'Durian', 'Śledź', 'Bąk', 'Skarpet', 'Kapeć', 'Ogór', 'Kebab', 'Twaróg', 'Serek', 'Kanar', 'Menel',
  'Bigos', 'Oscypek', 'Pasażer', 'Kalafior', 'Jajo', 'Kierowca', 'Szambiarz', 'Gołąb', 'Pierd',
];

/** Fits the lobby's nick input. */
export const NICK_MAX = 16;

/** Random stinky nick like "KiszonyŚledź"; `rnd` is injectable for tests. */
export function stinkyName(rnd: () => number = Math.random): string {
  const pick = (a: string[]) => a[Math.floor(rnd() * a.length)];
  for (let i = 0; i < 20; i++) {
    const name = pick(ADJECTIVES) + pick(NOUNS);
    if (name.length <= NICK_MAX) return name;
  }
  return pick(NOUNS);
}

/** Old auto-generated default ("Kierowca42"), replaced by a stinky one. */
export const isOldDefaultName = (name: string) => /^Kierowca\d{2}$/.test(name);
