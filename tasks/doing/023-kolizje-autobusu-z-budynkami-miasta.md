# Kolizje autobusu z budynkami miasta

obszar: autobus
kto: Szczpan
zależy od: 002
ścieżki: sim/bus.ts, sim/prediction.ts

## Cel

Generator miasta (karta 002) jest za flagą `CITY_ENABLED` w `config.ts`, bo autobusy przejeżdżają przez budynki. `updateBus` dostaje dziś tylko `world.size`; trzeba mu dać `World` (albo funkcję `isDrivable` z `sim/world.ts`) i odbijać kapsułę autobusu od kafelków `kind === 'building'` tak jak od krawędzi mapy (`BUS_BOUNCE`). Ta sama logika w predykcji klienta, inaczej własny autobus będzie skakał.

## Gotowe, gdy

- [ ] autobus nie wjeżdża w budynek, odbija się jak od krawędzi
- [ ] predykcja klienta liczy to samo co serwer
- [ ] testy Vitest: wjazd prosto i pod kątem w ścianę budynku
- [ ] po tym można włączyć `CITY_ENABLED = true` (decyzja zespołu, wpis w DECISIONS)
