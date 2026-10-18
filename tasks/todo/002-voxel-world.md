# Voxelowy świat: generowanie mapy

obszar: swiat
kto: -
zależy od: 001
ścieżki: sim/world.ts

## Cel

Generowanie mapy (ulice, budynki, przystanki) jako siatki kafelków. Rozmiar z `config.ts` (np. 64×64). Czysta logika, bez Three.js.

## Gotowe, gdy

- [ ] funkcja generująca `Tile[][]` z typami ulica/budynek/przystanek/zajezdnia
- [ ] testy Vitest: mapa ma ulice połączone i przystanki
