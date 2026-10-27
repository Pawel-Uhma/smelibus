# Kontroler chodzi chodnikiem

obszar: swiat
kto: -
zależy od: -
ścieżki: sim/bonus.ts, render/bonuses.ts, render/bonusModels.ts

## Cel

Kontroler nie unosi się i nie kręci w miejscu. Chodzi chodnikiem w tę i z powrotem (ok. 0,8 kafla/s), na końcu chodnika albo na skrzyżowaniu zawraca. Animacja kroku z 4 klatek: lewa noga, razem, prawa noga, razem. Lewa ręka macha, prawa trzyma czytnik. Nadal −20 smrodu i wraca po 15 s. Pozycję liczy klient z danych w bonusie (jak `walk` u żuli z Żabki), bez aktualizacji co tick.

Modele i makieta: https://claude.ai/artifact/LArzWy5FrS1zfLP5eJnALs (prywatny u Pawła, poproś o dostęp). Zasady: docs/GAME_DESIGN.md, Bonusy smrodu.

## Gotowe, gdy

- [ ] kontroler chodzi tylko po chodniku i jest zwrócony w kierunku ruchu
- [ ] wszyscy gracze widzą go w tym samym miejscu
