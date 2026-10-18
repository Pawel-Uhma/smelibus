#!/usr/bin/env bash
# Kanban w repo: jedno zadanie = jeden plik w tasks/todo, tasks/doing albo tasks/done.
#   kanban.sh tablica [obszar]     pokazuje tablicę
#   kanban.sh nowe <obszar> <tytuł> tworzy kartę w todo (bez commita, wypchniesz ją ze swoją pracą)
#   kanban.sh wez <nr>             zajmuje kartę: przenosi do doing, commit i push od razu (kto pierwszy, ten lepszy)
#   kanban.sh gotowe <nr>          przenosi kartę do done (bez commita, idzie razem z kodem w /oddaj)
set -euo pipefail
root="$(git rev-parse --show-toplevel)"
cd "$root"
who="$(git config user.name || whoami)"
mkdir -p tasks/todo tasks/doing tasks/done

field() { sed -n "s/^$2:[[:space:]]*//p" "$1" | head -1; }
title() { sed -n '1s/^# //p' "$1"; }

# Jedna karta o numerze (albo fragmencie nazwy) $2 w kolumnie $1
find_card() {
  local hits
  if [[ "$2" =~ ^[0-9]+$ ]]; then
    hits="$(find "tasks/$1" -maxdepth 1 -name "*.md" | grep -E "/0*$((10#$2))-" | head -2 || true)"
  else
    hits="$(find "tasks/$1" -maxdepth 1 -name "*$2*.md" | head -2)"
  fi
  [ -z "$hits" ] && { echo "Brak karty „$2” w tasks/$1." >&2; exit 1; }
  [ "$(echo "$hits" | wc -l)" -gt 1 ] && { echo "Kilka kart pasuje do „$2”, podaj dłuższy fragment nazwy:" >&2; echo "$hits" >&2; exit 1; }
  echo "$hits"
}

case "${1:-tablica}" in
  tablica)
    for col in todo doing done; do
      case $col in todo) echo "## DO ZROBIENIA";; doing) echo "## W TOKU";; done) echo "## ZROBIONE (ostatnie 5)";; esac
      files="$(ls tasks/$col/*.md 2>/dev/null || true)"
      [ "$col" = done ] && files="$(echo "$files" | tail -5)"
      for f in $files; do
        a="$(field "$f" obszar)"; [ -n "${2:-}" ] && [ "$a" != "$2" ] && continue
        extra="[$a]"
        [ "$col" = doing ] && extra="[$a] ← $(field "$f" kto)"
        d="$(field "$f" "zależy od")"; [ "$col" = todo ] && [ -n "$d" ] && [ "$d" != "-" ] && extra="$extra (zależy od: $d)"
        echo "  $(basename "$f" .md)  $(title "$f")  $extra"
      done
    done
    ;;
  nowe)
    area="${2:?podaj obszar}"; t="${3:?podaj tytuł}"
    last="$(ls tasks/*/ 2>/dev/null | grep -oE '^[0-9]+' | sort -n | tail -1 || true)"
    n="$(printf '%03d' $((10#${last:-0} + 1)))"
    slug="$(echo "$t" | { iconv -f utf-8 -t ascii//TRANSLIT 2>/dev/null || true; } | tr 'A-Z' 'a-z' | tr -cs 'a-z0-9' '-' | sed 's/^-//; s/-$//' | cut -c1-40)"
    f="tasks/todo/$n-${slug:-zadanie}.md"
    printf '# %s\n\nobszar: %s\nkto: -\nzależy od: -\nścieżki: -\n\n## Cel\n\n## Gotowe, gdy\n\n- [ ] \n' "$t" "$area" > "$f"
    echo "$f"
    ;;
  wez)
    git pull --rebase --autostash -q
    f="$(find_card todo "${2:?podaj numer}")"
    name="$(basename "$f")"
    sed -i.bak "s/^kto:.*/kto: $who/" "$f" && rm -f "$f.bak"
    git add "$f" && git mv "$f" "tasks/doing/$name"
    git commit -q -m "kanban: $who bierze $(basename "$name" .md)" -- "$f" "tasks/doing/$name"
    if ! git push -q 2>/dev/null; then
      if ! git pull --rebase --autostash -q >/dev/null 2>&1; then
        git rebase --abort 2>/dev/null || true
        git reset -q --keep HEAD~1
        git pull --rebase --autostash -q
        echo "Ktoś był szybszy: $name jest już zajęta. Weź inną (kanban.sh tablica)." >&2; exit 1
      fi
      git push -q
    fi
    echo "Twoja: tasks/doing/$name"
    ;;
  gotowe)
    f="$(find_card doing "${2:?podaj numer}")"
    git mv "$f" "tasks/done/$(basename "$f")"
    echo "Przeniesiona do tasks/done/ (wypchnij razem z kodem)."
    ;;
  *) sed -n '2,7p' "$0"; exit 1 ;;
esac
