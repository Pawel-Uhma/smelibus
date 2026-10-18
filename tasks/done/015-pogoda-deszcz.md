# Pogoda: deszcz zmywa smród

obszar: swiat
kto: antpop
zależy od: 001, 008
ścieżki: sim/weather.ts, render/weather.ts

## Cel

Lokalne chmury dryfujące po części mapy. Deszcz zmywa smród z autobusów pod chmurą, Harnaś (puszki z nieba) go dodaje. Logika w `sim/weather.ts` (czysta, bez Three.js), efekt wizualny w `render/weather.ts`. Liczby w `config.ts`.

## Gotowe, gdy

- [x] `sim/weather.ts`: losowe chmury (deszcz / Harnaś) dryfujące nad częścią mapy, deterministyczne RNG
- [x] efekt na smród liczony w `updateWeather` (wpięte w `stepGame`), bez ruszania `sim/bonus.ts`
- [x] `GameState.weather` i `Snapshot.weather` (addytywnie), serwer wysyła je w snapshocie
- [x] `render/weather.ts`: chmura z voxeli, krople / puszki Harnasia, zabarwiona ziemia, fade in/out
- [x] testy Vitest (sim + render)
- [x] sekcja „Pogoda” w GAME_DESIGN.md zgodna z kodem
