# Smelibus

Przeglądarkowa gra multiplayer o śmierdzących autobusach przejmujących mapę.

- `app/` — kod gry. Deploy na Vercel (projekt `smelibus`, smelibus.vercel.app).
- `brain/` — mózg projektu: wymagania, decyzje, transkrypty. Wpisany do `.gitignore`,
  nie trafia do gita ani na Vercel. Zacznij od `brain/CLAUDE.md` i `brain/index.md`;
  wymagania gry są w `brain/20-product/prd.md`. Grep/ripgrep słuchają `.gitignore`,
  więc ścieżkę `brain/` podajesz im wprost.
