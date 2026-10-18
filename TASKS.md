# Tablica zadań

Jak używać: wpisz swoje imię w kolumnie „Kto", zmień status na `w toku`, commit `claim: T-xx`, push od razu.
Po skończeniu: status `zrobione`. Nowe zadania dopisuj na końcu z kolejnym numerem.

Ścieżki w kolumnie „Obszar" są względem `app/src/`.

Statusy: `wolne` · `w toku` · `zrobione` · `zablokowane`

T-01 robimy najpierw (jedna osoba), reszta startuje po jego pushu. Obszary są dobrane tak,
żeby 4 osoby mogły pracować równolegle: **świat/render**, **autobus/sterowanie**, **bonusy/smród**, **strefy/UI**.

| ID | Zadanie | Obszar | Kto | Status |
|---|---|---|---|---|
| T-01 | Scaffold: Vite + TS + Three.js + Vitest, skrypty `dev`/`check`/`build`, pusta scena, pętla gry z fixed timestep, `src/shared/types.ts` i `config.ts` z podstawowymi typami (`GameState`, `Player`, `Bus`, `Tile`) | `app/` (cały), `shared/`, `main.ts` | | wolne |
| T-02 | Voxelowy świat: generowanie mapy (ulice, budynki, przystanki) jako siatki kafelków | `sim/world.ts` | | wolne |
| T-03 | Render świata voxelami (`InstancedMesh`), kamera, światło | `render/` | | wolne |
| T-04 | Voxelowy model autobusu + ludzika, render z kolorem gracza | `render/models/` | | wolne |
| T-05 | Sterowanie: input klawiatura (2 graczy na jednej klawiaturze) → akcje | `input/` | | wolne |
| T-06 | Pieszy: chodzenie, wsiadanie/wysiadanie z autobusu (`E`), przejmowanie pustego autobusu | `sim/player.ts` | | wolne |
| T-07 | Jazda autobusem: zręcznościowa fizyka, kolizje z budynkami | `sim/bus.ts` | | wolne |
| T-08 | Bonusy smrodu: spawn, zbieranie, `stink` autobusu, wietrzenie | `sim/bonus.ts` | | wolne |
| T-09 | Efekt smrodu w renderze: zielona chmura/cząsteczki skalowane `stink` | `render/stink.ts` | | wolne |
| T-10 | Strefy: podział startowy, presja, rozrost granic, eliminacja, warunek zwycięstwa | `sim/zones.ts` | | wolne |
| T-11 | Render stref: kolorowanie kafelków / granic według właściciela | `render/zones.ts` | | wolne |
| T-12 | HUD: % mapy każdego gracza, smród autobusu, ekran zwycięstwa, menu startowe (liczba graczy) | `ui/` | | wolne |
| T-13 | Gamepady (3–4 graczy) | `input/` | | wolne |
| T-14 | Open data: przystanki/ulice z OSM lub GTFS (najpierw decyzja w DECISIONS.md) | `sim/world.ts`, `data/` | | wolne |
