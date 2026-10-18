/**
 * Turns whatever the player typed or pasted into a party code: "abcd", " AB CD ", "ab-cd",
 * or a whole link like "https://smelibus.pl/p/ABCD". Server codes are uppercase letters.
 */
export function normalizePartyCode(raw: string): string {
  const fromLink = raw.match(/\/p\/([A-Za-z0-9]+)/)?.[1];
  return (fromLink ?? raw).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Polish message for a failed join (Colyseus matchmaking errors are English). */
export function joinErrorMessage(err: unknown, code: string): string {
  const text = err instanceof Error ? err.message : String(err ?? '');
  if (/not found|disposed/i.test(text)) return `Nie ma party o kodzie ${code}`;
  if (/locked/i.test(text)) return `Party ${code} jest pełne`;
  return `Nie udało się: ${text || 'serwer nie odpowiada'}`;
}
