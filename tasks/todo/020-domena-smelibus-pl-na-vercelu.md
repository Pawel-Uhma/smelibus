# Domena smelibus.pl na Vercelu

obszar: wspolne
kto: -
zależy od: -
ścieżki: - (tylko panel Vercela, bez zmian w kodzie)
pytanie: @Pawel Antek kupił smelibus.pl (nazwa.pl). Tylko Ty masz dostęp do projektu `smelibus` na Vercelu — weź tę kartę albo dodaj Antka do teamu.

## Cel

Gra ma działać pod smelibus.pl zamiast smelibus.vercel.app. Domena jest zarejestrowana na nazwa.pl (DNS: ns1.nazwa.pl, rekordy jeszcze puste). DNS zostaje w nazwa.pl — **nie** przenosimy NS na Vercel. Rekordy w nazwa.pl wpisuje Antek (tylko on ma konto).

Kod nie wymaga zmian: nigdzie nie ma zaszytego `vercel.app`, a serwer Colyseus nie sprawdza originu.

## Kroki (Paweł / jego agent)

1. Vercel → projekt `smelibus` → Settings → Domains → dodaj `smelibus.pl` (główna) i `www.smelibus.pl` (redirect 301 na `smelibus.pl`).
2. Przepisz do tej karty (sekcja „Rekordy DNS”) dokładnie te rekordy, które pokaże Vercel (A dla `@`, CNAME dla `www`), wypchnij i daj znać Antkowi na czacie.
3. Opcjonalnie: dodaj Antka do teamu na Vercelu (jeśli plan na to pozwala).

## Rekordy DNS

(do uzupełnienia przez Pawła)

## Gotowe, gdy

- [ ] obie domeny dodane w Vercelu, rekordy wpisane w tę kartę
- [ ] Antek wpisał rekordy w nazwa.pl
- [ ] https://smelibus.pl działa z ważnym certyfikatem, www przekierowuje na smelibus.pl
- [ ] `smelibus.vercel.app` → `smelibus.pl` w CLAUDE.md i README.md
