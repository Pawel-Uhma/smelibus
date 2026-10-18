# Open data: przystanki i ulice z OSM albo GTFS (po MVP)

obszar: swiat
kto: Pawel
zależy od: 002
ścieżki: sim/world.ts, data/

## Cel

**Po MVP** — MVP jest na płaskiej losowej mapie (DECISIONS 2026-10-18). Mapa z prawdziwego miasta. **Najpierw decyzja w `docs/DECISIONS.md`** (źródło, które miasto, czy w MVP).

## Gotowe, gdy

- [x] wpis w DECISIONS.md
- [x] generator mapy umie wczytać dane z `data/` (za flagą `CITY_OSM_ENABLED`, domyślnie wyłączoną)
- [x] podpis „© OpenStreetMap contributors” przy mapie z OSM
- [x] test: mapa z wycinka jest spójna i przejezdna
