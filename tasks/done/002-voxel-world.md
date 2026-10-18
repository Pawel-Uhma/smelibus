# Generowanie płaskiej mapy z elementami

obszar: swiat
kto: antpop
zależy od: 001
ścieżki: sim/world.ts

## Cel

Płaska mapa bez budynków i ulic jako siatka kafelków, generowana losowo z ziarna (seed, żeby serwer i klienci mieli to samo). Rozmiar zależny od liczby graczy: ok. `TILES_PER_PLAYER` (400) kafelków na gracza, z `config.ts`. Rozmieszcza elementy: przystanki, śmietniki, punkty startowe graczy i autobusy (liczba graczy + 2). Czysta logika, bez Three.js.

## Gotowe, gdy

- [x] funkcja `generateWorld(seed, playerCount)` zwraca kafelki, elementy i punkty startowe
- [x] testy Vitest: rozmiar rośnie z liczbą graczy, elementy nie nachodzą na siebie, ten sam seed = ta sama mapa

## Zrobione

Oprócz płaskiej mapy jest generator miasta za flagą `CITY_ENABLED` (domyślnie wyłączony): ring ulic, podział BSP na kwartały, działki z budynkami (wysokość 1–4), parki, przystanki przy budynkach (`World.stops`). Spawn autobusów, bonusów i pozycje na Start trafiają na kafelki przejezdne (`nearestDrivable`). Render w `render/city.ts`. Brakuje kolizji z budynkami: karta 023.
