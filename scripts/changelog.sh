#!/usr/bin/env bash
# Dziennik zmian widoczny w grze (znaczek wersji w rogu ekranu startowego).
#   changelog.sh "dodano latarnie, które świecą w nocy"
# Dopisuje linię „data UTC | osoba | tekst” na końcu app/src/changelog.txt (bez commita,
# idzie razem z kodem). Każda linia podbija wersję o jeden.
set -euo pipefail
root="$(git rev-parse --show-toplevel)"
CLAUDE_PROJECT_DIR="$root" . "$root/.claude/hooks/lib.sh"
text="${*:-}"
[ -z "$text" ] && { echo "Podaj krótki opis zmiany, np.: changelog.sh \"dodano latarnie, które świecą w nocy\"" >&2; exit 1; }
[[ "$text" == *"|"* ]] && { echo "Bez znaku | w opisie." >&2; exit 1; }
name="$(my_row | cut -f1)"
[ -z "$name" ] && name="$who"
file="$root/app/src/changelog.txt"
echo "$(date -u +%Y-%m-%dT%H:%MZ) | $name | $text" >> "$file"
echo "v0.$(grep -c '|' "$file"): $text"
