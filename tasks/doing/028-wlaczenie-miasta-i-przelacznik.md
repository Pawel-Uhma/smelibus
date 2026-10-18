# Włączenie miasta i przełącznik Miasto/Płaska

obszar: swiat
kto: Szczpan
zależy od: 023
ścieżki: shared/config.ts, sim/world.ts, sim/bonus.ts, ../../server/, ui/lobby/

## Cel

Gdy kolizje z budynkami (023) będą gotowe, miasto staje się **domyślną** mapą (`CITY_ENABLED = true`). Host dostaje w poczekalni przełącznik „Miasto / Płaska”, wysyłany do serwera przed Startem (i przy rewanżu, karta 027). Bonusy i przystanki tylko na ulicach, piesi chodzą po ulicach i parkach, nie przez budynki. Open data (014) zostaje na później. Ustalone z Pawłem (grill 2026-10-18).

## Gotowe, gdy

- [ ] nowe party domyślnie startuje na mieście
- [ ] host przełącza Miasto/Płaska w poczekalni, inni widzą wybór
- [ ] żaden bonus nie spawnuje się w budynku (test)
- [ ] wpis w DECISIONS (koniec „MVP na płaskiej mapie”) i GAME_DESIGN (Strefy i mapa)
