---
name: spotkanie
description: Przetwarza transkrypt albo notatkę ze spotkania zespołu na decyzje w docs/DECISIONS.md, karty kanbanu i poprawki w docs/GAME_DESIGN.md. Używaj, gdy ktoś wkleja transkrypt, przepisane nagranie albo notatki z rozmowy zespołu.
---

# Spotkanie → decyzje i karty

Transkrypt to surowiec. **Nie zapisujesz go w repo.** Pomijasz żarty, dygresje i sprawy bez wpływu na pracę.

1. `git pull --rebase --autostash`, potem przeczytaj `docs/GAME_DESIGN.md`, końcówkę `docs/DECISIONS.md` i `./scripts/kanban.sh tablica`.
2. Wyciągnij **decyzje** (z jednozdaniowym „dlaczego”), **zadania** (obszar, kryterium „gotowe”) i **otwarte kwestie** (kto rozstrzyga).
3. Pokaż listę zmian i poczekaj na zgodę. Potem:
   - Decyzje dopisz na końcu `docs/DECISIONS.md`, a rozstrzygnięte pytania usuń z „Do ustalenia”.
   - Zmiany mechanik wpisz do `docs/GAME_DESIGN.md`.
   - Nowe zadania dodaj przez `./scripts/kanban.sh nowe <obszar> "<tytuł>"` i uzupełnij cel i kryteria. Nieaktualne karty z `todo/` usuń.
4. Wypchnij jednym commitem `docs: meeting notes` i podaj podsumowanie w 3–5 linijkach na czat zespołu.
