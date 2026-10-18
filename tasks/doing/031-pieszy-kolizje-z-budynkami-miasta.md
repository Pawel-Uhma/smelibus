# Pieszy: kolizje z budynkami miasta

obszar: autobus
kto: Szczpan
zależy od: 006, 023
ścieżki: sim/player.ts

## Cel

Od karty 023 miasto jest włączone (`CITY_ENABLED = true`) i autobusy odbijają się od budynków, ale pieszy (`sim/player.ts`) dalej chodzi przez kafelki `building`. Wysiadanie też może postawić pieszego w budynku.

## Gotowe, gdy

- [ ] pieszy nie wchodzi w budynek (koło `PEDESTRIAN_RADIUS` vs kafelki, ślizg wzdłuż ściany)
- [ ] po wysiadaniu pieszy stoi poza budynkiem (`isDrivable` / najbliższe wolne miejsce)
- [ ] testy Vitest
