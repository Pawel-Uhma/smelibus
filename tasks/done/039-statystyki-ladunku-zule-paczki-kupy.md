# Statystyki ładunku: żule, paczki, kupy

obszar: strefy
kto: Pawel
zależy od: -
ścieżki: shared/types.ts (addytywnie), sim/game.ts (zliczanie przy podniesieniu bonusu), ui/hud.ts, ui/hudModel.ts

## Cel

Gracz widzi, co wiezie i co zebrał w całej grze: ile żuli, paczek, kup i innych bonusów (`BonusKind`). Licznik na żywo w HUD, pełna tabela na ekranie końca gry, z porównaniem między graczami.

## Gotowe, gdy

- [x] w stanie autobusu licznik zebranych bonusów per `BonusKind` (pole dodane addytywnie w `shared/`), synchronizowany przez serwer
- [x] zliczanie w jednym miejscu, przy podniesieniu bonusu (serwer i predykcja dają to samo)
- [x] HUD: aktualnie wiezieni żule plus suma paczek i kup w tej grze
- [x] ekran końca gry: tabela per gracz (żule, paczki, kupy, reszta), wyróżniony lider każdej kategorii
- [x] testy Vitest dla zliczania i modelu HUD

odpowiedź (było pytanie, czy „wiezie” to stan teraz czy suma od startu): w HUD żule to stan teraz (siedzą `ZUL_SIT_SECONDS`), paczki i kupy to suma od startu; w tabeli końca gry wszystko jako suma od startu. Opis w GAME_DESIGN (Bonusy smrodu → Statystyki ładunku).
