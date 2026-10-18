# Zderzenia wielu autobusów: odrzut, taran, krawędź, predykcja

obszar: autobus
kto: Pawel
zależy od: 021
ścieżki: sim/bus.ts, sim/prediction.ts, sim/game.ts, main.ts, shared/types.ts, shared/config.ts

## Cel

Test kilku autobusów wjeżdżających w siebie (najechanie, czołówka, T-bone, otarcie, kanapka,
karambol 5 autobusów, przyciśnięcie do krawędzi, klient z pingiem) wykazał błędy:

- pchanie autobusu z gazem liczyło się jako taran w każdej klatce (44 tarany, smród do zera),
  bo taran brał prędkość taranującego, a nie prędkość zbliżania,
- T-bone: uderzony stał w miejscu, a taranujący po 70% wyhamowaniu taranował drugi raz,
- autobus wypychany za mapę przy przyciśnięciu do krawędzi,
- w karambolu autobusy zostawały w sobie (jedno przejście po parach),
- otarcie pod kątem 8–15° odrzucało autobus do tyłu (14 → -5,6), zamiast prawie nie hamować,
- w karambolu prędkość spadała do -10 i autobus wylatywał na drugi koniec mapy.

Zderzenia prostokątami i predykcja zderzeń własnego autobusu są z karty 021 (Szczepan);
tu tylko fizyka po kontakcie.

## Gotowe, gdy

- [x] taran tylko przy prędkości zbliżania ≥ RAM_MIN_SPEED, pchanie to nie taran
- [x] boczny odrzut (`pushX/pushZ`), T-bone odpycha uderzonego w bok
- [x] nikt nie wylatuje za mapę, karambol się rozdziela (COLLISION_ITERATIONS)
- [x] predykcja trzyma odrzut w historii i przejmuje odrzut z serwera
