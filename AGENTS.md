# Zasady współpracy (ludzie + agenci AI)

4 osoby, każda pracuje z agentem AI. Wszyscy pushują bezpośrednio na `main`.
Ten plik czyta każdy agent na starcie sesji — trzymaj go krótkim i aktualnym.

Najpierw przeczytaj: [README.md](README.md) (stack, struktura), [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md)
(mechaniki), [TASKS.md](TASKS.md) (kto co robi), [docs/DECISIONS.md](docs/DECISIONS.md) (co już ustalono).

## Workflow: małe kroki, częsty sync

```
git pull --rebase           # 1. zawsze przed rozpoczęciem pracy
# 2. weź zadanie z TASKS.md -> wpisz się, commit "claim: T-xx", push OD RAZU
# 3. pracuj małymi krokami, commituj często
npm run check               # 4. typecheck + testy muszą przejść
git pull --rebase           # 5. dociągnij zmiany innych
npm run check               #    ...i sprawdź jeszcze raz, jeśli coś przyszło
git push                    # 6. push
# 7. po skończeniu: oznacz zadanie jako zrobione w TASKS.md
```

- **Pushuj często** (co ~30–60 min lub po każdym działającym kroku). Długo żyjące lokalne zmiany = konflikty.
- **Każdy commit na `main` musi się budować.** Niedokończoną funkcję schowaj za flagą w `src/shared/config.ts`
  albo po prostu nie podłączaj jej w `main.ts`.
- **Claim przed pracą.** Jeśli przy pushu claima okaże się, że ktoś już wziął to zadanie — odpuść i weź inne.
- **Jedno zadanie na raz** na osobę/agenta.

## Podział kodu = mniej konfliktów

Kod gry jest w `app/` — ścieżki poniżej i w TASKS.md są względem `app/` (`src/sim/` = `app/src/sim/`).
Komendy `npm` uruchamiaj w `app/`.

Każde zadanie ma swój obszar (katalog). Pracuj w swoim obszarze; w cudzym tylko minimalne zmiany.

- `src/shared/` to **kontrakty** między modułami (typy `GameState`, `Bus`, `Tile`, stałe, config).
  Zmiany tylko **addytywne** (dodaj pole, nie zmieniaj/usuwaj istniejących). Breaking change →
  najpierw uzgodnij z ludźmi, potem zrób w osobnym commicie z prefiksem `shared!:`.
- `src/sim/` — czysta logika: **bez importów Three.js i DOM**. Funkcje typu `update(state, input, dt)`.
  Pisz do niej testy Vitest.
- `src/render/` tylko czyta stan gry, nigdy go nie modyfikuje.
- `src/main.ts` to punkt styku — zmiany tam trzymaj krótkie (podłączenie modułu = kilka linii).

## Zasady dla agentów AI

- **Nie rób rzeczy spoza zadania**: bez refaktorów „przy okazji", bez przeformatowania całych plików,
  bez zmiany nazw w cudzych modułach. Widzisz problem gdzie indziej → dopisz zadanie do TASKS.md.
- **Nigdy**: `git push --force`, `git reset --hard`, `git checkout -- .`, `git clean`, `--no-verify`,
  usuwanie cudzych plików. Te komendy kasują pracę innych.
- **Konflikt przy rebase**: zachowaj obie zmiany. Jeśli nie wiesz, która wersja jest właściwa —
  przerwij (`git rebase --abort`) i zapytaj człowieka.
- **Nowa zależność npm** → tylko gdy naprawdę potrzebna; dopisz uzasadnienie do DECISIONS.md.
- **Decyzja architektoniczna lub zmiana mechaniki** → wpis w `docs/DECISIONS.md` / `docs/GAME_DESIGN.md`
  w tym samym commicie co kod.
- Czytaj plik przed edycją — inny agent mógł go zmienić 5 minut temu.
- Nie zgaduj stanu repo — po `git pull` sprawdź, co się zmieniło (`git log --oneline -10`).

## Konwencje

- Kod, nazwy, komentarze: **angielski**. Dokumentacja i rozmowy: polski.
- Commity: `obszar: co zrobione`, np. `bus: add steering`, `zones: border growth`, `claim: T-04`,
  `docs: update bonus table`. Krótko, w trybie rozkazującym.
- Liczby balansu (smród, prędkości, rozmiar mapy) → `src/shared/config.ts`, nie hardkoduj w logice.
- Pliki małe i jednoznaczne (`sim/bus.ts`, `sim/zones.ts`), jeden moduł = jedna odpowiedzialność.
