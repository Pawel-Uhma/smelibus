# Scaffold gry

obszar: wspolne
kto: -
zależy od: -
ścieżki: app/ (cały), shared/, main.ts

## Cel

Vite + TS + Three.js + Vitest, skrypty `dev`/`check`/`build`, pusta scena, pętla gry z fixed timestep, `src/shared/types.ts` i `config.ts` z podstawowymi typami (`GameState`, `Player`, `Bus`, `Tile`). **Robimy najpierw (jedna osoba), szybko i od razu push**, bo reszta startuje od tego.

## Gotowe, gdy

- [ ] `npm run dev` pokazuje pustą scenę Three.js
- [ ] `npm run check` (typecheck + Vitest) przechodzi
- [ ] typy w `shared/types.ts`, liczby w `shared/config.ts`
- [ ] katalogi `sim/ render/ input/ ui/` istnieją, `main.ts` ma pętlę z fixed timestep
