# Tryb nocny: reflektory autobusów i poświata świateł tylnych

obszar: swiat
kto: Jasiek
zależy od: -
ścieżki: render/night.ts, main.ts, shared/config.ts

## Cel

Cykl dnia i nocy z czasu gry: w nocy ciemne niebo i księżyc, autobusy oświetlają drogę reflektorami, z tyłu delikatna czerwona poświata świateł tylnych, Żabki świecą na zielono. Tylko wygląd, symulacja bez zmian.

## Gotowe, gdy

- [x] dzień i noc zmieniają się w kółko (wspólny `snap.time`), płynny zmierzch i świt
- [x] `?noc` albo klawisz N wymusza noc, `?noc=0` sam dzień
- [x] reflektory (SpotLight) oświetlają ziemię, strefy i budynki przed autobusem
- [x] czerwona poświata na ziemi za autobusem i świecące lampy
- [x] poświata i światło przy Żabkach
- [ ] obejrzeć w przeglądarce i dostroić `NIGHT_*` w config.ts (agent nie miał przeglądarki)
