# Pieszy: chodzenie, wsiadanie i wysiadanie, przejmowanie autobusu

obszar: autobus
kto: Szczpan
zależy od: 001
ścieżki: sim/player.ts

## Cel

Chodzenie, `E` przy autobusie (zasięg ~2 kafelki) = wsiada, jeśli wolny; `E` w autobusie = wysiada obok. Pusty autobus może wziąć każdy, także zaparkowany w cudzej strefie (GAME_DESIGN). Potrącony przez autobus pieszy jest ogłuszony na `STUN_SECONDS` (~3 s): nie chodzi i nie wsiada.

## Gotowe, gdy

- [ ] testy Vitest: wsiadanie, wysiadanie, przejęcie autobusu przeciwnika
- [ ] testy Vitest: potrącenie ogłusza pieszego, po czasie wraca ruch
