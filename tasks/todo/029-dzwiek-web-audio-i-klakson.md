# Dźwięk: efekty z Web Audio i klakson

obszar: wspolne
kto: -
zależy od: -
ścieżki: audio/ (nowy), main.ts, input/keyboard.ts, shared/types.ts, ui/hud.ts

## Cel

Efekty dźwiękowe **generowane w kodzie przez Web Audio** (oscylatory i szum, bez plików i bez nowej zależności npm), jak voxele w kodzie. Bez muzyki w tle. Ustalone z Pawłem (grill 2026-10-18).

- klakson pod `H`, **przez sieć**: słyszą go gracze w pobliżu (głośność maleje z odległością)
- skok: rosnący akord przy przejęciu kafelków, wyższy przy większym N
- taran: głuche „bum”
- bonus: krótkie „blup”; kontroler biletów: smutne „bzzt”
- pod chmurą: szum deszczu albo brzęk puszek Harnasia

Dźwięki odpalane z różnic między snapshotami (render tylko czyta stan); klakson to nowe pole addytywne w `BusInput`/snapshocie.

## Gotowe, gdy

- [ ] wszystkie efekty z listy słychać w grze online
- [ ] klakson innego gracza słychać tylko w pobliżu
- [ ] przycisk wyciszenia w HUD, zapamiętany w `localStorage`
- [ ] AudioContext startuje po pierwszym kliknięciu (polityka autoplay)
