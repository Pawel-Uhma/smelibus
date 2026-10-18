# Synchronizacja stanu klient-serwer i rozłączenia

obszar: siec
kto: Pawel
zależy od: 018
ścieżki: net/, server/

## Cel

Klient w `app/src/net/` wysyła akcje z `input/` do serwera i podaje `render/` stan z serwera, z interpolacją pozycji autobusów i pieszych. Rozłączony gracz ma 60 s (`RECONNECT_SECONDS`) na powrót; potem jego strefa staje się neutralna.

## Gotowe, gdy

- [ ] dwóch graczy w dwóch przeglądarkach widzi ten sam stan, ruch płynny
- [x] odświeżenie strony w ciągu 60 s wraca do tej samej postaci
- [x] po 60 s strefa rozłączonego jest neutralna

## Co zrobione i jak sprawdzone

- Kafelki: snapshot niesie `tileChanges` (tylko zmienione kafelki od poprzedniego snapshotu, `net/tiles.ts`), klient nanosi je na `party.world`. Pełna mapa dalej idzie raz w `welcome`. Test Vitest `net/tiles.test.ts`.
- Snapshot niesie też `winnerId` (zawsze) i `bonuses` (tylko gdy lista się zmieniła; `net/client.ts` uzupełnia brakujące z poprzedniego snapshotu, więc `latest().bonuses` jest zawsze pełne). W teście e2e bonusy były w 14 z 1360 snapshotów.
- `removePlayer` (`sim/game.ts`) zeruje właściciela kafelków gracza: strefa staje się neutralna. Test w `sim/game.test.ts`.
- Serwer: `allowReconnection` bez `await`, żeby po 60 s Colyseus normalnie wołał `onLeave` (zwolnienie autobusu, strefa neutralna) bez wyjątku w logu.
- Test end-to-end w Node na lokalnym serwerze (dwóch klientów `@colyseus/sdk`): ten sam seed i rozmiar mapy, ten sam tick, B widzi ruch autobusu A; zerwane połączenie B → A widzi `connected: false`; `reconnect(token)` → ten sam `playerId` i ten sam autobus; po 65 s nieobecności B znika z graczy, jego autobus jest wolny, a spóźniony reconnect jest odrzucany.

## Niezweryfikowane

- Nie testowane w prawdziwej przeglądarce: płynność ruchu (interpolacja 100 ms, predykcja własnego autobusu) i odświeżenie strony (token w `sessionStorage`, ścieżka `/p/KOD` → `rejoinParty`). Ścieżka reconnect w SDK jest ta sama co w teście Node.
- Neutralizacja strefy przez sieć sprawdzona w e2e po wejściu 010: B miał 1624 kafelki, po 65 s w widoku A ma 0, wszystkie neutralne (przez `tileChanges`).
- Interpolacja pieszych: pieszych jeszcze nie ma w stanie (karta 006). Gdy dojdą do `Snapshot`, trzeba dodać ich do `interpolatedBuses`-podobnej funkcji w `net/client.ts`.
