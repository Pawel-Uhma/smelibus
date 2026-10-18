# Zasady współpracy (ludzie + agenci AI)

4 osoby, każda z własnym agentem Claude Code na swoim laptopie. **Wszyscy pushują prosto na `main`, bez gałęzi, PR-ów i review.** Liczy się tempo. Agenty nie mają wspólnej pamięci: widzą się nawzajem tylko przez commity na `main` i pliki w repo. Czego nie wypchniesz, tego inni nie wiedzą.

Najpierw przeczytaj: [README.md](README.md) (stack, struktura), [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) (mechaniki), [docs/DECISIONS.md](docs/DECISIONS.md) (co już ustalono), [docs/zespol.md](docs/zespol.md) (kto ma który obszar).

## Kanban: `tasks/`

Jedna karta to jeden plik: `tasks/todo/` → `tasks/doing/` (z polem `kto:`) → `tasks/done/`. Każde zadanie ma osobny plik, więc równoległe zmiany nie dają konfliktów. Obsługujesz go **tylko** przez skrypt:

```
./scripts/kanban.sh tablica [obszar]        # co jest wolne, kto co robi
./scripts/kanban.sh wez 7                   # zajmij: pull + commit + push od razu
./scripts/kanban.sh nowe autobus "Klakson"  # nowa karta (wypchnij ze swoją pracą)
./scripts/kanban.sh gotowe 7                # do done (w tym samym commicie co kod)
```
Jeśli przy `wez` ktoś był szybszy, git odrzuci push, a skrypt powie „ktoś był szybszy”. Wtedy bierzesz inną kartę. **Jedna karta naraz na osobę.**

## Polecenia (skille)

| Polecenie | Co robi |
|---|---|
| `/zadanie` | bierze następną wolną kartę z Twojego obszaru i od razu zaczyna |
| `/oddaj` | `npm run check`, karta do `done`, commit, `pull --rebase`, push |
| `/sync` | co zrobili inni, kto co ma w toku, zmiany w `shared/` |
| `/spotkanie` | notatka ze spotkania → decyzje, karty, GAME_DESIGN |

Hook startowy (`.claude/hooks/session-start.sh`) robi `git pull` (jeśli drzewo jest czyste) i podaje Ci osobę, obszar, tablicę i ostatnie commity innych.

## Workflow: małe kroki, częsty push

0. **Zawsze `git pull --rebase` na początku pracy i przed każdą nową kartą.** Hook robi to sam na starcie sesji, ale tylko przy czystym drzewie. Jeśli zgłosi niezacommitowane pliki, najpierw je zacommituj i zrób pull, dopiero potem pracuj.
1. **Commituj i pushuj sam, bez pytania**, po każdym działającym kroku i co najmniej co 30–60 minut. Zespół dał na to stałą zgodę. Długo trzymane lokalne zmiany oznaczają konflikty.
2. Przed pushem: `npm run check` (w `app/`), potem `git pull --rebase`. Jeśli coś przyszło, `check` jeszcze raz, potem `git push`.
3. **Każdy commit na `main` musi się budować.** Niedokończoną funkcję schowaj za flagą w `src/shared/config.ts` albo po prostu jej nie podłączaj w `main.ts`.
4. **Konflikt przy rebase:** zachowaj obie zmiany. Jeśli nie wiesz, która wersja jest właściwa, przerwij (`git rebase --abort`) i zapytaj człowieka.
5. **Nigdy:** `git push --force`, `git reset --hard`, `git checkout -- .`, `git clean`, `--no-verify`, usuwanie cudzych plików. Te komendy kasują pracę innych.
6. Czytaj plik przed edycją, bo inny agent mógł go zmienić 5 minut temu. Po `git pull` sprawdź, co przyszło (`git log --oneline -10`).

## Podział kodu = mniej konfliktów

Kod gry jest w `app/`, a ścieżki poniżej są względem `app/src/`. Komendy `npm` uruchamiaj w `app/`. Obszary i ich ścieżki są w [docs/zespol.md](docs/zespol.md). Pracuj w swoim obszarze, w cudzym rób tylko minimalne zmiany i od razu je wypchnij.

- `shared/` to **kontrakty** między modułami (typy `GameState`, `Bus`, `Tile`, stałe, config). Zmiany tylko **addytywne**: dodajesz pole, nie zmieniasz ani nie usuwasz istniejących. Zmianę łamiącą najpierw uzgadniasz z ludźmi, potem robisz osobnym commitem z prefiksem `shared!:`.
- `sim/` to czysta logika, **bez importów Three.js i DOM**. Funkcje typu `update(state, input, dt)` z testami Vitest.
- `render/` tylko czyta stan gry, nigdy go nie modyfikuje.
- `main.ts` to punkt styku. Podłączenie modułu to kilka linii.
- **Nie czekasz na nikogo:** brakuje czegoś z innego obszaru? Zrób stub zgodny z typami w `shared/`.

## Zasady dla agentów

- **Nie rób rzeczy spoza karty:** bez refaktorów „przy okazji”, bez przeformatowania całych plików, bez zmiany nazw w cudzych modułach. Widzisz problem gdzie indziej? Dodaj kartę (`kanban.sh nowe`).
- Pytanie albo blokada wobec innej osoby: linia `pytanie: @<imię> …` w karcie, wypchnięta od razu, plus wiadomość na czacie zespołu.
- **Nowa zależność npm** tylko wtedy, gdy naprawdę jest potrzebna, z uzasadnieniem w `docs/DECISIONS.md`.
- **Decyzja architektoniczna albo zmiana mechaniki** to wpis w `docs/DECISIONS.md` albo `docs/GAME_DESIGN.md` w tym samym commicie co kod. W DECISIONS dopisujesz **na końcu** (scalanie `union`, więc bez konfliktów).
- Sekrety trzymasz w `.env.local`, nie w git. Nazwy zmiennych zapisujesz w `.env.example`.

## Konwencje

- Kod, nazwy, komentarze: **angielski**. Dokumentacja i rozmowy: polski.
- Commity: `obszar: co zrobione [nr karty]`, np. `bus: add steering [007]`, `zones: border growth [010]`, `docs: update bonus table`. Krótko, w trybie rozkazującym, bez przypisywania autorstwa Claude.
- Liczby balansu (smród, prędkości, rozmiar mapy) trzymasz w `src/shared/config.ts`, nie hardkodujesz ich w logice.
- Pliki małe i jednoznaczne (`sim/bus.ts`, `sim/zones.ts`): jeden moduł, jedna odpowiedzialność.
