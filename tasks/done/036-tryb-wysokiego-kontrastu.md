# Tryb wysokiego kontrastu

obszar: swiat
kto: Antek
zależy od: -
ścieżki: render/contrast.ts, render/zones.ts, render/night.ts, style.css, main.ts

## Cel

Gra czytelna dla słabowidzących i na słabych ekranach: strefy w pełnych kolorach z grubą czarną
granicą, HUD bez przezroczystości, noc nie gasi planszy.

## Gotowe, gdy

- [x] Przycisk „Kontrast” w HUD i klawisz K przełączają tryb, wybór zostaje w localStorage
- [x] Domyślnie włączony przy `prefers-contrast: more` albo `?kontrast`
- [x] Strefy: bledsze wypełnienie (autobus w kolorze gracza nie ginie), granica czysto czarna
- [x] Noc przyciemnia najwyżej do `HIGH_CONTRAST_NIGHT_MAX`
- [x] HUD, zegar, pasek smrodu, minimapa: nieprzezroczyste tło, grubsze ramki
