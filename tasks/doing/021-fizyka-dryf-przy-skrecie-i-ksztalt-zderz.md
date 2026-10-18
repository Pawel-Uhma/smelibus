# Fizyka: dryf przy skręcie i kształt zderzeń

obszar: autobus
kto: Szczpan
zależy od: 007
ścieżki: sim/bus.ts, sim/prediction.ts, main.ts

## Cel

Autobus nie dryfuje w bok przy skręcie (predykcja klienta porównuje serwer z własną historią,
zamiast ciągnąć do opóźnionej pozycji). Zderzenia autobusów kształtem pasującym do modelu
(kapsuła zamiast koła), otarcie nie hamuje, staranowany autobus zostaje popchnięty.

## Gotowe, gdy

- [ ] skręt bez dryfu przy pingu
- [ ] autobusy obok siebie nie odbijają się przed dotknięciem, czołowo nie wchodzą w siebie
