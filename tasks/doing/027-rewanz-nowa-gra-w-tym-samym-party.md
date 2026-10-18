# Rewanż: nowa gra w tym samym party

obszar: siec
kto: Pawel
zależy od: 016
ścieżki: ../../server/, net/, ui/lobby/, ui/hud.ts

## Cel

Po wygranej host dostaje na ekranie zwycięzcy przycisk **„Rewanż”**. Pokój zostaje ten sam (kod i link bez zmian): serwer generuje nową mapę z nowym seedem, resetuje zegar i sudden death, autobusy i bonusy, i **wraca do poczekalni**, żeby ktoś mógł dołączyć albo wyjść. Potem host klika Start jak zwykle. Pozostali gracze widzą na ekranie wygranej „Czekamy na hosta…”. Ustalone z Pawłem (grill 2026-10-18).

## Gotowe, gdy

- [ ] host widzi „Rewanż”, inni widzą „Czekamy na hosta…”
- [ ] po rewanżu wszyscy są w poczekalni tego samego pokoju, z nową mapą (`welcome` od nowa)
- [ ] zegar sudden death liczy od nowego Startu
- [ ] wpis w GAME_DESIGN (sekcja Gracze i party)
