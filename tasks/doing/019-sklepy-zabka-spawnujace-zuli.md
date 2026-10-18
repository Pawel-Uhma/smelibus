# Sklepy Żabka spawnujące żuli

obszar: smrod
kto: Jasiek
zależy od: 002, 008
ścieżki: sim/zabka.ts, shared/config.ts

## Cel

Na mapie stoją sklepy Żabka (punkty z generatora mapy, voxelowy budynek). Każda Żabka co jakiś czas wypuszcza żula: pojawia się jako bonus „Żul” (+25, wolniej wietrzeje) obok sklepu i zostaje tam, dopóki ktoś go nie zbierze. Im dalej w grę, tym więcej żuli: odstęp między spawnami maleje z czasem meczu, a limit żuli przy jednej Żabce rośnie. Liczby (odstęp startowy, minimalny, tempo przyspieszania, limit) w `config.ts`.

## Gotowe, gdy

- [ ] Żabki w `GameState` (pozycje z seeda mapy)
- [ ] spawn żuli przy Żabkach, częstszy z czasem meczu, z limitem na sklep
- [ ] testy Vitest: na początku meczu rzadko, później częściej; limit nie jest przekraczany
- [ ] voxelowy model Żabki w renderze (albo osobna karta)
