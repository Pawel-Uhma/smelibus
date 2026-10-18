#!/usr/bin/env python3
"""Podgląd pracy agentów na żywo: kto co robi, kanban, aktywność, ryzyko konfliktów.

    python3 scripts/dashboard.py            ->  http://localhost:8787
    --interval 10   co ile sekund git fetch (domyślnie 10)
    --port 8787     port
    --host 0.0.0.0  udostępnij w sieci lokalnej (np. na rzutnik albo dla zespołu)
    --remote URL    inne repo niż origin tego katalogu

Czyta tylko z własnej kopii repo w ~/.cache/smelibus-dashboard (git fetch co --interval s),
więc nie dotyka Twojego katalogu roboczego ani pracy agentów. Widać to, co jest wypchnięte na main.
Bez zależności: sam Python 3 i git.
"""
import argparse
import hashlib
import json
import re
import subprocess
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REF = "refs/heads/main"
HOT_WINDOW = 90 * 60      # pliki ruszane przez 2+ osoby w tym oknie = ryzyko konfliktu
STALE_AFTER = 45 * 60     # karta w toku bez commitów właściciela dłużej niż to = może porzucona
CONTRACT_PATHS = ("app/src/shared/", "app/src/main.ts")


def git(repo, *args, data=None):
    return subprocess.run(["git", *args], cwd=repo, input=data, capture_output=True, check=True).stdout


def cat_many(repo, paths):
    """Treść wielu plików z main jednym wywołaniem git cat-file --batch."""
    if not paths:
        return {}
    out = git(repo, "cat-file", "--batch", data="".join(f"{REF}:{p}\n" for p in paths).encode())
    res, i = {}, 0
    for p in paths:
        nl = out.index(b"\n", i)
        header = out[i:nl].decode()
        i = nl + 1
        if header.endswith("missing"):
            continue
        size = int(header.split()[2])
        res[p] = out[i:i + size].decode("utf-8", "replace")
        i += size + 1
    return res


def md_table(text, section):
    """Wiersze tabeli z sekcji „## section” jako listy komórek (bez nagłówka i separatora)."""
    rows, on = [], False
    for line in text.splitlines():
        if line.startswith("## "):
            on = line[3:].strip() == section
            continue
        if on and line.startswith("|"):
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if set(cells[0]) <= set("-") or cells[0] in ("Osoba", "Kod"):
                continue
            rows.append(cells)
    return rows


def parse_card(path, text):
    col, name = path.split("/")[1], path.split("/")[-1][:-3]
    fields = dict(re.findall(r"^(obszar|kto|zależy od|ścieżki):[ \t]*(.*)$", text, re.M))
    title = re.search(r"^# (.+)$", text, re.M)
    goal = re.search(r"## Cel\s*\n+(.+?)(?:\n\n|\n##|$)", text, re.S)
    deps = [d for d in re.findall(r"\d+", fields.get("zależy od", ""))]
    return {
        "id": name.split("-")[0], "name": name, "col": col,
        "title": title.group(1).strip() if title else name,
        "area": fields.get("obszar", "-").strip(), "who": fields.get("kto", "-").strip(),
        "deps": [d.zfill(3) for d in deps], "paths": fields.get("ścieżki", "").strip(),
        "goal": goal.group(1).strip() if goal else "",
        "checks_done": len(re.findall(r"^- \[[xX]\]", text, re.M)),
        "checks_total": len(re.findall(r"^- \[[ xX]\]", text, re.M)),
        "questions": [q.strip() for q in re.findall(r"^pytanie:(.*)$", text, re.M)],
    }


def parse_log(repo, n=120):
    raw = git(repo, "log", REF, f"-n{n}", "--format=%x1e%H%x1f%an%x1f%at%x1f%s", "--numstat").decode("utf-8", "replace")
    commits = []
    for chunk in raw.split("\x1e")[1:]:
        lines = chunk.strip("\n").split("\n")
        sha, author, at, subject = lines[0].split("\x1f", 3)
        files, add, rem = [], 0, 0
        for ln in lines[1:]:
            parts = ln.split("\t")
            if len(parts) != 3:
                continue
            a, d, p = parts
            add += int(a) if a.isdigit() else 0
            rem += int(d) if d.isdigit() else 0
            files.append(p)
        kanban = re.match(r"kanban: (.+?) bierze (\S+)", subject)
        commits.append({
            "sha": sha[:7], "author": author, "at": int(at), "subject": subject, "files": files,
            "add": add, "del": rem, "kanban": {"who": kanban.group(1), "card": kanban.group(2)} if kanban else None,
            "code": any(f.startswith("app/") for f in files),
        })
    return commits


def card_moves(repo):
    """Kiedy karta trafiła do swojej obecnej kolumny: {ścieżka: epoch}."""
    raw = git(repo, "log", REF, "-n300", "-M", "--format=%x1e%at", "--name-status", "--", "tasks/").decode("utf-8", "replace")
    moved = {}
    for chunk in raw.split("\x1e")[1:]:
        lines = chunk.strip("\n").split("\n")
        at = int(lines[0])
        for ln in lines[1:]:
            parts = ln.split("\t")
            if parts[0][:1] in ("A", "R"):
                moved.setdefault(parts[-1], at)
    return moved


def build_state(repo):
    now = int(time.time())
    files = git(repo, "ls-tree", "-r", "--name-only", REF).decode().split("\n")
    card_paths = sorted(f for f in files if re.match(r"tasks/(todo|doing|done)/\d+.*\.md$", f))
    docs = cat_many(repo, card_paths + ["docs/zespol.md", "docs/DECISIONS.md"])
    team_md, decisions_md = docs.get("docs/zespol.md", ""), docs.get("docs/DECISIONS.md", "")

    moves = card_moves(repo)
    cards = []
    for p in card_paths:
        if p in docs:
            c = parse_card(p, docs[p])
            c["since"] = moves.get(p)
            cards.append(c)
    by_id = {c["id"]: c for c in cards}
    for c in cards:
        c["blocked_by"] = [d for d in c["deps"] if d in by_id and by_id[d]["col"] != "done"]

    areas = [{"code": r[0], "scope": r[1] if len(r) > 1 else "", "paths": r[2] if len(r) > 2 else ""}
             for r in md_table(team_md, "Obszary")]
    team = [{"name": r[0], "git": r[1], "area": r[2] if len(r) > 2 else "-"} for r in md_table(team_md, "Osoby")]
    commits = parse_log(repo)
    known = {p["git"] for p in team}
    for a in dict.fromkeys(c["author"] for c in commits if now - c["at"] < 86400):
        if a not in known:
            team.append({"name": a, "git": a, "area": "-", "outside": True})

    people = []
    for p in team:
        mine = [c for c in commits if c["author"] == p["git"]]
        hour = [c for c in mine if now - c["at"] < 3600]
        recent_files = []
        for c in mine:
            if now - c["at"] > HOT_WINDOW:
                break
            recent_files += [f for f in c["files"] if f.startswith("app/") and f not in recent_files]
        doing = [c for c in cards if c["col"] == "doing" and c["who"] == p["git"]]
        last = mine[0]["at"] if mine else None
        if doing and last and now - last < 20 * 60:
            status = "pracuje"
        elif doing and last and now - last < STALE_AFTER:
            status = "cisza"
        elif doing:
            status = "długo cicho"
        else:
            status = "bez karty"
        people.append({
            **p, "status": status, "doing": [c["id"] for c in doing],
            "last": mine[0] if mine else None,
            "last_code": next((c for c in mine if c["code"]), None),
            "hour_commits": len(hour), "hour_add": sum(c["add"] for c in hour), "hour_del": sum(c["del"] for c in hour),
            "recent_files": recent_files[:6],
            "done_count": sum(1 for c in cards if c["col"] == "done" and c["who"] == p["git"]),
        })

    # Uwaga: pliki ruszane przez kilka osób, cisza na kartach w toku, pytania, zmiany kontraktu
    touched = {}
    for c in commits:
        if now - c["at"] > HOT_WINDOW:
            break
        for f in c["files"]:
            if f.startswith(("app/", "server/")) and "=>" not in f and not f.endswith(".md"):
                touched.setdefault(f, set()).add(c["author"])
    alerts = []
    for f, who in sorted(touched.items()):
        if len(who) > 1:
            alerts.append({"kind": "hot", "text": f, "who": sorted(who)})
    last_by = {p["git"]: (p["last"]["at"] if p["last"] else None) for p in people}
    for c in cards:
        if c["col"] == "doing":
            ref = max(filter(None, [last_by.get(c["who"]), c["since"]]), default=None)
            if ref and now - ref > STALE_AFTER:
                alerts.append({"kind": "stale", "card": c["id"], "text": c["title"], "who": [c["who"]], "at": ref})
        for q in c["questions"]:
            alerts.append({"kind": "question", "card": c["id"], "text": q, "who": [c["who"]]})
    for c in commits:
        if now - c["at"] > 3 * 3600:
            break
        if any(f.startswith(CONTRACT_PATHS) for f in c["files"]):
            alerts.append({"kind": "contract", "text": c["subject"], "who": [c["author"]], "at": c["at"], "sha": c["sha"]})

    decisions = re.findall(r"^### (.+)$", decisions_md, re.M)[-5:][::-1]
    total = len(cards)
    return {
        "now": now, "head": commits[0]["sha"] if commits else None, "head_at": commits[0]["at"] if commits else None,
        "cards": cards, "people": people, "areas": areas, "alerts": alerts,
        "commits": commits[:40], "decisions": decisions,
        "progress": {"done": sum(c["col"] == "done" for c in cards),
                     "doing": sum(c["col"] == "doing" for c in cards), "total": total},
    }


class Watcher(threading.Thread):
    def __init__(self, remote, interval):
        super().__init__(daemon=True)
        self.remote, self.interval = remote, interval
        key = hashlib.sha1(remote.encode()).hexdigest()[:10]
        self.repo = Path.home() / ".cache" / "smelibus-dashboard" / f"{key}.git"
        self.state, self.error, self.fetched_at, self.lock = None, None, None, threading.Lock()

    def tick(self):
        if not (self.repo / "HEAD").exists():
            self.repo.parent.mkdir(parents=True, exist_ok=True)
            subprocess.run(["git", "clone", "-q", "--mirror", self.remote, str(self.repo)], check=True, capture_output=True)
        else:
            git(self.repo, "fetch", "-q", "--prune", "origin")
        state = build_state(self.repo)
        with self.lock:
            self.state, self.error, self.fetched_at = state, None, time.time()

    def run(self):
        while True:
            try:
                self.tick()
            except Exception as e:  # sieć padła albo repo w dziwnym stanie: pokaż ostatni stan i błąd
                msg = e.stderr.decode(errors="replace").strip() if isinstance(e, subprocess.CalledProcessError) and e.stderr else str(e)
                with self.lock:
                    self.error = msg[-300:]
            time.sleep(self.interval)

    def snapshot(self):
        with self.lock:
            return {"state": self.state, "error": self.error, "fetched_at": self.fetched_at,
                    "interval": self.interval, "remote": self.remote}


def make_handler(watcher, page):
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path.startswith("/api/state"):
                body, ctype = json.dumps(watcher.snapshot(), ensure_ascii=False).encode(), "application/json"
            elif self.path in ("/", "/index.html"):
                body, ctype = page, "text/html"
            else:
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header("Content-Type", f"{ctype}; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *args):
            pass
    return Handler


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--port", type=int, default=8787)
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--interval", type=float, default=10)
    ap.add_argument("--remote")
    args = ap.parse_args()
    remote = args.remote or git(ROOT, "remote", "get-url", "origin").decode().strip()

    watcher = Watcher(remote, args.interval)
    print(f"Pobieram {remote} ...")
    try:
        watcher.tick()
    except Exception as e:
        print(f"Pierwszy fetch nie wyszedł ({e}), spróbuję ponownie w tle.")
    watcher.start()
    page = (Path(__file__).with_name("dashboard.html")).read_bytes()
    server = ThreadingHTTPServer((args.host, args.port), make_handler(watcher, page))
    print(f"Panel: http://localhost:{args.port}  (fetch co {args.interval:g} s, Ctrl+C kończy)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
