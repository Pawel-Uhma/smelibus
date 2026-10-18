# Paczkomaty InPost: paczka albo kupa po uderzeniu

obszar: swiat
kto: antpop
zależy od: -
ścieżki: sim/paczkomat.ts, render/paczkomat.ts, render/bonusModels.ts, sim/game.ts, sim/prediction.ts, shared/

## Cel

Paczkomaty InPost przy ulicach. Uderzenie autobusem w drzwi wybija paczkę (+5), w 30% kupę (+30).

## Gotowe, gdy

- [x] rozstawianie z seeda, z dala od Żabek, drzwi do ulicy
- [x] kolizja autobusu (serwer i predykcja), wybicie tylko przy uderzeniu czołowym ≥ 3 kafelki/s, cooldown 6 s
- [x] modele: szafka, paczka, kupa; testy
