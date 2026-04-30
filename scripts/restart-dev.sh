#!/usr/bin/env bash
# Restart the dev environment after laptop sleep / lock / general weirdness.
# After macOS wake-from-sleep, Docker containers often need a kick, the
# Next.js dev server's file watchers can desync, and connections to
# Ollama / mongod can be left in a half-open state.
#
# Usage:
#   bash scripts/restart-dev.sh            # full smart restart
#   bash scripts/restart-dev.sh next       # just Next dev (kills :3000, restarts via dev.sh)
#   bash scripts/restart-dev.sh searxng    # just docker container
#   bash scripts/restart-dev.sh mongo      # just mongod
#   bash scripts/restart-dev.sh ollama     # just ollama
#   bash scripts/restart-dev.sh status     # report what's up, no changes

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TARGET="${1:-all}"

# ─── helpers ──────────────────────────────────────────────────────────────────

# Print a status line for one service. Args: name, "up"|"down"|"unknown", detail
status_line() {
  local name="$1" state="$2" detail="${3:-}"
  case "$state" in
    up)      printf "  ✓ %-12s %s\n" "$name" "$detail" ;;
    down)    printf "  ✗ %-12s %s\n" "$name" "$detail" ;;
    *)       printf "  ? %-12s %s\n" "$name" "$detail" ;;
  esac
}

is_listening_on() {
  lsof -ti ":$1" &>/dev/null
}

stop_port() {
  local port="$1"
  local pids
  pids=$(lsof -ti ":$port" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    # `pids` may have multiple newline-separated values
    local pidlist
    pidlist=$(echo "$pids" | tr '\n' ' ')
    echo "  stopping process on :$port (pid: $pidlist)…"
    kill -TERM $pids 2>/dev/null || true
    sleep 1
    pids=$(lsof -ti ":$port" 2>/dev/null || true)
    if [[ -n "$pids" ]]; then
      kill -KILL $pids 2>/dev/null || true
      sleep 0.5
    fi
  fi
}

# ─── individual restarts ──────────────────────────────────────────────────────

restart_searxng() {
  if ! command -v docker &>/dev/null; then
    echo "ℹ docker not installed — skipping searxng"
    return 0
  fi
  if ! docker info &>/dev/null; then
    echo "  docker daemon not running — dev.sh will boot it"
    return 0
  fi
  if docker ps -a --format '{{.Names}}' | grep -qx searxng; then
    echo "  restarting searxng container…"
    docker restart searxng &>/dev/null || true
    # health-check
    local i=0
    while (( i < 30 )); do
      curl -sf http://localhost:8888/healthz &>/dev/null && break
      sleep 1
      i=$(( i + 1 ))
    done
    if (( i < 30 )); then
      echo "✓ searxng healthy"
    else
      echo "⚠ searxng restarted but /healthz did not respond — try 'docker logs searxng'"
    fi
  else
    echo "ℹ searxng container does not exist — dev.sh will create on next run"
  fi
}

restart_mongo() {
  echo "  restarting mongod…"
  if command -v brew &>/dev/null; then
    local svc
    svc=$(brew services list 2>/dev/null | awk '/^mongodb/ { print $1 }' | head -1)
    if [[ -n "$svc" ]]; then
      brew services restart "$svc" &>/dev/null || true
      sleep 1
      if pgrep -x mongod &>/dev/null; then
        echo "✓ mongod restarted (brew service: $svc)"
        return 0
      fi
    fi
  fi
  if pgrep -x mongod &>/dev/null; then
    pkill -x mongod 2>/dev/null || true
    sleep 1
  fi
  if command -v mongod &>/dev/null; then
    mkdir -p "$HOME/data/db"
    mongod --dbpath "$HOME/data/db" --fork --logpath /tmp/mongod.log &>/dev/null \
      && echo "✓ mongod restarted (direct fork)" \
      || echo "⚠ mongod restart failed — check /tmp/mongod.log"
  else
    echo "⚠ mongod binary not on PATH"
  fi
}

restart_ollama() {
  echo "  restarting ollama…"
  if pgrep -x ollama &>/dev/null; then
    pkill -x ollama 2>/dev/null || true
    sleep 1
  fi
  if ! command -v ollama &>/dev/null; then
    echo "⚠ ollama binary not on PATH"
    return 1
  fi
  ollama serve &>/tmp/ollama.log &
  # poll the port
  local i=0
  while (( i < 20 )); do
    (echo >/dev/tcp/127.0.0.1/11434) &>/dev/null && break
    sleep 0.3
    i=$(( i + 1 ))
  done
  if (( i < 20 )); then
    echo "✓ ollama restarted"
  else
    echo "⚠ ollama started but not accepting connections on :11434"
  fi
}

# ─── status report ────────────────────────────────────────────────────────────

print_status() {
  echo "▶ Dev service status:"

  # ollama
  if pgrep -x ollama &>/dev/null \
     && (echo >/dev/tcp/127.0.0.1/11434) &>/dev/null; then
    status_line "ollama" up "pid $(pgrep -x ollama | head -1) on :11434"
  elif pgrep -x ollama &>/dev/null; then
    status_line "ollama" unknown "process up but :11434 not responding"
  else
    status_line "ollama" down "not running"
  fi

  # mongod
  if pgrep -x mongod &>/dev/null \
     && (echo >/dev/tcp/127.0.0.1/27017) &>/dev/null; then
    status_line "mongod" up "pid $(pgrep -x mongod | head -1) on :27017"
  elif pgrep -x mongod &>/dev/null; then
    status_line "mongod" unknown "process up but :27017 not responding"
  else
    status_line "mongod" down "not running"
  fi

  # docker
  if command -v docker &>/dev/null; then
    if docker info &>/dev/null; then
      status_line "docker" up "daemon reachable"
      # searxng
      if curl -sf http://localhost:8888/healthz &>/dev/null; then
        status_line "searxng" up "healthy on :8888"
      elif docker ps --format '{{.Names}}' | grep -qx searxng; then
        status_line "searxng" unknown "container running but /healthz silent"
      elif docker ps -a --format '{{.Names}}' | grep -qx searxng; then
        status_line "searxng" down "container exists but stopped"
      else
        status_line "searxng" down "container does not exist"
      fi
    else
      status_line "docker" down "daemon not running"
      status_line "searxng" down "(needs docker)"
    fi
  else
    status_line "docker" down "not installed"
    status_line "searxng" down "(needs docker)"
  fi

  # next dev
  if is_listening_on 3000; then
    local pid
    pid=$(lsof -ti :3000 2>/dev/null | head -1)
    status_line "next dev" up "pid $pid on :3000"
  else
    status_line "next dev" down "not listening on :3000"
  fi
}

# ─── main ─────────────────────────────────────────────────────────────────────

case "$TARGET" in
  status)
    print_status
    ;;

  next)
    echo "▶ Restarting Next dev server only…"
    stop_port 3000
    cd "$PROJECT_ROOT"
    exec npm run dev
    ;;

  searxng)
    echo "▶ Restarting SearXNG…"
    restart_searxng
    ;;

  mongo|mongodb)
    echo "▶ Restarting mongod…"
    restart_mongo
    ;;

  ollama)
    echo "▶ Restarting ollama…"
    restart_ollama
    ;;

  all|"")
    echo "▶ Smart-restarting dev environment…"
    echo ""
    print_status
    echo ""
    stop_port 3000
    restart_searxng
    echo ""
    echo "▶ Handing off to dev.sh for the rest…"
    echo ""
    cd "$PROJECT_ROOT"
    exec bash "$SCRIPT_DIR/dev.sh"
    ;;

  *)
    echo "Usage: $0 [all|status|next|searxng|mongo|ollama]" >&2
    echo "" >&2
    echo "  all       Full smart restart (default)" >&2
    echo "  status    Report status of all services, no changes" >&2
    echo "  next      Kill :3000 and restart Next dev only" >&2
    echo "  searxng   Restart the SearXNG docker container" >&2
    echo "  mongo     Restart mongod" >&2
    echo "  ollama    Restart ollama" >&2
    exit 1
    ;;
esac
