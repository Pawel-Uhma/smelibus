# Mózg Smelibusa

Pamięć projektu. Czyta ją każdy agent pracujący nad Smelibusem.
Nie dokumentacja techniczna — wymagania, decyzje i wnioski ze spotkań.

## Gdzie leży

Mózg to folder `brain/` w repo `~/Desktop/smelibus`, wypychany do gita razem z resztą,
żeby widzieli go agenci całego zespołu. Kod gry jest w `../app` i `../server`.
Mechaniki i decyzje wiążące dla zespołu są w `../docs/GAME_DESIGN.md` i
`../docs/DECISIONS.md`; mózg trzyma kontekst produktu i surowe materiały.

## Układ

- `20-product/` — **produkt**: wymagania (PRD), zasady gry, decyzje.
- `90-raw/` — surowe dowody, niemodyfikowalne (transkrypty spotkań).
  Przepływ jednokierunkowy: raw → synteza w `20-product/`.
- `log.md` + `log/` — historia zmian.

Root trzyma tylko `CLAUDE.md`, `index.md`, `log.md` i folder `log/`.
