# Smród do 1000 i sudden death bez końca

obszar: strefy
kto: -
zależy od: -
ścieżki: shared/config.ts, sim/zones.ts, ui/

## Cel

Limit smrodu w autobusie rośnie ze 100 do 1000 (`STINK_MAX`). Sudden death zaczyna się wcześniej i nie ma końca: ×2 po 4 min, potem +1 co 2 min (×3, ×4, …). Liczby trzymaj w `shared/config.ts`, żeby dało się je stroić.

## Gotowe, gdy

- [ ] autobus może uzbierać do 1000 smrodu, a pasek smrodu w HUD nadal czytelnie pokazuje małe wartości (np. liczba obok paska)
- [ ] mnożnik rośnie bez limitu, a HUD pokazuje aktualny (×2, ×3, …) i czas do następnego
- [ ] GAME_DESIGN zgadza się z kodem
