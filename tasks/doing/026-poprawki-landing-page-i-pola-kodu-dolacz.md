# Poprawki landing page i pola kodu dołączania

obszar: siec
kto: Pawel
zależy od: -
ścieżki: `ui/lobby/lobby.ts`, `ui/lobby/lobby.css`, `app/index.html`

pytanie: @Paweł Szczepan prosi, żebyś to wziął.

## Cel

Landing page (lobby) wygląda słabo, trzeba go dopracować graficznie. Pola tekstowe do wpisywania
kodu dołączania do pokoju nie zawsze działają: czasem nie da się wpisać kodu albo dołączyć.

## Gotowe, gdy

- [x] Landing page jest dopracowany graficznie (spójny ze stylem gry). Antek: karta menu + 3D tło z voxelowymi autobusami (`render/menuScene.ts`), commit afab8c7. Zostaje pole kodu.
- [x] Wpisywanie kodu dołączania działa za każdym razem (sprawdzić focus, przechwytywanie klawiszy przez sterowanie gry, wklejanie, wielkość liter, spacje). Kod czyści `net/partyCode.ts` (wielkie litery, bez spacji i myślników, wklejony link `/p/ABCD` daje `ABCD`), bez `maxlength`, który ucinał wklejony link. Wartość nie jest przepisywana w trakcie pisania (na Androidzie psuło to IME). Po powrocie z `rejoinParty` focus nie przeskakuje już z pola kodu na nick. Sterowanie gry startuje dopiero po lobby, a klawiatura pomija inputy, więc niczego nie przechwytuje.
- [ ] Dołączenie po wpisaniu kodu działa na desktopie i telefonie. Pole jest w `<form>`, więc Enter i „Go” na klawiaturze telefonu wysyłają je tak samo; `autocapitalize=characters`, `autocorrect=off`, `enterkeyhint=go`, font 16px (iOS nie zoomuje). Błędy po polsku: „Nie ma party o kodzie X”, „Party X jest pełne”. Zostało: sprawdzić na prawdziwym telefonie (iOS Safari i Android Chrome), potem `kanban.sh gotowe 26`.
