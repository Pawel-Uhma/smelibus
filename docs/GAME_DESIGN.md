# Game Design — Smelibus

Dokument jest źródłem prawdy dla mechanik. Liczby to punkt startowy — trzymamy je w
`src/shared/config.ts`, żeby balans dało się kręcić bez ruszania logiki.
Jeśli zmieniasz mechanikę, zaktualizuj ten plik w tym samym commicie.

## Pętla rozgrywki

1. Każdy gracz zaczyna jako pieszy w swojej **zajezdni**, w swojej strefie.
2. Podchodzi do wolnego autobusu i wsiada.
3. Jeździ po mieście i zgarnia **bonusy smrodu** — autobus śmierdzi coraz bardziej.
4. Śmierdzące autobusy gracza generują **presję**, która przesuwa granicę jego strefy.
5. Strefa rośnie kosztem sąsiadów. Kto przejmie 100% mapy — wygrywa.

## Gracze

- 2–4 graczy, każdy ma kolor i strefę.
- Gracz jest albo **pieszym**, albo **kierowcą** autobusu.
- Pieszy: chodzi (WASD), `E` przy autobusie (zasięg ~2 kafelki) = wsiada, jeśli autobus jest wolny.
- Kierowca: steruje autobusem, `E` = wysiada obok autobusu.
- Gracz, którego strefa spadnie do 0 kafelków, odpada.

## Autobusy

- Na mapie jest kilka autobusów (np. 2 na gracza), startują w zajezdniach.
- Sterowanie zręcznościowe: gaz/hamulec/skręt, prosta fizyka (bez silnika fizycznego) — nie symulacja.
- Autobus **należy do gracza, który ostatnio nim kierował**. Wsiadając do pustego autobusu
  przeciwnika, przejmujesz go razem z całym jego smrodem.
- Każdy autobus ma **poziom smrodu** `stink` (0–100).
- Smród powoli wietrzeje (np. −0.5/s), więc trzeba ciągle zbierać bonusy.

## Bonusy smrodu

Pojawiają się na przystankach i ulicach, zbiera się je przejeżdżając autobusem.

| Bonus | Smród | Uwagi |
|---|---|---|
| Żul z przystanku | +25 | tylko na przystankach, „siedzi" — wolniej wietrzeje |
| Kebab z cebulą | +10 | częsty |
| Mokry pies | +15 | |
| Kibic po meczu | +20 | |
| Śledź w occie | +12 | |
| Durian | +40 | rzadki |

Pomysły na później: **Choinka zapachowa** (pułapka — obniża smród), pasażerowie wysiadający
gdy smród > 90 (chaos), widoczna zielona chmura wokół autobusu skalowana smrodem.

## Strefy i mapa

- Mapa to siatka kafelków (np. 64×64). Każdy kafelek ma właściciela (`ownerId`).
- Start: mapa dzielona na N stref (Voronoi od zajezdni, lub połówki/ćwiartki).
- Co tick strefowy (np. 1 s) każdy gracz dostaje **presję** = suma `stink` jego autobusów.
- Presja się akumuluje; za każde `PRESSURE_PER_TILE` punktów gracz przejmuje jeden kafelek
  sąsiadujący z jego strefą — preferowany kafelek najbliżej jego najbardziej śmierdzącego autobusu.
- Przejęte kafelki zmieniają kolor (render podświetla granicę).

**Do przetestowania (wariant):** zamiast presji globalnej — „chmura smrodu" o promieniu zależnym
od `stink`; kafelki w chmurze przechodzą na właściciela autobusu. Daje więcej taktyki
(wjeżdżasz śmierdzielem na teren wroga). Decyzja po pierwszym grywalnym prototypie.

## Warunek zwycięstwa

- Gracz posiada 100% kafelków → wygrywa.
- (Opcjonalnie) limit czasu np. 10 min → wygrywa największa strefa.

## Grafika

- Wszystko z voxeli: autobusy, ludziki, budynki, przystanki. Low-poly, czytelne kolory graczy.
- Kamera z góry pod kątem (izometryczna/3rd person nad autobusem).
- Voxele renderowane przez `InstancedMesh` / merge geometrii — nie jeden `Mesh` na voxel.

## Otwarte pytania

- **Multiplayer:** lokalny (jedna klawiatura + gamepady, split-screen lub wspólna kamera) czy online
  (WebSocket)? Domyślnie MVP = lokalny, ale `sim/` piszemy tak, by dało się go uruchomić na serwerze.
- **Open data:** hackathon jest o otwartych danych — np. układ ulic z OpenStreetMap, przystanki
  z GTFS lokalnego przewoźnika. Do ustalenia, czy MVP używa prawdziwego miasta, czy generowanej mapy.
