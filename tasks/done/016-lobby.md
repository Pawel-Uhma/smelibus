# Lobby: tworzenie party, link z kodem, publiczna lista, dołączanie w trakcie

obszar: siec
kto: Pawel
zależy od: 018
ścieżki: ui/lobby/, server/

## Cel

Strona główna: „Stwórz party” (z przełącznikiem publiczne/prywatne), wpisanie kodu, lista publicznych party. Link `/p/ABCD`. Bez kont: nick i kolor. Host klika „Start”. Do trwającej gry można dołączyć, dopóki jest < 8 graczy (strefę startową daje `sim/zones.ts`).

## Gotowe, gdy

- [x] dwie przeglądarki: jedna tworzy party, druga dołącza przez link i przez kod
- [x] publiczne party widać na liście, prywatnego nie
- [x] dołączenie do trwającej gry działa
