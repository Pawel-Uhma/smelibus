# Poprawki landing page i pola kodu dołączania

obszar: siec
kto: Pawel
zależy od: -
ścieżki: `ui/lobby/lobby.ts`, `ui/lobby/lobby.css`, `app/index.html`

pytanie: @Paweł Szczepan prosi, żebyś to wziął.

## Cel

Landing page (lobby) wygląda słabo, trzeba go dopracować graficznie. Pola tekstowe do wpisywania
kodu dołączania do pokoju nie zawsze działają: czasem nie da się wpisać kodu albo dołączyć.

## Gotowe, gdy

- [x] Landing page jest dopracowany graficznie (spójny ze stylem gry). Antek: karta menu + 3D tło z voxelowymi autobusami (`render/menuScene.ts`), commit afab8c7. Zostaje pole kodu.
- [ ] Wpisywanie kodu dołączania działa za każdym razem (sprawdzić focus, przechwytywanie klawiszy przez sterowanie gry, wklejanie, wielkość liter, spacje)
- [ ] Dołączenie po wpisaniu kodu działa na desktopie i telefonie
