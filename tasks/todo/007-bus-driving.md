# Jazda autobusem i taranowanie

obszar: autobus
kto: -
zależy od: 001
ścieżki: sim/bus.ts

## Cel

Gaz, hamulec, skręt, prosta fizyka bez silnika fizycznego, na płaskiej mapie (bez budynków). Kolizje autobus–autobus: odbicie i **taranowanie** — uderzony autobus traci część smrodu (`RAM_STINK_LOSS` w `config.ts`), który wypada na ziemię jako bonus „wytrącony smród”.

## Gotowe, gdy

- [ ] autobus jeździ po całej mapie, nie wyjeżdża poza jej krawędź
- [ ] testy Vitest: zderzenie odbija autobusy i przenosi smród na ziemię
