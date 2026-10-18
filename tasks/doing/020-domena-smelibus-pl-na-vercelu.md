# Domena smelibus.pl na Vercelu

obszar: wspolne
kto: Pawel
zależy od: -
ścieżki: - (tylko panel Vercela, bez zmian w kodzie)
pytanie: @Pawel ustaw w Vercelu przekierowanie 301 www.smelibus.pl → smelibus.pl, potem karta do done.

## Cel

Gra ma działać pod smelibus.pl zamiast smelibus.vercel.app. Domena jest zarejestrowana na nazwa.pl (DNS: ns1.nazwa.pl, rekordy jeszcze puste). DNS zostaje w nazwa.pl — **nie** przenosimy NS na Vercel. Rekordy w nazwa.pl wpisuje Antek (tylko on ma konto).

Kod nie wymaga zmian: nigdzie nie ma zaszytego `vercel.app`, a serwer Colyseus nie sprawdza originu.

## Kroki (Paweł / jego agent)

1. Vercel → projekt `smelibus` → Settings → Domains → dodaj `smelibus.pl` (główna) i `www.smelibus.pl` (redirect 301 na `smelibus.pl`).
2. Przepisz do tej karty (sekcja „Rekordy DNS”) dokładnie te rekordy, które pokaże Vercel (A dla `@`, CNAME dla `www`), wypchnij i daj znać Antkowi na czacie.
3. Opcjonalnie: dodaj Antka do teamu na Vercelu (jeśli plan na to pozwala).

## Rekordy DNS

Obie domeny są dodane do projektu `smelibus` na Vercelu (18.10.2026). @Antek, wpisz w nazwa.pl:

| Typ | Host | Wartość |
|---|---|---|
| A | `@` (smelibus.pl) | `216.150.1.1` |
| A | `@` (smelibus.pl) | `216.150.16.1` |
| CNAME | `www` | `443a31c64ed8ec71.vercel-dns-016.com.` |

Teraz `@` i `www` mają rekord A `85.128.236.16` (parking nazwa.pl). **Usuń go**, bo inaczej Vercel nie wystawi certyfikatu. Jeśli nazwa.pl nie przyjmie dwóch rekordów A, wpisz jeden: `76.76.21.21`.

Do zrobienia przez Pawła: przekierowanie 301 `www.smelibus.pl` → `smelibus.pl` (Vercel → Settings → Domains → www → Edit → Redirect to smelibus.pl, 301). Na razie www pokazuje grę bez przekierowania.

## Gotowe, gdy

- [x] obie domeny dodane w Vercelu, rekordy wpisane w tę kartę
- [x] Antek wpisał rekordy w nazwa.pl
- [x] https://smelibus.pl i www działają z ważnym certyfikatem (18.10.2026)
- [ ] www przekierowuje 301 na smelibus.pl (Paweł, panel Vercela; agent nie ma dostępu do domen przez API)
- [x] `smelibus.vercel.app` → `smelibus.pl` w CLAUDE.md i README.md
