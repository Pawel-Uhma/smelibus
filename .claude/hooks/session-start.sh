#!/usr/bin/env bash
# Na starcie sesji: git pull (gdy drzewo czyste), potem mówi agentowi, kim jest jego człowiek,
# jaki ma obszar, co ostatnio wypchnęli inni i jak wygląda kanban.
set -uo pipefail
. "${CLAUDE_PROJECT_DIR:-$(pwd)}/.claude/hooks/lib.sh"

echo "## Kontekst zespołu (zasady: AGENTS.md)"
echo "git user.name: $who"

row="$(my_row)"
if [ -n "$row" ]; then
  IFS=$'\t' read -r name _ area <<<"$row"
  if [ -z "$area" ] || [ "$area" = "-" ]; then
    echo "Osoba: $name. Obszar nieprzypisany: zapytaj użytkownika, który bierze (docs/zespol.md, tabela Obszary; sprawdź, które są już zajęte), wpisz go i wypchnij."
  else
    IFS=$'\t' read -r _ scope paths <<<"$(area_row "$area")"
    echo "Osoba: $name. Obszar: $area ($scope). Ścieżki w app/src/: $paths"
  fi
else
  echo "Nie rozpoznano osoby: brak wiersza z git user.name „$who” w docs/zespol.md (tabela Osoby)."
  echo "Zapytaj użytkownika, kim jest, i popraw wiersz (albo niech ustawi git config user.name)."
fi

# Git: świeży main
if git -C "$dir" remote get-url origin >/dev/null 2>&1; then
  dirty="$(git -C "$dir" status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
  if [ "$dirty" = "0" ]; then
    t 10 git -C "$dir" pull --rebase -q 2>/dev/null && echo "git pull: OK, masz najnowszy main."
  else
    t 6 git -C "$dir" fetch -q origin 2>/dev/null
    behind="$(git -C "$dir" rev-list --count HEAD..origin/main 2>/dev/null || echo 0)"
    echo "Niezacommitowanych plików: $dirty. Na origin/main czeka $behind nowych commitów: zacommituj swoje i zrób git pull --rebase."
  fi
  echo ""
  echo "Ostatnie commity na main:"
  git -C "$dir" log origin/main -8 --format='  %h %an, %ar: %s' 2>/dev/null
fi

# Kanban: cała tablica (w toku wszystkich, do zrobienia z adnotacją obszaru)
if [ -x "$dir/scripts/kanban.sh" ]; then
  echo ""
  echo "Kanban (scripts/kanban.sh tablica):"
  "$dir/scripts/kanban.sh" tablica 2>/dev/null | head -40
fi
exit 0
