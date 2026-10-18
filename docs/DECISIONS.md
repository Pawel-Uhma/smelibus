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
### 2026-10-18 — Lobby: prywatność przez `setPrivate`, lista z wbudowanego `LobbyRoom` [016]
Party prywatne to pokój Colyseus z `setPrivate(true)`: nie ma go na liście, ale `joinById` po kodzie działa. Publiczną listę strumieniuje wbudowany `LobbyRoom` (pokój `lobby`, `party` ma `enableRealtimeListing()`), więc nie trzeba endpointu HTTP ani CORS. Metadane pokoju (`PartyMetadata`: publiczne, wystartowane, nick hosta) idą na listę. Stan poczekalni (`LobbyInfo`: host, start) serwer wysyła wiadomością `lobby`, a nie w snapshocie, żeby nie ruszać formatu snapshotu. Do Startu symulacja stoi (zegar i sudden death nie lecą). Start robi `assignStartZones` dla wszystkich obecnych i stawia ich autobusy w `startPoint`. Dołączanie w trakcie: dopóki jest < 8 graczy (`maxClients`), przez `assignJoinZone`. Hostem jest pierwszy gracz; po jego wyjściu następny.

### 2026-10-18 — Fizyka autobusu: kapsuła, wymiana pędu, predykcja z historią [021]
Zderzenia liczymy kapsułą (odcinek wzdłuż autobusu, promień `BUS_CAPSULE_RADIUS`), a nie kołem o promieniu 1,1: autobusy obok siebie nie odbijają się przed dotknięciem, a czołowo nie wchodzą w siebie. Uderzenie wymienia prędkość jak dwie równe masy ze sprężystością `BUS_BOUNCE`, rzutowaną na kierunek jazdy każdego autobusu: najechanie z tyłu popycha autobus z przodu, czołówka odbija oba, otarcie prawie nie hamuje. Zastępuje „taranujący zawsze odbija się do tyłu” z wpisu [007]; zasady wytrącania smrodu bez zmian. Dryf przy skręcie brał się z klienta: własny autobus był ciągnięty do pozycji z serwera opóźnionej o ping. Teraz `sim/prediction.ts` porównuje serwer z własną historią z tamtej chwili.
### 2026-10-18 — Sztywne zderzenia autobusów: prostokąt + lokalna kolizja w predykcji [021]
Kapsułę zastępuje prostokąt `BUS_LENGTH × BUS_HIT_WIDTH` (szerokość modelu voxel, 5/18 długości), wykrywany przez SAT (osie obu autobusów), w 4 przebiegach na krok. Rogi już się nie nakładają. Autobus nie jeździ bokiem, więc impuls liczymy z uwzględnieniem kierunku jazdy (`(1+BUS_BOUNCE)·v / (fa²+fb²)`): przy uderzeniu w bok taranujący odbija się z `BUS_BOUNCE`, a uderzony prawie się nie przesuwa. Najechanie z tyłu nadal popycha autobus z przodu. Główny powód przenikania leżał w kliencie: przewidywany własny autobus w ogóle się nie zderzał i dopiero korekta z serwera (z opóźnieniem) go wyciągała. Teraz `predictor.step` zderza go z innymi autobusami tam, gdzie są rysowane (`collideWithOthers`, inne autobusy się nie ruszają), także po korekcie z serwera.

### 2026-10-18 — Generator miasta za flagą `CITY_ENABLED` [002]
`generateWorld(seed, players, city)` umie zrobić miasto: ulica dookoła mapy, podział BSP wnętrza na kwartały ulicami szerokości `CITY_ROAD_WIDTH` (3, autobus ma 3 długości), w kwartałach działki z budynkami albo cały park. Każde cięcie to ulica przez cały prostokąt-rodzica, więc sieć ulic jest zawsze spójna; puste działki tylko na brzegu kwartału, żeby nie było zamkniętych podwórek (test sprawdza flood fill na 40 seedach). `Tile` ma opcjonalne `kind` i `height`, `World` opcjonalne `stops` — płaska mapa ich nie ma, więc nic się nie zmienia, dopóki flaga jest wyłączona. Strefy liczą wszystkie kafelki, także budynki, więc warunek 100% działa bez zmian. Flaga zostaje `false` do czasu kolizji z budynkami (karta 023). To odchodzi od „MVP na płaskiej mapie” tylko w kodzie, nie w grze: włączenie to osobna decyzja zespołu.
### 2026-10-18 — Zderzenia: boczny odrzut, taran z prędkości zbliżania [024]
Autobus ma opcjonalny boczny odrzut `pushX/pushZ` (kratki/s w osiach świata), który opony wygaszają z `BUS_SIDE_FRICTION`. Zderzenie prostokątów (karta 021) wymienia pęd w 2D jak dwie równe masy: zmiana prędkości wzdłuż autobusu idzie w `speed`, w bok w odrzut. T-bone odpycha uderzonego w bok (zamiast „uderzony stoi, taranujący odbija się”), otarcie rozsuwa oba autobusy bez hamowania, a wcześniej odrzucało do tyłu. Taran liczy się przy prędkości zbliżania ≥ `RAM_MIN_SPEED`, gdy autobus jechał w drugiego, więc pchanie autobusu przed sobą nie wytrąca smrodu co klatkę. `collideBuses(buses, mapSize)` trzyma autobusy w mapie przy rozpychaniu. Predykcja przechowuje odrzut w historii i łagodnie przejmuje odrzut, który widział tylko serwer.
### 2026-10-18 — Serwer na Railway wdraża się sam z `main`
Serwis `server` w Railway jest podpięty do repo `Pawel-Uhma/smelibus`, gałąź `main`. Każdy push, który zmienia `server/`, `app/src/sim/`, `app/src/shared/` albo `railway.json`, od razu buduje i wdraża serwer (bez testów i bez czekania na CI). Zmiany tylko w kliencie, docs albo kanbanie nie restartują serwera, więc nie rozłączają graczy. Wcześniej deploy był ręczny (`railway up`) i serwer potrafił chodzić na kodzie sprzed kilku commitów, np. bez bonusów. Teraz zepsuty commit w tych ścieżkach od razu psuje grę online, więc `npm run check` przed pushem jest ważniejszy niż wcześniej.
### 2026-10-18 — Predykcja własnego autobusu: potwierdzenia sterowania i ponowna symulacja [021]
Klient numeruje każdą zmianę sterowania (`BusInput.seq`). Serwer zapamiętuje ostatni numer gracza i liczy, przez ile ticków go już symulował; snapshot niesie to w `acks` (`InputAck {seq, ticks}`). Klient przy każdym nowym snapshocie bierze autobus z serwera i powtarza na nim tylko te lokalne ticki, których serwer jeszcze nie przeliczył (z lokalnymi zderzeniami), a skok między starą a nową predykcją chowa za przesunięciem, które gaśnie z `PREDICTION_CORRECT_RATE`. Zastępuje dopasowywanie po najbliższej pozycji z historii: po zderzeniu, w miejscu czy przy zawracaniu trafiało ono w złą chwilę, przez co autobus dryfował albo wracał do starej pozycji.

### 2026-10-18 — Pieszy: Służbista [004]
Z 4 ludzików i 4 wariantów kierowcy wybrany Służbista: mundur, złote guziki, wysoka czapka z denkiem w kolorze gracza (jedyna część w kolorze, bo tylko ją widać z kamery z góry). 8 voxeli wysokości przy voxelu autobusu (1/6 kafelka). Model w `render/models/pedestrian.ts`, w grze pojawi się z kartą 006 (pieszy w symulacji).

### 2026-10-18 — Pieszy: E przez licznik, chodzenie względem ekranu [006]
Klawisz E wysyłamy jako licznik naciśnięć (`BusInput.use`), a nie flagę, więc szybkie naciśnięcie nie zginie między dwiema wiadomościami. WASD pieszego działa względem ekranu (kamera nie obraca się), nie jak skręt autobusu. Wysiadanie przednimi drzwiami po prawej stronie; wysiadający zwalnia autobus (`driverId = null`, rysuje się na szaro), a wsiąść do pustego może każdy, także do cudzego, razem z jego smrodem. Pieszy jest kołem `PEDESTRIAN_RADIUS`, autobus prostokątem jak w zderzeniach; autobus jadący co najmniej `PEDESTRIAN_HIT_SPEED` ogłusza na `STUN_SECONDS`. Gracz nadal zaczyna w autobusie (start w zajezdni jako pieszy — osobno).
### 2026-10-18 — Autobusy odbijają się od budynków, miasto włączone [023]
`updateBus`, `collideBuses` i `collideWithOthers` dostają opcjonalny `World` i odpychają prostokąt autobusu od kafelków `building` (SAT z kwadratem 1×1, do 4 przebiegów), odbijając jak od krawędzi mapy (`BUS_BOUNCE`). Ściany wspólne z sąsiednim budynkiem są pomijane, więc ślizg wzdłuż ściany z wielu kafelków nie zaczepia o szwy. Predykcja klienta dostaje tę samą mapę (`createBusPredictor(bus, size, world)`), więc liczy to samo co serwer. Zaparkowane autobusy stawia `parkBus`: najbliższe miejsce, gdzie cały autobus mieści się między budynkami, w razie potrzeby obrócony wzdłuż ulicy (inaczej przy spawnie wchodziły w budynek i od razu były z niego wypychane). Używa go `spawnBus` i start gry w `PartyRoom`. `CITY_ENABLED = true`.
### 2026-10-18 — Piesi nie przechodzą przez budynki [031]
Koło pieszego (`PEDESTRIAN_RADIUS`) jest wypychane z kafelków `building` po każdym kroku `walk` (kroki krótsze niż promień, więc długie `dt` nie przeskoczy ściany) i po odepchnięciu przez autobus w `hitPedestrians`. Ściany wspólne z sąsiednim budynkiem są pomijane, więc pieszy ślizga się wzdłuż ściany. `leaveBus` wysiada prawymi drzwiami, a gdy tam stoi budynek: lewą stroną, tyłem, przodem, w ostateczności w najbliższym wolnym miejscu wokół autobusu. Tylko serwer (klient nie przewiduje pieszego).
### 2026-10-18 — Żabka 2 × 2 kafelki, trzy wersje żula [033]
Z propozycji grafiki zespół wybrał Żabkę z żabą na dachu (powiększoną) i żuli „na skrzynce”, „dres” i „na kartonie”. Sklep stoi na działce `ZABKA_TILES` × `ZABKA_TILES` (2 × 2), `world.zabkas` to środek działki. Rozstawianie wymaga wolnej całej działki, a drzwi patrzą na bok działki, który dotyka drogi. Kiosk jest krótszy od autobusu, więc `collideZabkas` liczy osobno, ile trzeba przesunąć autobus w każdą stronę osi (wcześniej brało długość części wspólnej i autobus „obejmujący” kiosk był wypychany za słabo). Wersję żula wybiera render po id bonusu, więc sim i sieć się nie zmieniają.
### 2026-10-18 — Koniec „MVP na płaskiej mapie”: miasto domyślne, przełącznik w poczekalni [028]
Nowe party startuje na mieście (`CITY_ENABLED = true` to domyślna wartość `LobbyInfo.map`). Host wysyła w poczekalni wiadomość `map` (`'city' | 'flat'`), a serwer (`PartyRoom.newGame`) losuje nową mapę z nowym seedem, tworzy świeży `GameState` z tymi samymi graczami (imię, kolor, połączenie) i wysyła wszystkim nowe `welcome`. Klient buduje scenę dopiero po Starcie, więc `Party.world` to getter na ostatnie `welcome`. Po Starcie zmiana mapy jest ignorowana. `newGame` nadaje się też do rewanżu (karta 027). `createGame(seed, city)` przyjmuje rodzaj mapy.
