# Żule w trzech wersjach i duża Żabka z żabą na dachu

obszar: smrod
kto: Szczpan
zależy od: 019, 025
ścieżki: render/bonusModels.ts, render/bonuses.ts, render/zul.ts, render/zabka.ts, sim/zabka.ts, shared/config.ts

## Cel

Zespół wybrał z propozycji grafiki (strona „Żule i Żabki”) żuli B, C, D i Żabkę D, powiększoną.
Każdy żul to losowo (po id bonusu) jedna z trzech wersji: na skrzynce po piwie, dres z reklamówką,
śpiący na kartonie. Żul spod Żabki wychodzi w pozie „idzie”, a na miejscu siada na skrzynce,
kładzie się na kartonie albo (dres) przewraca się na twarz. Żabka zajmuje 2 × 2 kafelki
i ma na dachu wielką voxelową żabę.

## Gotowe, gdy

- [x] trzy wersje żula w `bonusModels.ts`, pozy „idzie” i „na miejscu”
- [x] żul z przystanku stoi w miejscu (nie kręci się), Żabkowy kończy w pozie swojej wersji
- [x] Żabka 2 × 2 kafelki: rozstawianie, drzwi, kolizje (`ZABKA_TILES` w config)
- [x] model Żabki z żabą na dachu, testy
