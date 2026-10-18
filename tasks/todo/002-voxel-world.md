# Generowanie płaskiej mapy z elementami

obszar: swiat
kto: -
zależy od: 001
ścieżki: sim/world.ts

## Cel

Płaska mapa bez budynków i ulic jako siatka kafelków, generowana losowo z ziarna (seed, żeby serwer i klienci mieli to samo). Rozmiar zależny od liczby graczy: ok. `TILES_PER_PLAYER` (400) kafelków na gracza, z `config.ts`. Rozmieszcza elementy: przystanki, śmietniki, punkty startowe graczy i autobusy (liczba graczy + 2). Czysta logika, bez Three.js.

## Gotowe, gdy

- [ ] funkcja `generateWorld(seed, playerCount)` zwraca kafelki, elementy i punkty startowe
- [ ] testy Vitest: rozmiar rośnie z liczbą graczy, elementy nie nachodzą na siebie, ten sam seed = ta sama mapa
