---
name: oddaj
description: Wypycha pracę prosto na main. Uruchamia npm run check, opcjonalnie przenosi kartę do done, commituje, robi pull --rebase i push. Używaj, gdy użytkownik mówi „gotowe”, „oddaj”, „wypchnij”, „push”, „/oddaj”, oraz samodzielnie po każdym działającym kroku.
---

# Oddaj: push na main

1. **Przegląd.** `git status` i `git diff --stat`. Bez sekretów (`.env.local`), plików tymczasowych i przypadkowych zmian w cudzych plikach.
2. **Sprawdzenie.** `cd app && npm run check` (gdy scaffold już jest). Czerwone sprawdzenie naprawiasz. Niedokończoną funkcję chowasz za flagą w `shared/config.ts` albo jej nie podłączasz w `main.ts`.
3. **Karta.** Jeśli karta jest skończona: `./scripts/kanban.sh gotowe <nr>`. Jeśli to krok w trakcie, karta zostaje w `doing/`.
4. **Commit.** `git add -A` (po przeglądzie z kroku 1), potem `git commit -m "<obszar>: <co zrobione> [<nr>]"`, po angielsku, w trybie rozkazującym.
5. **Push.** `git pull --rebase`. Jeśli coś przyszło, `npm run check` jeszcze raz. Potem `git push`. Przy konflikcie zachowaj obie zmiany. Jeśli nie wiesz, która wersja jest właściwa: `git rebase --abort` i zapytaj człowieka. Nigdy `--force`.
6. **Info dla innych.** Zmiana w `shared/`, nowa zależność npm albo zmiana mechaniki? Dopisz wpis na końcu `docs/DECISIONS.md` (albo popraw `docs/GAME_DESIGN.md`) w tym samym commicie i podaj użytkownikowi jedną linijkę na czat zespołu.
7. Jeśli karta jest skończona, przejdź do `/zadanie`.
