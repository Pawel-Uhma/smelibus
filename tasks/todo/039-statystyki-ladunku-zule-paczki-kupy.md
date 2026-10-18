# Statystyki ładunku: żule, paczki, kupy

obszar: strefy
kto: -
zależy od: -
ścieżki: shared/types.ts (addytywnie), sim/game.ts (zliczanie przy podniesieniu bonusu), ui/hud.ts, ui/hudModel.ts

## Cel

Gracz widzi, co wiezie i co zebrał w całej grze: ile żuli, paczek, kup i innych bonusów (`BonusKind`). Licznik na żywo w HUD, pełna tabela na ekranie końca gry, z porównaniem między graczami.

## Gotowe, gdy

- [ ] w stanie autobusu licznik zebranych bonusów per `BonusKind` (pole dodane addytywnie w `shared/`), synchronizowany przez serwer
- [ ] zliczanie w jednym miejscu, przy podniesieniu bonusu (serwer i predykcja dają to samo)
- [ ] HUD: aktualnie wiezieni żule plus suma paczek i kup w tej grze
- [ ] ekran końca gry: tabela per gracz (żule, paczki, kupy, reszta), wyróżniony lider każdej kategorii
- [ ] testy Vitest dla zliczania i modelu HUD

pytanie: czy „wiezie” znaczy stan teraz (żule siedzą `ZUL_SIT_SECONDS`), czy suma od startu? Proponuję oba: żule teraz, reszta jako suma.
