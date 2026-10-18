# Wersja mobilna i joystick dotykowy

obszar: autobus
kto: -
zależy od: -
ścieżki: input/touch.ts (nowy), input/keyboard.ts, main.ts, ui/hud.ts, ui/lobby/, index.html

## Cel

Gra ma działać na telefonie. Na urządzeniu dotykowym (`matchMedia('(pointer: coarse)')` albo pierwszy `touchstart`) pokazujemy **wirtualny joystick** zamiast sterowania klawiaturą.

- joystick w lewym dolnym rogu: wychylenie w osi Y → `throttle`, w osi X → `steer` (wartości ciągłe -1..1, ta sama `BusInput` co klawiatura, bez zmian w `shared/`)
- przycisk „E” (wsiadanie/wysiadanie) po prawej, inkrementuje licznik `use` jak klawisz E
- `input/touch.ts` z tym samym interfejsem co `createKeyboard` (`read(): BusInput`); w `main.ts` łączymy oba źródła (klawiatura + dotyk)
- obsługa przez Pointer Events, wielodotyk (joystick i przycisk naraz), `touch-action: none` na canvasie, bez przewijania i zoomu strony
- layout mobilny: HUD, lobby i landing czytelne w pionie i w poziomie, przyciski ≥ 44 px, pole kodu dołączania wygodne z klawiatury ekranowej
- bez nowej zależności npm (joystick rysowany w DOM/CSS)

## Gotowe, gdy

- [ ] na telefonie da się przejść cały flow: landing → lobby → gra
- [ ] joystick steruje autobusem płynnie, przycisk E działa, oba naraz
- [ ] na desktopie joysticka nie widać, klawiatura działa jak dotąd
- [ ] strona nie scrolluje się ani nie zoomuje podczas gry
- [ ] HUD i lobby mieszczą się na ekranie ~375 px szerokości
