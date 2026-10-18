# Log decyzji

Krótkie wpisy: co ustaliliśmy i dlaczego. Agent przed zaproponowaniem zmiany architektury sprawdza,
czy nie zostało to już tu ustalone. Nowe wpisy na górze.

## 2026-10-18 — Workflow: trunk-based, wszyscy na `main`
Mały zespół (4 osoby + agenci), krótki projekt. Brak PR-ów; zamiast tego częsty `pull --rebase`,
małe commity, claim zadań w TASKS.md i podział kodu na obszary. Szczegóły w AGENTS.md.

## 2026-10-18 — Logika gry oddzielona od renderu
`src/sim` nie importuje Three.js ani DOM. Pozwala testować logikę w Vitest, pracować równolegle
nad renderem i logiką, a w przyszłości uruchomić symulację na serwerze (multiplayer online).

## 2026-10-18 — Stack: TypeScript + Vite + Three.js
Działa w przeglądarce bez instalacji, szybki dev server, agenci AI dobrze znają te narzędzia.

## Do ustalenia
- Multiplayer lokalny vs online (domyślnie MVP lokalny).
- Czy i jak używamy otwartych danych (OSM / GTFS) do mapy.
- Model rozrostu stref: presja globalna vs „chmura smrodu" (patrz GAME_DESIGN.md).
