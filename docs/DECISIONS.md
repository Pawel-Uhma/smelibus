# Log decyzji

Krótkie wpisy: co ustaliliśmy i dlaczego. Agent przed zaproponowaniem zmiany architektury sprawdza, czy nie zostało to już tu ustalone.

**Nowe wpisy dopisujesz na końcu pliku.** Plik ma w `.gitattributes` scalanie `union`, więc dwa równoległe dopiski nie dają konfliktu. Cudzych wpisów nie zmieniasz: zmianę decyzji zapisujesz nowym wpisem.

## Do ustalenia

- Wartości balansu (taranowanie, odnawianie bonusów, kafelki na gracza) — po pierwszym prototypie.

## Wpisy

### 2026-10-18 — Stack: TypeScript + Vite + Three.js
Działa w przeglądarce bez instalacji, szybki dev server, agenci AI dobrze znają te narzędzia.

### 2026-10-18 — Logika gry oddzielona od renderu
`src/sim` nie importuje Three.js ani DOM. Pozwala testować logikę w Vitest, pracować równolegle nad renderem i logiką, a w przyszłości uruchomić symulację na serwerze (multiplayer online).

### 2026-10-18 — Workflow: trunk-based, wszyscy na `main`
Mały zespół (4 osoby + agenci), krótki projekt. Brak PR-ów; zamiast tego częsty `pull --rebase`, małe commity, claim zadań i podział kodu na obszary. Szczegóły w AGENTS.md.

### 2026-10-18 — Kanban w `tasks/` zamiast `TASKS.md`
Jedna karta = jeden plik (`todo/` → `doing/` → `done/`), obsługiwany przez `scripts/kanban.sh`. Jedna wspólna tabela przy 4 agentach claimujących naraz dawała konflikty (na hackathonie `todo.md` miał 198 commitów); osobne pliki się nie gryzą, a podwójny claim odrzuca git przy pushu. Zadania T-01…T-14 przeniesione jako karty 001…014.

### 2026-10-18 — Multiplayer online, party do 8
Zamiast lokalnego MVP: gra online, jeden gracz na komputer, party do 8 przez link z kodem, bez kont, z opcjonalną publiczną listą i dołączaniem w trakcie gry. Tak gra się ze znajomymi przez Discord, a lokalnie 8 osób przy jednej klawiaturze się nie zmieści. Gamepady i 2 graczy na klawiaturze wypadają.

### 2026-10-18 — Serwer gry: Colyseus na Railway, klient na Vercelu
Vercel nie trzyma stałych WebSocketów. Autorytatywny serwer jest potrzebny do taranowania, kradzieży i przejmowania kafelków bez rozjazdów stanu. Colyseus daje pokoje (party), lobby z listą i dołączanie w trakcie. Kod serwera w `server/`, `sim/` uruchamiany na serwerze (dlatego bez Three.js i DOM).

### 2026-10-18 — Rozrost stref: skok przy wjeździe zamiast presji
Wjazd autobusem do własnej strefy zamienia cały smród na N kafelków od punktu wjazdu, smród spada do 0. Daje taktykę (z której strony wjeżdżasz = komu zabierasz) i czytelną pętlę zbierz → dowieź → wydaj. Zastępuje presję globalną i wariant „chmury smrodu”.

### 2026-10-18 — MVP na płaskiej losowej mapie, bez open data
Bez budynków i ulic, ruch wszędzie, ok. 400 kafelków na gracza. Najszybsza droga do grywalnej pętli. Ulice, budynki i open data (OSM/GTFS) to pierwszy krok po MVP — karta 014 zostaje z dopiskiem „po MVP”.

### 2026-10-18 — Modele voxel generowane w kodzie, bez trybu wysokiego kontrastu w MVP
Prostopadłościany w Three.js z jednej palety: grywalne od pierwszego dnia, bez czekania na grafikę. Tryb wysokiego kontrastu odłożony na po MVP (decyzja Pawła).


### 2026-10-18 — Autobus: niskopodłogowiec, smród jako voxele
Z 4 propozycji (przegubowiec, ogórek, niskopodłogowiec, minibus) wybrany niskopodłogowiec: najprostsza bryła do złożenia w kodzie, a dach w kolorze gracza czytelny z kamery od góry. Smród pokazujemy w 3 stopniach tymi samymi voxelami (plamy na karoserii, pęknięte szyby, półprzezroczysta chmura), bez systemu cząsteczek. Specyfikacja w GAME_DESIGN, sekcja Grafika.

### 2026-10-18 — 8 kolorów graczy
Party do 8 osób, więc 8 kolorów: niebieski, pomarańczowy, magenta, żółty, potem turkusowy, karminowy, granatowy, grafitowy. Sprawdzone dla deuteranopii, protanopii i tritanopii także względem zieleni smrodu, plam i szarości niczyich autobusów. Zastępuje wcześniejszą paletę ze scaffoldu: jej zielony mylił się ze smrodem, a brązowy z plamami. Paleta w GAME_DESIGN, sekcja Grafika.
### 2026-10-18 — Stan z serwera jako zwykły JSON, nie Colyseus Schema
Pokój rozsyła co 50 ms snapshot (`Snapshot` z `shared/types.ts`), mapa idzie raz w `welcome`. Dzięki temu `sim/` operuje na zwykłych obiektach i te same typy są w kliencie, serwerze i testach. Przy 8 autobusach to kilka KB/s. Klient przewiduje własny autobus lokalnie (`sim/bus.ts`) i dociąga go do stanu z serwera, cudze interpoluje 100 ms wstecz. Serwer importuje `app/src/sim` i `app/src/shared` przez `tsx`, deploy na Railway z `server/Dockerfile` (kontekst = root repo).

### 2026-10-18 — Taranowanie: `collideBuses` zwraca wytrącony smród [007]
Autobus, który wjeżdża w inny, odbija się do tyłu (`speed *= -BUS_BOUNCE`). Jeśli uderzył z prędkością co najmniej `RAM_MIN_SPEED`, uderzony traci `RAM_STINK_LOSS` (30%) smrodu. `collideBuses` zwraca go jako `StinkDrop[]` (`{x, z, amount}` w punkcie zderzenia), zamiast samemu kłaść bonus na ziemi: bonusy to `sim/bonus.ts` (karta 008), a `sim/bus.ts` nie musi znać ich typów. Zderzenie czołowe wytrąca smród obu autobusom. `stepGame` na razie ignoruje wynik; karta 008 zamienia `StinkDrop` w bonus „wytrącony smród”.
### 2026-10-18 — Strefy: szczegóły skoku, wygranej i dołączania
Mnożnik sudden death (×2 od 8 min, ×3 od 10 min) mnoży liczbę kafelków przy skoku, a nie smród z bonusów, żeby nie liczyć go dwa razy. Remisy odległości przy skoku rozstrzyga indeks kafelka, więc wynik jest deterministyczny. Wygrana przy 100% kafelków liczy się dopiero przy co najmniej 2 graczach (solo to piaskownica, pierwszy gracz dostaje całą mapę). Nowy gracz w trakcie gry dostaje `kafelki / liczba graczy`, najwyżej połowę terenu lidera, wyciętą od krawędzi strefy lidera. Kod w `sim/zones.ts`, liczby w `shared/config.ts`.
### 2026-10-18 — Bonusy smrodu: jak działają w sim
Bonusy żyją w `GameState.bonuses` (`sim/bonus.ts`), punkty spawnu losowane z seeda mapy: przystanki (żul albo zwykły bonus), wolne miejsca, śmietniki, kontrolerzy. Zbiera tylko autobus z kierowcą. Po zebraniu miejsce wraca po czasie z nowym losowym bonusem. Żul „siedzi”: przez 20 s smród wietrzeje o połowę wolniej. `stepGame` zamienia `StinkDrop` z `collideBuses` (karta 007) w jednorazowy bonus „wytrącony smród”: przez 1 s nie da się go podnieść (inaczej oba autobusy w punkcie zderzenia od razu by go wchłonęły), znika po 20 s. Liczby w `config.ts`. Snapshot jeszcze nie wysyła bonusów do klienta (sieć, karta 017).
### 2026-10-18 — Zmiany kafelków w snapshocie jako różnice
Mapa idzie raz w `welcome`, a każdy snapshot ma opcjonalne `tileChanges` (`[indeks, właściciel]` dla kafelków zmienionych od poprzedniego snapshotu). Serwer liczy różnice porównaniem z kopią właścicieli (`net/tiles.ts`), więc `sim/` nie musi emitować zdarzeń. Pełna mapa co 50 ms to kilkadziesiąt KB, różnice to zwykle kilka kafelków. WebSocket gwarantuje kolejność, a po reconnect klient dostaje świeże `welcome`.

### 2026-10-18 — Kolory graczy 5 i 7: liliowy i śliwkowy
Turkusowy i granatowy wyglądały w grze jak odcienie niebieskiego (gracz 1). Zastąpione liliowym `#C9A0DC` (jasny) i śliwkowym `#5B2A6E` (ciemny), więc trzy kolory różnią się i barwą, i jasnością. Reszta palety bez zmian.
