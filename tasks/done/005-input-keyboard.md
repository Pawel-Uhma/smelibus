# Sterowanie z klawiatury

obszar: autobus
kto: Szczpan
zależy od: 001
ścieżki: input/

## Cel

Input z klawiatury jednego gracza (WASD/strzałki, `E`) zamieniany na akcje (gaz, hamulec, skręt, wsiądź/wysiądź). Akcje idą do serwera (karta sieci), lokalnie do `sim/` w trybie offline.

## Gotowe, gdy

- [x] jeden gracz steruje WASD i strzałkami, `E` wsiada/wysiada
- [x] `sim/` i sieć dostają akcje, nie zdarzenia klawiatury

Zrobione wcześniej w `input/keyboard.ts` (commity 6f7b97c, 588f046, 4c37420); karta zamknięta przy porządkach.
