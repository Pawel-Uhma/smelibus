# Synchronizacja stanu klient-serwer i rozłączenia

obszar: siec
kto: Pawel
zależy od: 018
ścieżki: net/, server/

## Cel

Klient w `app/src/net/` wysyła akcje z `input/` do serwera i podaje `render/` stan z serwera, z interpolacją pozycji autobusów i pieszych. Rozłączony gracz ma 60 s (`RECONNECT_SECONDS`) na powrót; potem jego strefa staje się neutralna.

## Gotowe, gdy

- [ ] dwóch graczy w dwóch przeglądarkach widzi ten sam stan, ruch płynny
- [ ] odświeżenie strony w ciągu 60 s wraca do tej samej postaci
- [ ] po 60 s strefa rozłączonego jest neutralna
