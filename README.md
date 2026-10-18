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

## Uruchomienie

Kod gry jest w `app/`, deploy na Vercel (smelibus.vercel.app).

```bash
cd app
npm install
npm run dev      # dev server, http://localhost:5173
npm run check    # typecheck + testy — musi przechodzić przed każdym pushem
npm run build    # build produkcyjny
```

> Skrypty powstaną w zadaniu T-01 (scaffold) — patrz [TASKS.md](TASKS.md).

## Struktura

```
app/src/
  main.ts      # bootstrap: pętla gry, łączy moduły
  shared/      # KONTRAKTY: typy, stałe, konfiguracja balansu (zmieniać ostrożnie)
  sim/         # logika gry — czyste TS, bez Three.js i DOM, testowalne
  render/      # Three.js: voxele, kamera, efekty smrodu
  input/       # klawiatura / gamepad -> akcje gracza
  ui/          # HUD, menu, ekran zwycięstwa (HTML/CSS nad canvasem)
brain/         # lokalnie, poza gitem: PRD, wymagania (patrz CLAUDE.md)
docs/
  GAME_DESIGN.md   # mechaniki gry
  DECISIONS.md     # log decyzji
TASKS.md       # tablica zadań (kto co robi)
AGENTS.md      # zasady współpracy — dla ludzi i agentów AI
```

## Współpraca

4 osoby, każda z agentem AI, wszyscy pushują na `main`.
Zasady: **[AGENTS.md](AGENTS.md)** (agenci czytają go automatycznie — `CLAUDE.md` go importuje).
