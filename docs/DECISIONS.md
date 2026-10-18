# Log decyzji

Krótkie wpisy: co ustaliliśmy i dlaczego. Agent przed zaproponowaniem zmiany architektury sprawdza, czy nie zostało to już tu ustalone.

**Nowe wpisy dopisujesz na końcu pliku.** Plik ma w `.gitattributes` scalanie `union`, więc dwa równoległe dopiski nie dają konfliktu. Cudzych wpisów nie zmieniasz: zmianę decyzji zapisujesz nowym wpisem.

## Do ustalenia

- Multiplayer lokalny vs online (domyślnie MVP lokalny).
- Czy i jak używamy otwartych danych (OSM / GTFS) do mapy.
- Model rozrostu stref: presja globalna vs „chmura smrodu” (patrz GAME_DESIGN.md).

## Wpisy

### 2026-10-18 — Stack: TypeScript + Vite + Three.js
Działa w przeglądarce bez instalacji, szybki dev server, agenci AI dobrze znają te narzędzia.

### 2026-10-18 — Logika gry oddzielona od renderu
`src/sim` nie importuje Three.js ani DOM. Pozwala testować logikę w Vitest, pracować równolegle nad renderem i logiką, a w przyszłości uruchomić symulację na serwerze (multiplayer online).

### 2026-10-18 — Workflow: trunk-based, wszyscy na `main`
Mały zespół (4 osoby + agenci), krótki projekt. Brak PR-ów; zamiast tego częsty `pull --rebase`, małe commity, claim zadań i podział kodu na obszary. Szczegóły w AGENTS.md.

### 2026-10-18 — Kanban w `tasks/` zamiast `TASKS.md`
Jedna karta = jeden plik (`todo/` → `doing/` → `done/`), obsługiwany przez `scripts/kanban.sh`. Jedna wspólna tabela przy 4 agentach claimujących naraz dawała konflikty (na hackathonie `todo.md` miał 198 commitów); osobne pliki się nie gryzą, a podwójny claim odrzuca git przy pushu. Zadania T-01…T-14 przeniesione jako karty 001…014.
