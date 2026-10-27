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
- Po wejściu do party jest poczekalnia (kod, link, lista graczy). Gra rusza, gdy host kliknie
  **Start**: mapa dzieli się wtedy od nowa na strefy wszystkich obecnych, a autobusy stają w
  punktach startowych. Host, który wyjdzie, przekazuje rolę następnemu graczowi. Kolor wybierasz
  na stronie głównej; jeśli jest zajęty, dostajesz pierwszy wolny.
- **Dołączanie w trakcie gry** (do 8): nowy gracz dostaje strefę startową wyciętą z terenu lidera.
  Mapa nie rośnie.
- Rozłączenie: 60 s na powrót, potem strefa zostaje na mapie jako neutralna (do przejęcia).
- **Rewanż:** po wygranej host widzi na ekranie zwycięzcy przycisk „Rewanż”, a pozostali napis
  „Czekamy na hosta…”. Party zostaje to samo (kod i link bez zmian). Serwer losuje nową mapę,
  zeruje zegar, sudden death, autobusy i bonusy, a wszyscy wracają do poczekalni, gdzie można
  dołączyć albo wyjść. Gra rusza znowu, gdy host kliknie Start; sudden death liczy się od tego Startu.
- **Boty (gra z komputerem):** w poczekalni host dodaje boty przyciskiem „+ Bot” i usuwa je „×”.
  Bot zajmuje miejsce w party (razem z ludźmi do 8), ma własny kolor i strefę i gra jak gracz:
  zbiera bonusy (omija kontrolera), po uzbieraniu 30–65 smrodu wraca przez granicę do swojej
  strefy, z prawie pustym autobusem taranuje rywali, którzy wiozą ≥ 30 smrodu, i trąbi na bliskie
  autobusy. Liczy się do zwycięstwa, więc gra „sam + bot” to normalny mecz. Host nigdy nie
  przechodzi na bota, a party znika razem z ostatnim człowiekiem. Boty zostają na rewanż.
- Gracz jest albo **pieszym**, albo **kierowcą**.
- Pieszy: chodzi wszędzie (WASD), `E` przy autobusie (zasięg ~2 kafelki) = wsiada, jeśli autobus jest pusty.
- Pieszy skacze spacją (podskok ~0,8 kafelka, 0,5 s; w autobusie spacja dalej hamuje). Prędkość pieszego: 5,2 kafelka/s.
- Kierowca: steruje autobusem, `E` = wysiada obok autobusu.
- `H` = klakson (pieszy i kierowca). Słyszą go gracze w pobliżu, ciszej im dalej (`SOUND_HORN_RANGE`). Na telefonie przycisk „Klakson” po lewej, pod „Wsiądź / Wysiądź”.
- `K` = tryb wysokiego kontrastu (też przycisk „Kontrast” w HUD, `?kontrast` w URL, domyślnie wg `prefers-contrast: more`): strefy nad ulicami miasta (półprzezroczysty kolor gracza, czarna granica), nieprzezroczysty HUD, noc ciemnieje najwyżej do `HIGH_CONTRAST_NIGHT_MAX`. Wybór zostaje w przeglądarce.
- **Eliminacja:** gracz z 0 kafelków nie odpada. Dalej chodzi, jeździ, kradnie autobusy,
  taranuje i potrąca, ale nie może rosnąć (nie ma strefy, do której mógłby wjechać).

## Autobusy

- Stała pula: **liczba graczy + 2** autobusy. Nie znikają i nie pojawiają się nowe.
- Sterowanie zręcznościowe: gaz/hamulec/skręt, prosta fizyka (bez silnika fizycznego) — nie symulacja.
- Na telefonie (dotyk): pływająca gałka pod prawym kciukiem. Autobus jedzie tam, gdzie wskazujesz na ekranie (nie skręca kołami w stronę wychylenia): sam skręca do kierunku gałki, a wychylenie to gaz. Stojący autobus przy gałce skierowanej za siebie cofa, jadący zawraca. Pieszy idzie w stronę wychylenia. Po lewej małe przyciski z ikoną i podpisem: „Wsiądź”/„Wysiądź” i „Klakson”. Na desktopie bez zmian.
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
| Żul spod Żabki | +25 | sklepy Żabka na mapie wypuszczają żuli; im dalej w grę, tym częściej i więcej (odstęp 30 s → 8 s, limit przy sklepie 1 → 4). Żul wychodzi drzwiami, idzie 1–2,5 kafelka w losową stronę od sklepu i się przewraca; leżący daje **+40**. Po zebraniu znika, „siedzi” jak ten z przystanku. Trzy wersje żula (niżej, Grafika → Żul) |
| Paczka z Paczkomatu | +5 | paczkomaty InPost stoją przy ulicach; uderzenie w drzwi z prędkością ≥ 3 kafelki/s wybija przed paczkomat paczkę, a w **30%** przypadków **kupę (+30)**. Potem paczkomat jest pusty przez 6 s. Ocieranie bokiem się nie liczy. Wybite leży 20 s |

**Statystyki ładunku** (karta 039): każdy podniesiony bonus liczy się autobusowi i jego kierowcy, w jednym miejscu (`sim/cargo.ts`, wołane przy zebraniu). HUD przy pasku smrodu pokazuje 🍺 żuli, którzy **siedzą w autobusie teraz** (każdy przez 20 s od zebrania, `ZUL_SIT_SECONDS`), oraz 📦 paczki i 💩 kupy **zebrane od startu gry**. Ekran wygranej ma tabelę graczy: żule, paczki, kupy, reszta (wszystko inne, też kanar i rozsypany smród), wszystko jako suma od startu; lider kolumny jest podświetlony (remis: wszyscy), przy zerze nikt. Rewanż zeruje statystyki.

### Zaplanowane zmiany (karty 041–047, ustalone 27.10)

Jeszcze nie w kodzie. Kto robi kartę, przenosi swoją część do tabeli i reguł wyżej. Modele i makieta losowania: artefakt „Bonusy smrodu” u Pawła.

- **Zwykłe bonusy znikają** (kebab, pies, śledź, kibic, durian) razem z wolnymi miejscami na mapie. Przystanek ma żula albo stoi pusty [041].
- **Smród do 1000** zamiast 100. **Sudden death** od 4 min: ×2, potem +1 co 2 min, bez limitu [042].
- **Paczkomat** jest większy, stoi przy bloku i nie ma kolizji. Przejazd przez niego losuje nagrodę, którą kierowca widzi na taśmie na dole ekranu, i trafia ona od razu do autobusu. Pula: kupa +30 (40%), **energetyk** +35% prędkości na 6 s (20%), **bilet miesięczny** przez 25 s chroni przed kontrolerem i taranowaniem (20%), **kiszona kapusta** daje ×2 do zbieranego smrodu przez 10 s (20%). Paczek już nie ma. Jeden power-up naraz [043].
- **Kontroler** chodzi chodnikiem z animacją kroku [044]. **Śmietnik** jest mniejszy i stoi przy krawężniku, a po zebraniu leży przewrócony 20 s [045].
- **Kukuryniarz** na elektrycznej hulajnodze wyjeżdża z bloków i jeździ ulicami. Zgarnięty daje +4% prędkości, bonusy się sumują (do +50%) i zanikają o 0,25 pp/s. Nowy **pasek prędkości** w HUD [046].
- Na mapie miasta ma być wyraźnie widać, czyj jest teren [047].

Pomysły na później: **Choinka zapachowa**, pasażerowie wysiadający gdy smród > 90 (chaos),
widoczna zielona chmura wokół autobusu skalowana smrodem.

## Pogoda

- Nad mapą losowo pojawiają się **chmury** (okrąg o promieniu ~6–11 kafelków), które powoli
  dryfują w losowym kierunku i po 20–45 s się rozpływają albo wypływają poza mapę. Naraz max 3.
- **Deszcz** (~75% chmur): autobus pod chmurą traci smród szybciej (−3/s ponad zwykłe wietrzenie).
  Omijasz deszcz albo w nim tracisz przewagę.
- **Harnaś** (~25% chmur): z nieba lecą puszki, autobus pod chmurą **zyskuje** smród (+2/s).
  Opłaca się gonić chmurę Harnasia.
- Działa na wszystkie autobusy pod chmurą, także zaparkowane (zmoknięty pusty autobus jest czystszy
  do przejęcia, oblany Harnasiem — cenniejszy).
- Obszar chmury widać jako zabarwioną ziemię (niebieską / bursztynową) pod rzadką chmurą z voxeli.
- Liczby w `config.ts` (`WEATHER_*`, `RAIN_STINK_PER_S`, `HARNAS_STINK_PER_S`, `HARNAS_CHANCE`).

### Dzień i noc

- Pora dnia zmienia się w kółko według czasu gry, więc wszyscy gracze mają tę samą: mecz zaczyna
  się rano, cykl trwa 4 min (`DAY_NIGHT_CYCLE_S`), z czego ~35% to noc (`NIGHT_SHARE`). Zmierzch
  i świt trwają po 12 s (`TWILIGHT_S`), niebo przechodzi przez ciepły kolor zachodu.
- W nocy jest ciemno (księżyc i słabe światło otoczenia). Autobusy świecą reflektorami na drogę
  przed sobą (oświetlają ziemię, strefy i budynki), a za nimi jest delikatna czerwona poświata
  świateł tylnych. Żabki świecą na zielono: poświata przed wejściem i nad szyldem, plus światło
  sklepu na chodniku.
- Tylko wygląd: symulacja i balans się nie zmieniają.
- `?noc` w adresie albo klawisz N wymusza noc (N jeszcze raz wraca do cyklu), a `?noc=0` zostawia
  sam dzień. Liczby w `config.ts` (`DAY_NIGHT_*`, `NIGHT_*`).

## Dźwięk

- Same efekty, bez muzyki w tle. Wszystko generowane w kodzie przez Web Audio (oscylatory i szum),
  bez plików dźwiękowych, tak jak voxele.
- Klakson (`H`): dwutonowy, przez sieć. Własny słychać od razu, cudzy w zasięgu `SOUND_HORN_RANGE`.
- Skok: rosnący akord, im więcej przejętych kafelków, tym wyżej i pełniej. Własny skok zawsze głośno.
- Taran: głuche „bum”. Bonus: krótkie „blup”. Kontroler biletów: smutne „bzzt”.
- Pod chmurą: szum deszczu albo brzęk puszek Harnasia, tym mocniej, im głębiej pod chmurą.
- Pozostałe efekty słychać w zasięgu `SOUND_RANGE`, ciszej z odległością.
- Przycisk „Dźwięk” w HUD wycisza grę, wybór jest zapamiętany w przeglądarce. Dźwięk rusza po
  pierwszym kliknięciu albo klawiszu (polityka autoplay przeglądarek).

## Strefy i mapa

- **Domyślnie miasto:** ulice, kwartały z budynkami i parki. Autobusy i piesi odbijają się od
  budynków. Przystanki stoją przy ulicach, a żaden bonus nie pojawia się w budynku.
- **Jak wygląda miasto** (karta 038): ulice idą pod różnymi kątami, nie w szachownicę. Są trzy
  przekroje: aleja dwujezdniowa z zielonym pasem dzielącym i drzewami, ulica z pasami zieleni
  i drzewami, wąska uliczka. Do tego chodniki, czerwone ścieżki rowerowe przy części ulic,
  przejścia dla pieszych na skrzyżowaniach i ronda (duże na skrzyżowaniu alej). Jezdnia ma dwa
  pasy w każdą stronę na alei, po jednym na ulicy. Budynki zależą od dzielnicy: w centrum
  Pałac Kultury na placu, szklane biurowce i socrealistyczne kamienice MDM, dookoła kwartały
  kamienic z podwórkami (wjazd bramą), na obrzeżach osiedla bloków z wielkiej płyty z kolorowymi
  balkonami i pawilonami. Parki mają alejki, fontannę i drzewa. Przez drzewa się przejeżdża,
  cały pas ulicy (z chodnikiem i zielenią) jest przejezdny, blokują tylko budynki.
- **Przełącznik „Miasto / Płaska”** w poczekalni: klika tylko host, inni widzą wybór. Każde
  przełączenie losuje nową mapę wybranego rodzaju. Płaska mapa nie ma budynków ani ulic, można
  jeździć wszędzie.
- Na mapie stoją elementy: przystanki z bonusami, śmietniki, kontrolerzy, Żabki.
- Mapa to siatka kafelków generowana losowo przy starcie party, zawsze na pełne party:
  **1600 kafelków na gracza**, czyli ~114×114 (karta 038, wcześniej 400 i 57×57, ulice były za
  wąskie na autobusy). Każdy kafelek ma właściciela (`ownerId`).
- Start: mapa dzielona na tyle stref, ilu jest graczy (np. Voronoi od punktów startowych).
- **Skok:** gdy autobus z kierowcą przekroczy granicę strefy kierowcy (wjedzie do niej z cudzego
  albo neutralnego terenu), gracz przejmuje **N = 4 × stink** kafelków (× mnożnik sudden death; 4, bo mapa urosła 4×).
  Kafelki są brane od punktu przekroczenia granicy na zewnątrz, najbliższe pierwsze, niezależnie
  od tego, czyje są. Smród autobusu spada do 0.
- O tym, komu zabierasz teren, decydujesz tym, z której strony wjeżdżasz.
- Przejęte kafelki zmieniają kolor (render podświetla granicę).
- **Minimapa** w rogu HUD (na telefonie w poziomie na dole pośrodku, między kciukami): strefy w kolorach
  graczy, budynki ciemniejsze, autobusy i piesi jako kropki, chmury deszczu i Harnasia.
  **Bez bonusów**, żeby nie było za łatwo. Gdy granicy własnej strefy nie widać na ekranie,
  przy krawędzi ekranu pojawia się strzałka do najbliższej granicy.

## Warunek zwycięstwa

- Gracz posiada 100% kafelków → wygrywa. Nie ma wygranej na punkty.
- **Sudden death:** po 8 min bonusy dają ×2 smrodu, po 10 min ×3, żeby gra się rozstrzygnęła.

## Grafika

- Proste modele 3D w stylu voxel, **generowane w kodzie** z prostopadłościanów (bez plików
  `.vox`). Wszystkie kolory z jednej palety, kolory graczy to jej podmiana.
- Modele z MagicaVoxel dla autobusu i ludzika — dopiero gdy pętla gry działa.
- Kamera: pieszy z góry pod kątem, kierowca — widok z góry. Kierowca może przełączać widok klawiszem C albo przyciskiem w HUD: z góry → dron za autobusem → kokpit (szyba, słupki, deska, kierownica w kolorze gracza) → oczy kierowcy (pierwsza osoba bez elementów autobusu). Wybór zapamiętuje przeglądarka, `?kamera=chase|cockpit|eyes` w URL. W widokach innych niż z góry gałka na telefonie działa jak gaz i kierownica, nie jak celowanie na ekranie.
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

### Model pieszego: Służbista

Wybrany z propozycji ludzików (kierowca, kibic, chibi, pionek i 4 warianty kierowcy). Gracz to kierowca
autobusu, a kolor gracza jest na denku czapki, czyli tam, gdzie patrzy kamera z góry.

- Wymiar 3 (głębokość, przód w +x) × 3 (szerokość) × 8 (wysokość) voxeli, ten sam voxel co autobus
  (1/6 kafelka), więc ludzik ma 1,33 kafelka wysokości, tyle co autobus z klimatyzatorem. To ok. 3×
  więcej niż w prawdziwej skali, żeby był widoczny z kamery z góry.
- Warstwy od dołu: `z0` buty (dwie nogi), `z1–3` granatowy mundur `#2B3448` ze złotymi guzikami
  `#FFB000` na piersi, `z4–5` głowa (skóra `#F0C39E`, włosy z tyłu `#4A3426`, oczy w `z5`),
  `z6` czarny otok i daszek, `z7` denko czapki w kolorze gracza, wysunięte do przodu.

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
| 5 | liliowy | `#C9A0DC` |
| 6 | karminowy | `#A3203A` |
| 7 | śliwkowy | `#5B2A6E` |
| 8 | grafitowy | `#3C3F4A` |

Zarezerwowane, nie dla graczy: zieleń smrodu `#8CC846`, plamy `#6F7A2E`, wyświetlacz `#FFB000`,
szarości niczyich autobusów i kafelków (`#BBBBBB`, `#D9D4C7`). Wartości w `shared/config.ts` (`PLAYER_COLORS`).

### Żabka

Wybrana z 4 propozycji (obecny kiosk, z markizą, nocny pawilon, żaba na dachu), powiększona.
Stoi na działce 2 × 2 kafelki (`ZABKA_TILES`), czyli 12 × 12 voxeli, i od tej działki liczą się
kolizje i drzwi. Ściany `#F2EFE6` do `y8` z dwiema witrynami `#628598` (plakat `#C8443A`), podwójnymi
drzwiami `#22303A` i oknem z każdego boku. `y9–10` zielony pas szyldu `#2E8B3A` z białym logo
z oczkami z przodu, `y11` żwirowy dach `#BFC3BD` z zieloną obwódką `#3A9A45`. Na dachu żaba
8 × 4 × 8 `#46A84F` z jasnym brzuchem `#E8E2C0`, czerwonym pyskiem i białymi oczami wystającymi
do `y17`, więc z kamery od góry widać zieloną żabę z dwoma białymi oczami. Przód z drzwiami
zwrócony do ulicy przy którymkolwiek boku działki (na płaskiej mapie do środka mapy). Działka
musi być cała wolna (nie droga, nie budynek), w mieście przy drodze. Kod: `render/zabka.ts`,
`sim/zabka.ts`.

### Żul

Wybrane 3 z 4 propozycji. Każdy żul dostaje wersję po id bonusu (`zulVariant`, ta sama u wszystkich
klientów). Voxel bonusu (`BONUS_VOXEL_SIZE`), wspólne: siwe włosy z tyłu, zarost, czerwony nos.

- **Na skrzynce:** łysy, w brązowej kurtce. Spod Żabki wychodzi ze skrzynką po piwie w rękach,
  na miejscu siada na niej z butelką, obok leżą puste.
- **Dres:** młodszy, ciemny dres z białymi lampasami, czapka z pomponem, papieros, reklamówka
  z Żabki. Na miejscu przewraca się na twarz.
- **Na kartonie:** w kaszkiecie, karton pod pachą. Na miejscu kładzie się na kartonie na plecach,
  nogi przykryte gazetą, butelka na piersi.

Żul z przystanku od razu jest w pozie „na miejscu” i nie kręci się ani nie podskakuje jak inne
bonusy. Nad leżącym/siedzącym unosi się zielona chmurka. Kod: `render/bonusModels.ts`
(`zulGeometry`), `render/zul.ts`, `render/bonuses.ts`.

### Paczkomat InPost

Szafka 5 × 2 × 6 voxeli (wielkość voxela jak w autobusie): żółta obudowa `#FFCD00`, z przodu
szare drzwiczki skrytek w szachownicę i ciemny ekran, ciemne rogi daszku. Drzwi do sąsiedniej
ulicy. Paczka to karton z taśmą i żółtą etykietą, kupa to brązowy zawijas z muchami.
Kod: `sim/paczkomat.ts`, `render/paczkomat.ts`, modele wybitych rzeczy w `render/bonusModels.ts`.

### Smród na autobusie

Smród rysujemy tymi samymi voxelami co autobus, bez systemu cząsteczek. Trzy stopnie wg `stink`
(progi to liczby balansu → `config.ts`):

| `stink` | Nazwa | Wygląd |
|---|---|---|
| 0–30 | Świeżak | czysty lakier |
| 31–70 | Zalatuje | ok. 1/7 voxeli karoserii to oliwkowe plamy `#6F7A2E`; pojedyncze zielone obłoczki nad dachem i z rury wydechowej |
| 71–100 | Durian | plamy na ok. 1/3 karoserii, ok. 1/4 szyb pękniętych (`#C9D6DC`), półprzezroczysta chmura zielonych voxeli (`#8CC846`, krycie ok. 0.4) do 3 voxeli wokół autobusu, gęstnieje ze smrodem |

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
- Jak domknąć mecz, który się ciągnie (8 graczy, ostatnie kafelki): kurczenie stref od 12 min
  i oddanie resztek < 1% mapy sąsiadowi, czy twardy limit czasu (łamie „bez wygranej na punkty”).
  Nierozstrzygnięte (Paweł, 2026-10-18).
