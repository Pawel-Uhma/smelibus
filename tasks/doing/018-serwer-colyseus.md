# Serwer gry Colyseus: pokój party, autorytatywna symulacja

obszar: siec
kto: Pawel
zależy od: 001
ścieżki: server/

## Cel

Serwer Node.js + Colyseus w `server/`. Jeden pokój = jedno party (do 8 graczy). Pokój uruchamia `sim/` z `app/src/sim` (bez Three.js i DOM) z fixed timestep, przyjmuje akcje graczy i rozsyła stan. Deploy na Railway. Uzasadnienie nowej zależności: DECISIONS 2026-10-18.

## Gotowe, gdy

- [ ] `npm run dev` w `server/` startuje pokój lokalnie
- [ ] pokój importuje `sim/` z `app/src` i tyka symulacją
- [ ] serwer działa na Railway pod stałym adresem, zapisanym w `.env.example` (`VITE_SERVER_URL`)
