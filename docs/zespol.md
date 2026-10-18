# Zespół i obszary

Hook startowy szuka Twojego `git config user.name` w tabeli „Osoby”. Jeśli Twoje git user.name jest inne, popraw wiersz. Obszar wybierasz przy pierwszej sesji: agent zapyta, wpisze go i wypchnie.

Obszary to podział z myślą o pracy równoległej. Własność jest miękka: chodzi o to, żeby dwa agenty nie edytowały naraz tych samych plików. Kod obszaru trafia do pola `obszar:` w kartach kanbanu.

## Osoby

| Osoba | git user.name | Obszar |
|---|---|---|
| Paweł | Pawel | siec |
| Szczepan | Szczpan | autobus |
| Janek | Jasiek | smrod |
| Antek | antpop | swiat (+ pogoda) |

## Obszary

Ścieżki są względem `app/src/`.

| Kod | Zakres | Ścieżki |
|---|---|---|
| swiat | świat: generowanie mapy, render świata, kamera, open data | `sim/world.ts`, `render/` (poza podkatalogami innych), `data/` |
| autobus | autobus i pieszy: sterowanie, jazda, wsiadanie, modele voxel | `sim/bus.ts`, `sim/player.ts`, `input/`, `render/models/` |
| smrod | bonusy smrodu i efekt chmury | `sim/bonus.ts`, `render/stink.ts` |
| strefy | strefy, presja, zwycięstwo, HUD i menu | `sim/zones.ts`, `render/zones.ts`, `ui/` |
| siec | serwer Colyseus, lobby, synchronizacja stanu | `../../server/`, `net/`, `ui/lobby/` |
| wspolne | kontrakty i punkt styku (zmiany addytywne, patrz AGENTS.md) | `shared/`, `main.ts` |
