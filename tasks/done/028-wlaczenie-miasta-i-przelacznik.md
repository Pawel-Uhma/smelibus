# Włączenie miasta i przełącznik Miasto/Płaska

obszar: swiat
kto: Szczpan
zależy od: 023
ścieżki: shared/config.ts, sim/world.ts, sim/bonus.ts, ../../server/, ui/lobby/

## Cel

Gdy kolizje z budynkami (023) będą gotowe, miasto staje się **domyślną** mapą (`CITY_ENABLED = true`). Host dostaje w poczekalni przełącznik „Miasto / Płaska”, wysyłany do serwera przed Startem (i przy rewanżu, karta 027). Bonusy i przystanki tylko na ulicach, piesi chodzą po ulicach i parkach, nie przez budynki. Open data (014) zostaje na później. Ustalone z Pawłem (grill 2026-10-18).

## Gotowe, gdy

- [x] nowe party domyślnie startuje na mieście
- [x] host przełącza Miasto/Płaska w poczekalni, inni widzą wybór
- [x] żaden bonus nie spawnuje się w budynku (test)
- [x] wpis w DECISIONS (koniec „MVP na płaskiej mapie”) i GAME_DESIGN (Strefy i mapa)

Uwaga dla 027 (@Pawel): `PartyRoom.newGame()` robi nową mapę z tymi samymi graczami i wysyła `welcome` od nowa, do użycia przy rewanżu. Scena po Starcie nie przebudowuje się sama.
