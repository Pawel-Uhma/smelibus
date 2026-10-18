# Smelibus 🚌💨

Prosta gra z voxelową grafiką 3D (przeglądarka). Gracze wsiadają do autobusów, jeżdżą po mieście
i zbierają bonusy, od których autobus coraz bardziej **śmierdzi** (żul z przystanku, kebab z cebulą,
mokry pies...). Mapa jest podzielona na strefy — po jednej na gracza. Im bardziej śmierdzące autobusy
ma gracz, tym szybciej jego strefa się rozrasta. **Wygrywa ten, kto przejmie całą mapę.**

Pełny opis mechanik: [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md)

## Stack

- **TypeScript + Vite** — build i dev server
- **Three.js** — render 3D (voxele jako `InstancedMesh`)
- **Vitest** — testy logiki gry (`src/sim`)
- **Colyseus** (Node.js) — serwer gry online w `server/`, hostowany na Railway

## Uruchomienie

Klient jest w `app/` (deploy na Vercel, smelibus.vercel.app), serwer gry w `server/` (Railway).

```bash
cd app
npm install
npm run dev      # dev server, http://localhost:5173
npm run check    # typecheck + testy — musi przechodzić przed każdym pushem
npm run build    # build produkcyjny
```

> Skrypty powstaną w karcie 001 (scaffold): `./scripts/kanban.sh tablica`.

## Struktura

```
app/src/
  main.ts      # bootstrap: pętla gry, łączy moduły
  shared/      # KONTRAKTY: typy, stałe, konfiguracja balansu (zmieniać ostrożnie)
  sim/         # logika gry — czyste TS, bez Three.js i DOM, testowalne
  render/      # Three.js: voxele, kamera, efekty smrodu
  input/       # klawiatura / gamepad -> akcje gracza
  ui/          # HUD, menu, ekran zwycięstwa (HTML/CSS nad canvasem)
brain/         # mózg projektu: PRD, transkrypty spotkań, wnioski (patrz brain/CLAUDE.md)
docs/
  GAME_DESIGN.md   # mechaniki gry
  DECISIONS.md     # log decyzji
  zespol.md        # kto ma który obszar
tasks/         # kanban: todo/ → doing/ → done/, jedna karta = jeden plik
scripts/kanban.sh  # tablica | wez N | gotowe N | nowe <obszar> "tytuł"
AGENTS.md      # zasady współpracy — dla ludzi i agentów AI
```

## Współpraca

4 osoby, każda z agentem Claude Code, wszyscy pushują prosto na `main`. Zasady: **[AGENTS.md](AGENTS.md)** (agenci czytają go automatycznie, bo `CLAUDE.md` go importuje).

**Start dla każdego:**
1. `git clone https://github.com/Pawel-Uhma/smelibus && cd smelibus`
2. Sprawdź, że `git config user.name` zgadza się z wierszem w [docs/zespol.md](docs/zespol.md)
3. `claude`, potem `/zadanie`. Agent zapyta o obszar, weźmie kartę i zacznie.

**Pętla:**
```
/zadanie  →  agent bierze kartę z Twojego obszaru (kanban.sh wez: od razu push, kto pierwszy, ten lepszy)
   ...    →  praca, push po każdym działającym kroku
/oddaj    →  npm run check, karta do done, pull --rebase, push
/sync     →  co zrobili inni, zmiany w shared/
```
`/spotkanie` zamienia notatkę z rozmowy na decyzje i karty.
