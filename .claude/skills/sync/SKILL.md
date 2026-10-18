---
name: sync
description: Krótki obraz zespołu. Pokazuje, kto nad czym pracuje (kanban), co weszło do main w ostatnich godzinach, nowe decyzje i zmiany w kontraktach app/src/shared. Używaj, gdy użytkownik pyta „co robią inni”, „co nowego”, „status”, „/sync”.
---

# Synchronizacja

```
git pull --rebase --autostash
./scripts/kanban.sh tablica
git log --since="2 hours ago" --format='%h %an, %ar: %s'
git log --since="2 hours ago" --stat -- app/src/shared app/src/main.ts
tail -15 docs/DECISIONS.md
grep -rn "pytanie:" tasks/doing tasks/todo
```

Raport, najwyżej 12 linii, puste sekcje pomiń:
- **W toku:** osoba → karta
- **Weszło do main:** 3–5 najważniejszych zmian
- **Uwaga:** zmiany w `shared/` (nowe pola i typy, które możesz wykorzystać), nowe decyzje, linie `pytanie:` do Twojego człowieka, karty w `doing/` bez commitów od ponad godziny (może porzucone)
