# Minimapa i strzałka do własnej strefy

obszar: strefy
kto: -
zależy od: -
ścieżki: ui/minimap.ts (nowy), ui/hud.ts

## Cel

Minimapa w rogu HUD na `<canvas>` 2D, tylko czyta stan. Ustalone z Pawłem (grill 2026-10-18).

- kafelki w kolorach właścicieli (1 kafelek = 1 piksel, przeskalowane), budynki ciemniejsze
- autobusy jako kropki, własny większy ze strzałką kierunku
- piesi jako mniejsze kropki
- chmury jako półprzezroczyste kółka: niebieskie (deszcz), bursztynowe (Harnaś)
- **bez bonusów**, żeby nie było za łatwo

Do tego strzałka przy krawędzi ekranu do najbliższej granicy własnej strefy, gdy jej nie widać.

## Gotowe, gdy

- [ ] minimapa odświeża się płynnie przy 8 graczach i mapie ~56×56
- [ ] strzałka znika, gdy granica własnej strefy jest na ekranie
- [ ] test Vitest liczący najbliższy kafelek granicy (czysta funkcja)
