# Pogoda: deszcz zmywa smród

obszar: swiat
kto: antpop
zależy od: 001, 008
ścieżki: sim/weather.ts, render/weather.ts

## Cel

Cykl pogody: okresowo pada deszcz. W deszczu smród autobusów wietrzeje szybciej, co wymusza ciągłe zbieranie bonusów. Logika w `sim/weather.ts` (czysta, bez Three.js), efekt wizualny w `render/weather.ts`. Liczby w `config.ts`.

## Gotowe, gdy

- [ ] `sim/weather.ts`: stan pogody (sucho/deszcz), losowy cykl z czasami z `config.ts`
- [ ] eksportowany mnożnik wietrzenia smrodu (np. `stinkDecayMultiplier(weather)`), podłączony w `sim/bonus.ts` (minimalna zmiana, uzgodnić z obszarem smrod)
- [ ] `render/weather.ts`: krople deszczu i przyciemnione światło
- [ ] testy Vitest: deszcz przyspiesza wietrzenie, cykl przełącza stany
- [ ] sekcja „Pogoda” w GAME_DESIGN.md zgodna z kodem
