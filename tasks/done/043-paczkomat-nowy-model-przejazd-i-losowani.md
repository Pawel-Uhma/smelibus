# Paczkomat: nowy model, przejazd i losowanie power-upów

obszar: swiat
kto: Pawel
zależy od: -
ścieżki: render/paczkomat.ts, sim/paczkomat.ts, ui/, shared/

## Cel

Paczkomat jest większy (ok. 2,2 × 0,55 kafla, 1,65 wysokości), biały z siatką skrytek, ekranem i logo, i stoi tyłem przy ścianie bloku. Nie ma już kolizji: autobus przez niego przejeżdża i wtedy się losuje. Kierowca widzi na dole ekranu taśmę jak w skrzynce z gry (ok. 2 s), a wynik trafia od razu do jego autobusu. Na ziemię nic nie wypada. Wynik losuje sim (serwer), taśma tylko go pokazuje. Jeden paczkomat losuje raz na `PACZKOMAT_COOLDOWN_S`.

Pula: kupa +30 smrodu (40%), energetyk (20%), bilet miesięczny (20%), kiszona kapusta (20%). Paczek już nie ma.

- **Energetyk:** +35% prędkości przez 6 s.
- **Bilet miesięczny:** przez 25 s kontroler nic nie zabiera, a taranowanie nie wybija smrodu.
- **Kiszona kapusta:** przez 10 s każdy zebrany smród liczy się ×2.

Jeden power-up naraz, nowy zastępuje stary. Ikona z paskiem czasu w HUD.

Modele i makieta: https://claude.ai/artifact/LArzWy5FrS1zfLP5eJnALs (prywatny u Pawła, poproś o dostęp). Zasady: docs/GAME_DESIGN.md, Bonusy smrodu.

## Gotowe, gdy

- [ ] nowy model stoi przy budynkach i nie zasłania ulicy
- [ ] przejazd przez paczkomat uruchamia losowanie, a taśma pokazuje ten sam wynik, który dał serwer
- [ ] trzy power-upy działają i widać je w HUD
- [ ] boty nie omijają już paczkomatów jako przeszkód
