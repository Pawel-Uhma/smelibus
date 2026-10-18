---
name: zadanie
description: Bierze następną wolną kartę z kanbanu (tasks/todo) dla obszaru użytkownika, zajmuje ją przez scripts/kanban.sh wez (od razu push na main) i zaczyna pracę. Używaj, gdy użytkownik mówi „co teraz”, „biorę zadanie”, „następne”, „/zadanie” albo podaje numer karty.
---

# Weź kartę

0. **Świeży main.** `git pull --rebase --autostash`, potem `git log --oneline -10`, żeby zobaczyć, co przyszło.
1. **Najpierw swoje.** Jeśli w `tasks/doing/` jest Twoja karta (`kto:` = Twoje `git config user.name`), dokończ ją. Masz niewypchniętą pracę? Najpierw `/oddaj`. Jedna karta naraz.
2. **Obszar.** Weź go z `docs/zespol.md`. Jeśli jest `-`, pokaż obszary i to, kto które już wziął, zapytaj użytkownika, wpisz wybór i wypchnij (`docs: <imię> bierze obszar <kod>`).
3. **Wybierz.** `./scripts/kanban.sh tablica <obszar>`. Bierz najniższy numer, którego `zależy od:` jest w `tasks/done/`. Jeśli zależność jest dopiero w `doing/` (np. scaffold 001), też możesz wziąć kartę: zacznij od czystej logiki w `sim/` z testami albo od planu, a podłącz po pushu zależności. Jeśli w Twoim obszarze nic nie ma, pokaż całą tablicę i zaproponuj kartę, której nikt nie ruszył.
4. **Zajmij.** `./scripts/kanban.sh wez <nr>`. Skrypt sam robi pull, commit i push. Jeśli powie „ktoś był szybszy”, weź następną bez pytania.
5. **Działaj.** Przeczytaj kartę, odpowiednią część `docs/GAME_DESIGN.md` i typy w `app/src/shared/`. Pokaż plan w 3–5 punktach i od razu pracuj. Nie czekaj na zatwierdzenie, chyba że karta jest niejasna.

W trakcie:
- Wypychaj każdy działający krok (`/oddaj` bez zamykania karty).
- Brakuje czegoś z innego obszaru? Robisz stub zgodny z `shared/` i jedziesz dalej.
- Odkryta praca: `./scripts/kanban.sh nowe <obszar> "<tytuł>"`, potem wypchnij.
- Karta za duża: podziel ją na nowe karty, swoją zawęź.
