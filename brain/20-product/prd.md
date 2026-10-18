---
updated: 2026-10-18
status: current
source: "[[2026-10-18-smelibus-1]]"
doc: https://claude.ai/code/artifact/a36a51d1-2dc3-46f5-9ca2-db1053d6d9ea
---

# Smelibus — wymagania produktowe (PRD)

> Wiążące mechaniki są w `docs/GAME_DESIGN.md`, a decyzje w `docs/DECISIONS.md`.
> Ten plik to wersja produktowa: spotkanie 1 plus decyzje Pawła z sesji pytań 2026-10-18 (sekcja niżej).

## Opis gry

Smelibus to przeglądarkowa gra multiplayer, w której wygrywa ten, kto przejmie całą mapę. Każdy gracz zaczyna z własną strefą, wsiada do autobusu i zbiera po drodze bonusy, przez które autobus bardziej śmierdzi. Gdy autobus wjedzie do strefy gracza, strefa rośnie: im więcej autobusów i im mocniej śmierdzą, tym bardziej.

Źródło: spotkanie Smelibus 1, grę przedstawił Szczepan.

## Zakres MVP

Pierwsza wersja to mała, losowo generowana mapa i rozgrywka online w party do 8 graczy, bez zewnętrznych API.

| Obszar | Wymaganie w MVP |
| --- | --- |
| Tryb gry | Online, party do 8 graczy |
| Mapa | Mała, generowana losowo na starcie party |
| Strefy | Mapa dzielona na tyle stref, ilu jest graczy; każdy dostaje jedną |
| Autobusy | Można wsiąść i kierować w widoku z góry |
| Bonusy | Zbierane po drodze, zwiększają smród autobusu |
| Wygrana | Przejęcie całej mapy |
| Grafika | Proste modele 3D w stylu wokselowym |
| Dostępność | Tryb wysokiego kontrastu |
| Integracje | Brak zewnętrznych API |

## Rozgrywka

Rdzeń gry to pętla: wsiadasz do autobusu, zbierasz smród, wjeżdżasz do swojej strefy i strefa rośnie.

1. Gracz jest na mapie jako wokselowa ikonka i podchodzi do autobusu.
2. Po wejściu do autobusu kamera przechodzi w widok z góry, a gracz kieruje autobusem.
3. Po drodze zbiera bonusy, które zwiększają smród autobusu. Przykład ze spotkania: żule z przystanku.
4. Gdy autobus jest już w strefie gracza albo do niej wjeżdża, strefa się rozrasta.
5. Przyrost strefy zależy od liczby autobusów gracza i od tego, jak mocno śmierdzą.
6. Gra kończy się, gdy jeden gracz przejmie całą mapę.

## Multiplayer

Gra działa online w party, do której dołącza do 8 graczy.

- Jeden gracz zakłada party, pozostali do niego dołączają.
- Po starcie party generuje się mapa i dzieli na tyle stref, ilu jest graczy.
- Każdy gracz dostaje na start swoją część mapy.
- Wszyscy gracze widzą ten sam stan mapy, autobusów i stref w czasie rzeczywistym.

## Mapa

W MVP mapa jest mała i generowana losowo przy każdym starcie party; nie korzystamy z żadnego zewnętrznego API.

- Generator tworzy mapę z drogami, po których jeżdżą autobusy, i z przystankami, na których leżą bonusy.
- Mapa dzieli się na strefy, po jednej na gracza.
- Granice stref przesuwają się w trakcie gry, gdy strefy rosną.
- Mapa Warszawy padła jako pomysł, ale na razie zostajemy przy losowej.

## Grafika i dostępność

Cała gra jest w prostej grafice 3D w stylu wokselowym, a tryb wysokiego kontrastu jest obowiązkowy już w MVP.

- Autobusy, ikonki graczy i mapa w jednym, wokselowym stylu.
- Dwa widoki: postać na mapie oraz widok z góry po wejściu do autobusu.
- Tryb wysokiego kontrastu do włączenia w ustawieniach: strefy graczy, autobusy i bonusy muszą się w nim wyraźnie odróżniać.

## Poza zakresem MVP

- Mapa prawdziwego miasta, np. Warszawy.
- Zewnętrzne API, w tym mapy i dane o komunikacji.
- Party większe niż 8 graczy.

## Decyzje z sesji pytań (2026-10-18)

| # | Temat | Decyzja |
| --- | --- | --- |
| 1 | Autobus | Neutralny: pusty autobus bierze każdy, także zaparkowany w cudzej strefie |
| 2 | Wzrost strefy | Jednorazowy skok przy wjeździe do swojej strefy |
| 3 | Po skoku | Autobus wielokrotnego użytku; kradzież zabiera pojazd, nie teren |
| 4 | Smród przy skoku | Wydaje się w całości, spada do 0 |
| 5 | Skąd teren | N = smród kafelków od punktu wjazdu na zewnątrz, czyjekolwiek są |
| 6 | Eliminacja | Gracz bez pól jeździ, kradnie i taranuje, ale nie rośnie |
| 7 | Koniec gry | Tylko 100% mapy; sudden death ×2 po 8 min, ×3 po 10 |
| 8 | Liczba autobusów | Stała: liczba graczy + 2 |
| 9 | Kradzież | Pusty autobus wolny + taranowanie wytrąca smród na ziemię |
| 10 | Bonusy | Kilka typów + kontroler (negatywny) + śmietniki |
| 11 | Potrącenie pieszego | Ogłuszenie ~3 s |
| 12 | Platforma | Komputer w przeglądarce, klawiatura |
| 13 | Party | Link z kodem bez kont + opcjonalna publiczna lista |
| 14 | Dołączanie | W trakcie gry, strefa wycięta liderowi; rozłączenie 60 s, potem strefa neutralna |
| 15 | Stack | Vite + three.js na Vercelu, serwer Colyseus na Railway |
| 16 | Rozmiar mapy | ~400 kafelków na gracza |
| 17 | Teren | Płaska mapa bez budynków i ulic, z elementami |
| 18 | Modele | Generowane w kodzie z prostopadłościanów, jedna paleta |
| 19 | Wysoki kontrast | Nie w MVP |

## Otwarte pytania (stan ze spotkania 1, większość rozstrzygnięta wyżej)

- [ ] Ilu graczy minimum potrzeba, żeby wystartować party? Czy jest tryb dla jednego gracza?
- [ ] Jaki dokładnie jest wzór na przyrost strefy z liczby autobusów i ich smrodu?
- [ ] Skąd biorą się autobusy: ile ich jest, czy się odradzają, czy jeden autobus może mieć kilku graczy?
- [ ] Czy gracze mogą sobie przeszkadzać, np. odbijać strefy albo autobusy?
- [ ] Jakie są bonusy poza żulami z przystanku i czy jakieś zmniejszają smród?
- [ ] Czy smród autobusu z czasem słabnie albo zeruje się po wjechaniu do strefy?
- [ ] Ile trwa jedna rozgrywka i czy jest limit czasu?
- [ ] Jak gracze dołączają do party: link, kod, lista?
- [ ] Jaki silnik 3D i jaki backend czasu rzeczywistego?
