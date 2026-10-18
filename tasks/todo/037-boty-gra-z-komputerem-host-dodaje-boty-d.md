# Boty: gra z komputerem, host dodaje boty do party

obszar: siec
kto: -
zależy od: -
ścieżki: `sim/bot.ts`, `../../server/src/PartyRoom.ts`, `net/client.ts`, `ui/lobby/`

## Cel

Gra z komputerem: do każdego party host może dołączyć boty, które grają jak gracz. Jeżdżą po
mieście, zbierają smród, omijają kontrolera, wracają do swojej strefy, żeby ją powiększyć, a z
pustym autobusem taranują śmierdzących rywali.

## Gotowe, gdy

- [ ] w poczekalni host ma przyciski „+ Bot” i „×” przy bocie
- [ ] bot zajmuje miejsce w party (MAX_PLAYERS liczy ludzi i boty)
- [ ] bot jeździ po mieście bez zakleszczania się na budynkach (BFS po kafelkach + wycofanie)
- [ ] bot zbiera bonusy i wjeżdża do swojej strefy, gdy ma dość smrodu
- [ ] host nigdy nie przechodzi na bota; boty przeżywają rewanż
- [ ] testy Vitest dla `sim/bot.ts`
