#!/usr/bin/env bash
# Runs the devcontainer CLI without installing Node on the host:
# the CLI lives in a small helper image and drives the host Docker via its socket.
#
#   ./scripts/devc.sh up              # build + start the dev container (.devcontainer/)
#   ./scripts/devc.sh exec <cmd...>   # run a command in it, e.g. exec npm run check
#   ./scripts/devc.sh dev             # vite dev server -> http://localhost:5173
#   ./scripts/devc.sh down            # stop and remove the container
#
# A local `devcontainer` binary is used when present.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cli_image="smelibus-devcontainer-cli:0.89"

devcontainer_cli() {
  if command -v devcontainer >/dev/null; then devcontainer "$@"; return; fi
  if ! docker image inspect "$cli_image" >/dev/null 2>&1; then
    docker build -q -t "$cli_image" - >/dev/null <<'EOF'
FROM docker:29-cli
RUN apk add --no-cache nodejs npm bash && npm install -g @devcontainers/cli@0.89.0
EOF
  fi
  # Same absolute path inside the helper, so bind mounts resolve on the host.
  docker run --rm -i -v /var/run/docker.sock:/var/run/docker.sock \
    -v "$root:$root" -w "$root" "$cli_image" devcontainer "$@"
}

container_id() {
  docker ps -q --filter "label=devcontainer.local_folder=$root"
}

case "${1:-}" in
  up)   devcontainer_cli up --workspace-folder "$root" ;;
  exec) shift; devcontainer_cli exec --workspace-folder "$root" bash -lc "cd app && $*" ;;
  dev)
    id="$(container_id)"; [ -n "$id" ] || { echo "Najpierw: $0 up" >&2; exit 1; }
    echo "Vite: http://localhost:5173 (Ctrl+C kończy)"
    devcontainer_cli exec --workspace-folder "$root" bash -lc "cd app && npm run dev -- --host 0.0.0.0" ;;
  down)
    id="$(container_id)"; [ -n "$id" ] && docker rm -f "$id" >/dev/null; echo "Zatrzymany." ;;
  *) sed -n '2,9p' "$0"; exit 1 ;;
esac
