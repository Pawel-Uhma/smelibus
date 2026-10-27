# Usunąć zwykłe bonusy, zostają żule

obszar: smrod
kto: Pawel
zależy od: -
ścieżki: sim/bonus.ts, shared/config.ts, render/bonusModels.ts, sim/bot.ts

## Cel

Z mapy znikają kebab, mokry pies, śledź, kibic i durian razem z wolnymi miejscami na mapie (`MAP_BONUS_SPOTS_PER_TILE`). Przystanek ma żula albo stoi pusty, a pusty przystanek co jakiś czas dostaje nowego żula. Żule, śmietniki, kontroler i wytrącony smród zostają.

Modele i makieta: https://claude.ai/artifact/LArzWy5FrS1zfLP5eJnALs (prywatny u Pawła, poproś o dostęp). Zasady: docs/GAME_DESIGN.md, Bonusy smrodu.

## Gotowe, gdy

- [ ] na mapie nie pojawia się żaden zwykły bonus, a żule dalej siedzą na przystankach i wychodzą z Żabek
- [ ] boty nadal mają co zbierać (sprawdzić grę z botem)
- [ ] statystyki ładunku (karta 039) i dźwięki nie zakładają, że zwykłe bonusy istnieją
