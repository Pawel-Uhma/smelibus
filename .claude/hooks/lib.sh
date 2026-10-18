# Wspólne funkcje hooków: czytanie tabel z docs/zespol.md. Bez jq, działa na Linuksie, macOS i WSL.
dir="${CLAUDE_PROJECT_DIR:-$(pwd)}"
team_file="$dir/docs/zespol.md"
who="$(git -C "$dir" config user.name 2>/dev/null || whoami)"

# timeout nie zawsze jest na macOS; wtedy odpalamy bez limitu (limit i tak ma hook w settings.json)
t() { if command -v timeout >/dev/null 2>&1; then timeout "$@"; else shift; "$@"; fi; }

# Wiersze tabeli z sekcji „## $1” (3 kolumny, rozdzielone tabem), bez nagłówka i separatora
section_rows() {
  awk -F'|' -v s="## $1" '/^## / { on = ($0 == s); next }
    on && /^\|/ {
      for (i = 2; i <= 4; i++) gsub(/^[ \t]+|[ \t]+$/, "", $i)
      if ($2 ~ /^-+$/ || $2 == "Osoba" || $2 == "Kod") next
      print $2 "\t" $3 "\t" $4
    }' "$team_file" 2>/dev/null
}

# Mój wiersz z „Osoby”: osoba<TAB>git<TAB>obszar
my_row() { section_rows Osoby | awk -F'\t' -v w="$who" '$2 == w { print; exit }'; }

# Wiersz obszaru z „Obszary”: kod<TAB>zakres<TAB>ścieżki
area_row() { section_rows Obszary | awk -F'\t' -v a="$1" '$1 == a { print; exit }'; }
