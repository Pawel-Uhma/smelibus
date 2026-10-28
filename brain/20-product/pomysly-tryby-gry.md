---
updated: 2026-10-28
status: draft
source: rozmowa Pawła z agentem, 2026-10-28
---

# Pomysły: jak skończyć przeciąganie liny i nowe tryby

> Propozycje, nic z tego nie jest jeszcze ustalone. Wiążące mechaniki są w `docs/GAME_DESIGN.md`.

## Problem

Wygrać praktycznie się nie da. Gra wygląda jak przeciąganie liny: raz jeden ma więcej, raz drugi.

Skąd to się bierze:

- Skok zabiera najbliższe kafelki bez względu na to, czyje są, a zdobyty teren nie jest niczym chroniony.
- Lider ma najdłuższą granicę, więc wszyscy go podgryzają.
- Wygrana wymaga 100% mapy, czyli zredukowania każdego rywala do zera.
- Gracz z 0 kafli nie odpada i dalej przeszkadza.
- Sudden death mnoży skoki wszystkich naraz, więc lina szarpie się szybciej, ale nikt jej nie przeciąga.

## Poprawki obecnego trybu

### 1. Zasiedziały smród (teren twardnieje)

Kafelek trzymany 30 s ciemnieje i żeby go zabrać, trzeba 2× smrodu. Po 90 s trzeba 3×. Świeże zdobycze łatwo stracić, stary rdzeń trudno ruszyć. Przewaga zaczyna się kumulować, zamiast się wahać. Mała zmiana: czas przejęcia każdego kafla w `sim/zones.ts` i progi w `config.ts`.

### 2. Wygrana progiem albo na czas

Wygrywa ten, kto pierwszy utrzyma 60% mapy przez 20 s. Na ekranie widać wtedy pasek „PRZEJMUJE MIASTO”. Druga możliwość: po 8 min wygrywa ten, kto ma najwięcej. Odliczanie pokazuje wszystkim lidera, więc reszta rzuca się na niego, a koniec meczu robi się emocjonujący.

### 3. Prawdziwe odpadanie

Gracz poniżej 3% mapy dostaje 30 s „ostatniego kursu”. Jeśli przez ten czas nie urośnie, odpada, a jego teren robi się neutralny. Z każdym odpadnięciem mniej graczy ciągnie linę, więc mecz sam się zwęża.

## Nowe tryby

### 4. Zajezdnia (baza + tower defense)

Każdy gracz ma zajezdnię z „wytrzymałością nosa” 1000. Smród wypuszczony przy cudzej zajezdni zadaje jej obrażenia. Za smród stawia się obronę:

- kiosk z Kanarem (−20 dla przejeżdżających),
- ekipę sprzątającą (zmywa smród w promieniu),
- pachołki (zapora).

Zniszczona zajezdnia oznacza odpadnięcie. Teren zostaje jako ekonomia, bo w swojej strefie jest więcej bonusów, ale przestaje być warunkiem zwycięstwa.

### 5. Smrodomiotacz (częściowo strzelanka)

Spacja nie wypuszcza już smrodu w miejscu, tylko wystrzeliwuje bąbel smrodu przed autobus. Amunicją jest własny smród. Trafiony autobus traci 30% ładunku (wypada na ziemię) i kręci się przez 1 s. Z paczkomatu można dostać Durian Bombę albo Zieloną Chmurę (minę). Pieszy rzuca kanapką z jajkiem: słabo, ale wystarczy, żeby przerwać kradzież. Kto wiezie dużo smrodu, staje się celem, więc jazda z pełnym autobusem to prawdziwe ryzyko.

### 6. Wyścig linii nocnej

Serwer losuje trasę N-ki przez 6 przystanków z checkpointami. Jedzie się 3 okrążenia, a po drodze są kontrolerzy, deszcz i żule z Żabki. Smród służy za nitro: spacja spala 20 smrodu i daje 1,5 s boostu. Taranowanie zostaje. Mecz trwa 3–4 min, dobry na rozgrzewkę.

### 7. Nalot ZTM (kooperacja, fale)

Gracze grają razem przeciw botom. Z krawędzi mapy wchodzą fale kontrolerów, mundurowych i myjni na kółkach, które czyszczą teren na szaro. Gracze bronią Pałacu Kultury i rozjeżdżają wrogów autobusem. Im bardziej autobus śmierdzi, tym większy ma zasięg. W fali 10 przyjeżdża boss: Prezes ZTM w Melexie. Da się grać solo z botami.

### 8. Porwij Króla Żuli (capture the flag)

W każdej strefie śpi Król Żul. Trzeba zgarnąć cudzego i dowieźć go do siebie. Król daje +100 smrodu, przez co autobus jedzie wolniej i świeci na minimapie. Taranowanie zrzuca Króla z autobusu. Trzy dowiezienia dają wygraną. Cel jest twardy, a koniec jasny.

### 9. Gorący Ziemniak / Kanar Gonitwa (asymetryczny)

Wariant A: jeden gracz jest Kanarem w radiowozie ZTM. Dotknięty autobus też zostaje kanarem, jak w zaraźliwym berku.

Wariant B: jeden autobus jest Śmierdzielem, któremu smród rośnie co sekundę. Dotknięciem przekazuje się go dalej, a kto ma go na koniec 90-sekundowej rundy, przegrywa rundę. Gra idzie na 5 rund i punkty. Tryb imprezowy.

### 10. Battle royale „Wielkie Sprzątanie”

Od krawędzi mapy zwęża się krąg deszczu (−10/s) z ekipami sprzątającymi. Kierowca, któremu smród spadnie do 0, odpada z autobusu i chodzi pieszo. Może jeszcze ukraść autobus komuś, kto wysiadł. Ostatni śmierdzący wygrywa. Nie ma tu terenu, liczy się tylko przetrwanie, więc mecz zawsze się kończy.

## Rekomendacja

1. Najpierw **1 + 2** (twardnienie terenu + próg 60% przez 20 s). To jedna karta w `sim/zones.ts` i `config.ts`, a od razu daje obecnemu trybowi koniec.
2. Potem pierwszy nowy tryb: **6 (Wyścig)**, który jest tańszy, albo **4 (Zajezdnia)**, która jest głębsza. Oba korzystają z tego, co już jest: miasta, przystanków, tarana i paczkomatu.
