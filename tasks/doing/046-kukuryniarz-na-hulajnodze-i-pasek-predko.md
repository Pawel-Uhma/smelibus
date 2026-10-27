# Kukuryniarz na hulajnodze i pasek prędkości

obszar: smrod
kto: Pawel
zależy od: -
ścieżki: sim/, render/, ui/, shared/

## Cel

Kukuryniarz to ktoś na elektrycznej hulajnodze. Wyjeżdża z bloków i jeździ ulicami (ok. 2,5 kafla/s). Autobus, który go zgarnie, dostaje lekki bonus do prędkości: +4% za każdego. Bonusy się sumują (limit +50%), a cały bonus powoli zanika, 0,25 punktu procentowego na sekundę. Smrodu nie daje. Na mapie jeździ ich naraz ok. 1 na 4000 kafelków, a nowy pojawia się co 20 s, jeśli jest ich mniej. Wszystkie liczby w `shared/config.ts`.

W HUD pod paskiem smrodu jest nowy pasek prędkości z aktualnym bonusem (kukuryniarze plus energetyk z karty 043).

Modele i makieta: https://claude.ai/artifact/LArzWy5FrS1zfLP5eJnALs (prywatny u Pawła, poproś o dostęp). Zasady: docs/GAME_DESIGN.md, Bonusy smrodu.

## Gotowe, gdy

- [ ] kukuryniarze wyjeżdżają z bloków, jeżdżą po ulicach i nie wjeżdżają w budynki
- [ ] zgarnięcie podnosi prędkość autobusu, a bonus widać na pasku i powoli spada
- [ ] boty też je zbierają
