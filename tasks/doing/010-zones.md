# Strefy: podział, skok przy wjeździe, sudden death, zwycięstwo

obszar: strefy
kto: Pawel
zależy od: 001
ścieżki: sim/zones.ts

## Cel

Podział startowy na tyle stref, ilu graczy (np. Voronoi od punktów startowych). **Skok:** gdy autobus z kierowcą przekroczy granicę do strefy kierowcy, gracz przejmuje N = stink × mnożnik kafelków od punktu wjazdu na zewnątrz (najbliższe pierwsze, niezależnie od właściciela), smród spada do 0. Gracz z 0 kafelków zostaje w grze, ale nie rośnie. Sudden death: mnożnik ×2 po 8 min, ×3 po 10. Wygrana przy 100%. Dołączenie w trakcie: strefa startowa wycięta liderowi. Patrz GAME_DESIGN.

## Gotowe, gdy

- [ ] testy Vitest: skok zabiera najbliższe kafelki od punktu wjazdu i zeruje smród
- [ ] testy Vitest: gracz z 0 kafelków nie rośnie, wygrana przy 100%, mnożnik sudden death
- [ ] testy Vitest: nowy gracz dostaje strefę wyciętą liderowi
