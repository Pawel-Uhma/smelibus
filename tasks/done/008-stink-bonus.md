# Bonusy smrodu: spawn, zbieranie, wietrzenie

obszar: smrod
kto: Pawel
zależy od: 001
ścieżki: sim/bonus.ts

## Cel

Spawn bonusów na przystankach i na mapie, odnawianie po czasie, śmietniki (+smród, przewracają się), kontroler biletów (−smród), wytrącony smród po taranowaniu (tabela w GAME_DESIGN), zbieranie przejazdem, `stink` 0–100, wietrzenie (np. −0.5/s). Wartości w `config.ts`.

## Gotowe, gdy

- [x] testy Vitest: zbieranie podnosi `stink`, wietrzenie obniża, limit 100
