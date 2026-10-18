# Jazda autobusem i taranowanie

obszar: autobus
kto: Szczpan
zależy od: 001
ścieżki: sim/bus.ts

## Cel

Gaz, hamulec, skręt, prosta fizyka bez silnika fizycznego, na płaskiej mapie (bez budynków). Kolizje autobus–autobus: odbicie i **taranowanie** — uderzony autobus traci część smrodu (`RAM_STINK_LOSS` w `config.ts`), który wypada na ziemię jako bonus „wytrącony smród”.

## Gotowe, gdy

- [x] autobus jeździ po całej mapie, nie wyjeżdża poza jej krawędź
- [x] testy Vitest: zderzenie odbija autobusy i przenosi smród na ziemię

Uwaga: podstawowa jazda (gaz, hamulec, skręt, odbicie od krawędzi i innych autobusów) jest już w `sim/bus.ts` ze scaffoldu 001. Rozbudowujesz ją, nie piszesz od zera.
