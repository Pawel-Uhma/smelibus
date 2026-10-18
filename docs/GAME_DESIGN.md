# Game Design — Smelibus

Dokument jest źródłem prawdy dla mechanik. Liczby to punkt startowy — trzymamy je w
`src/shared/config.ts`, żeby balans dało się kręcić bez ruszania logiki.
Jeśli zmieniasz mechanikę, zaktualizuj ten plik w tym samym commicie.

## Pętla rozgrywki

1. Każdy gracz zaczyna jako pieszy w swojej strefie.
2. Podchodzi do pustego autobusu i wsiada. Kamera przechodzi w widok z góry.
3. Jeździ po mapie i zgarnia **bonusy smrodu** — autobus śmierdzi coraz bardziej.
4. Wjeżdża autobusem przez granicę do swojej strefy: cały smród autobusu zamienia się
   w przejęte pola (**skok**), a smród spada do 0.
5. Wraca po kolejne bonusy. Kto przejmie 100% mapy — wygrywa.

## Gracze i party

- Gra online w przeglądarce na komputerze, do **8 graczy** w party. Jeden gracz na komputer.
- Host tworzy party i dostaje link z kodem (`/p/ABCD`). Bez kont: nick i kolor.
  Party może być **publiczne** — wtedy widać je na liście na stronie głównej.
- **Dołączanie w trakcie gry** (do 8): nowy gracz dostaje strefę startową wyciętą z terenu lidera.
  Mapa nie rośnie.
- Rozłączenie: 60 s na powrót, potem strefa zostaje na mapie jako neutralna (do przejęcia).
- Gracz jest albo **pieszym**, albo **kierowcą**.
- Pieszy: chodzi wszędzie (WASD), `E` przy autobusie (zasięg ~2 kafelki) = wsiada, jeśli autobus jest pusty.
- Kierowca: steruje autobusem, `E` = wysiada obok autobusu.
- **Eliminacja:** gracz z 0 kafelków nie odpada. Dalej chodzi, jeździ, kradnie autobusy,
  taranuje i potrąca, ale nie może rosnąć (nie ma strefy, do której mógłby wjechać).

## Autobusy

- Stała pula: **liczba graczy + 2** autobusy. Nie znikają i nie pojawiają się nowe.
- Sterowanie zręcznościowe: gaz/hamulec/skręt, prosta fizyka (bez silnika fizycznego) — nie symulacja.
- Autobus jest neutralny: **pusty autobus może wziąć każdy**, także zaparkowany w cudzej strefie.
  Autobusu z kierowcą nie da się przejąć.
- Autobus jest wielokrotnego użytku: po skoku zostaje tam, gdzie kierowca wysiadł.
  Kradzież zabiera pojazd, nie teren.
- Każdy autobus ma **poziom smrodu** `stink` (0–100).
- Smród powoli wietrzeje (np. −0.5/s), więc trzeba ciągle zbierać bonusy.
- **Taranowanie:** uderzenie autobusem w inny autobus wytrąca mu część smrodu. Wytrącony smród
  wypada na ziemię jako bonus do zebrania.
- **Potrącenie pieszego:** pieszy jest ogłuszony na ~3 s (nie chodzi, nie wsiada).

## Bonusy smrodu

Leżą na przystankach i na mapie, zbiera się je przejeżdżając autobusem. Po zebraniu
miejsce odnawia się po czasie (np. 15 s).

| Bonus | Smród | Uwagi |
|---|---|---|
| Żul z przystanku | +25 | tylko na przystankach, „siedzi" — wolniej wietrzeje |
| Kebab z cebulą | +10 | częsty |
| Mokry pies | +15 | |
| Kibic po meczu | +20 | |
| Śledź w occie | +12 | |
| Durian | +40 | rzadki |
| Śmietnik | +8 | wjechanie przewraca śmietnik, wraca po czasie |
| Kontroler biletów | −20 | bonus negatywny, trzeba go omijać |
| Wytrącony smród | ile wypadło | zostaje po taranowaniu |

Pomysły na później: **Choinka zapachowa**, pasażerowie wysiadający gdy smród > 90 (chaos),
widoczna zielona chmura wokół autobusu skalowana smrodem.

## Pogoda

- Pogoda zmienia się cyklicznie: **sucho** albo **deszcz** (czasy trwania losowe, z `config.ts`).
- W deszczu smród autobusów wietrzeje szybciej (mnożnik wietrzenia, np. ×3), więc strefy rosną wolniej
  i trzeba agresywniej zbierać bonusy.
- Deszcz jest globalny (cała mapa). Wariant na później: lokalne chmury deszczowe przesuwające się po mapie.

## Strefy i mapa

- **MVP: płaska mapa bez budynków i ulic.** Autobusy i piesi poruszają się wszędzie. Na mapie
  stoją elementy: przystanki z bonusami, śmietniki, kontrolerzy.
- Mapa to siatka kafelków generowana losowo przy starcie party. Rozmiar zależy od liczby
  graczy: ok. **400 kafelków na gracza** (np. ~56×56 przy 8). Każdy kafelek ma właściciela (`ownerId`).
- Start: mapa dzielona na tyle stref, ilu jest graczy (np. Voronoi od punktów startowych).
- **Skok:** gdy autobus z kierowcą przekroczy granicę strefy kierowcy (wjedzie do niej z cudzego
  albo neutralnego terenu), gracz przejmuje **N = stink** kafelków (× mnożnik sudden death).
  Kafelki są brane od punktu przekroczenia granicy na zewnątrz, najbliższe pierwsze, niezależnie
  od tego, czyje są. Smród autobusu spada do 0.
- O tym, komu zabierasz teren, decydujesz tym, z której strony wjeżdżasz.
- Przejęte kafelki zmieniają kolor (render podświetla granicę).

## Warunek zwycięstwa

- Gracz posiada 100% kafelków → wygrywa. Nie ma wygranej na punkty.
- **Sudden death:** po 8 min bonusy dają ×2 smrodu, po 10 min ×3, żeby gra się rozstrzygnęła.

## Grafika

- Proste modele 3D w stylu voxel, **generowane w kodzie** z prostopadłościanów (bez plików
  `.vox`). Wszystkie kolory z jednej palety, kolory graczy to jej podmiana.
- Modele z MagicaVoxel dla autobusu i ludzika — dopiero gdy pętla gry działa.
- Kamera: pieszy z góry pod kątem, kierowca — widok z góry.
- Voxele renderowane przez `InstancedMesh` / merge geometrii — nie jeden `Mesh` na voxel.
- Tryb wysokiego kontrastu: **nie w MVP** (był prośbą ze spotkania 1, odłożony).

### Model autobusu: niskopodłogowiec

Wybrany z 4 propozycji (przegubowiec, ogórek, niskopodłogowiec, minibus). Kanciasta bryła
daje się złożyć z kilku prostopadłościanów, a dach w kolorze gracza widać z kamery od góry.

- Wymiar 18 (długość, przód w +x) × 5 (szerokość) × 8 (wysokość) voxeli.
- Warstwy od dołu: `z0` koła 3×3 z piastą w środku (osie na x 1–3 i 12–14), `z1` ciemniejszy
  kolor gracza, `z2` kolor gracza, `z3–5` szyby ze słupkami w kolorze gracza co 4 voxele,
  `z6` dach w kolorze gracza, `z7` klimatyzator 6×3 na środku dachu.
- Przód: szyba na całą szerokość (`z3–5`), reflektory po bokach w `z2`, bursztynowy wyświetlacz
  linii w `z6`. Tył: światła stop w `z2`, mała szyba w `z5`.
- 3 pary drzwi po prawej stronie, od ziemi do `z5`.
- Paleta: kolor gracza i jego wersja ciemniejsza o 30%, szyby boczne `#3B5566`, szyba przednia
  `#628598`, drzwi `#22303A`, opony `#202024`, piasty `#B8BEC4`, wyświetlacz `#FFB000`,
  reflektory `#FFE7A0`, stop `#D8432F`, klimatyzator `#C3C7CB`.

### Kolory graczy

8 kolorów, przydzielanych w tej kolejności (w grze na 4 osoby są tylko pierwsze cztery, najbardziej
od siebie różne). Dobrane tak, żeby różniły się też jasnością, a nie tylko odcieniem, i nie myliły
się z zielenią smrodu ani przy najczęstszych typach daltonizmu.

| # | Kolor | Hex |
|---|---|---|
| 1 | niebieski | `#2F6BD6` |
| 2 | pomarańczowy | `#EE7F1E` |
| 3 | magenta | `#C8357A` |
| 4 | żółty | `#E5BC1F` |
| 5 | turkusowy | `#1FA9C9` |
| 6 | karminowy | `#A3203A` |
| 7 | granatowy | `#1E2F7A` |
| 8 | grafitowy | `#3C3F4A` |

Zarezerwowane, nie dla graczy: zieleń smrodu `#8CC846`, plamy `#6F7A2E`, wyświetlacz `#FFB000`,
szarości niczyich autobusów i kafelków (`#BBBBBB`, `#D9D4C7`). Wartości w `shared/config.ts` (`PLAYER_COLORS`).

### Smród na autobusie

Smród rysujemy tymi samymi voxelami co autobus, bez systemu cząsteczek. Trzy stopnie wg `stink`
(progi to liczby balansu → `config.ts`):

| `stink` | Nazwa | Wygląd |
|---|---|---|
| 0–30 | Świeżak | czysty lakier |
| 31–70 | Zalatuje | ok. 1/7 voxeli karoserii to oliwkowe plamy `#6F7A2E`; pojedyncze zielone obłoczki nad dachem i z rury wydechowej |
| 71–100 | Durian | plamy na ok. 1/3 karoserii, ok. 1/4 szyb pękniętych (`#C9D6DC`), półprzezroczysta chmura zielonych voxeli (`#8CC846`, krycie ok. 0.4) do 2 voxeli wokół autobusu |

- Plamy i pęknięcia wybiera hash pozycji voxela, więc są stałe i nie migają przy zmianie `stink`.
- Plamy i szyby to podmiana kolorów w modelu autobusu (`render/models/`), chmura to osobny
  efekt (`render/stink.ts`).

## Po MVP

- Siatka ulic i budynki, autobus jeździ tylko po ulicach.
- **Open data:** układ ulic z OpenStreetMap, przystanki z GTFS (np. Warszawa). Hackathon jest
  o otwartych danych, więc to pierwszy kandydat po MVP.
- Tryb wysokiego kontrastu (wzory stref i symbole graczy, nie tylko kolory).
- Telefony (dotykowy joystick).

## Otwarte pytania

- Wartości balansu: ile smrodu wytrąca taranowanie, czasy odnowienia bonusów, 400 kafelków na gracza.
- Czy wietrzenie smrodu zostaje przy modelu skoku (decyzja po pierwszym grywalnym prototypie).
