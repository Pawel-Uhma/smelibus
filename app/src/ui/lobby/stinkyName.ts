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

/** Random stinky nick like "KiszonyŚledź", at most `maxLen` chars; `rnd` is injectable for tests. */
export function stinkyName(rnd: () => number = Math.random, maxLen = NICK_MAX): string {
  const pick = (a: string[]) => a[Math.floor(rnd() * a.length)];
  for (let i = 0; i < 20; i++) {
    const name = pick(ADJECTIVES) + pick(NOUNS);
    if (name.length <= maxLen) return name;
  }
  return pick(NOUNS);
}

/** Bot nicks carry this prefix so nobody mistakes a bot for a person. */
export const BOT_PREFIX = 'Bot ';

/** Random stinky bot nick like "Bot ZgniłyBąk", within NICK_MAX and not in `taken`. */
export function stinkyBotName(taken: ReadonlySet<string>, rnd: () => number = Math.random): string {
  for (let i = 0; i < 50; i++) {
    const name = BOT_PREFIX + stinkyName(rnd, NICK_MAX - BOT_PREFIX.length);
    if (!taken.has(name)) return name;
  }
  let n = 1;
  while (taken.has(`${BOT_PREFIX}${n}`)) n++;
  return `${BOT_PREFIX}${n}`;
}

/** Old auto-generated default ("Kierowca42"), replaced by a stinky one. */
export const isOldDefaultName = (name: string) => /^Kierowca\d{2}$/.test(name);
