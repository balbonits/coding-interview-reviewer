#!/usr/bin/env bash
# Start MongoDB (if not already running) then launch the Next.js dev server.
set -euo pipefail

# ─── helpers ──────────────────────────────────────────────────────────────────

die() { echo "✗ $*" >&2; exit 1; }

# Poll until mongod accepts TCP connections (max ~6 s).
wait_for_mongo() {
  local i=0
  while (( i < 20 )); do
    if command -v mongosh &>/dev/null; then
      mongosh --quiet --eval "db.runCommand({ping:1})" \
        --host 127.0.0.1:27017 &>/dev/null && return 0
    else
      # fallback: bash TCP probe (works without mongosh)
      (echo >/dev/tcp/127.0.0.1/27017) &>/dev/null && return 0
    fi
    sleep 0.3
    i=$(( i + 1 ))
  done
  return 1
}

# ─── mongod check / start ─────────────────────────────────────────────────────

if pgrep -x mongod &>/dev/null; then
  echo "✓ mongod already running"
else
  echo "  mongod not running — starting…"
  STARTED=false

  # 1) Homebrew service (preferred on macOS — survives reboots)
  if command -v brew &>/dev/null; then
    MONGO_SVC=$(brew services list 2>/dev/null \
      | awk '/^mongodb/ { print $1 }' | head -1)
    if [[ -n "$MONGO_SVC" ]]; then
      brew services start "$MONGO_SVC"
      STARTED=true
    fi
  fi

  # 2) Direct mongod binary (any install method)
  if [[ "$STARTED" == false ]] && command -v mongod &>/dev/null; then
    mkdir -p "$HOME/data/db"
    mongod --dbpath "$HOME/data/db" \
           --fork --logpath /tmp/mongod.log \
      || die "mongod --fork failed. Check /tmp/mongod.log for details."
    STARTED=true
  fi

  if [[ "$STARTED" == false ]]; then
    die "mongod not found on PATH and no Homebrew service detected.

Install MongoDB:
  brew tap mongodb/brew && brew install mongodb-community

Or download from https://www.mongodb.com/try/download/community"
  fi

  wait_for_mongo \
    || die "mongod started but is not accepting connections on :27017"
  echo "✓ mongod started"
fi

# ─── Next.js dev server ───────────────────────────────────────────────────────
echo "  starting Next.js…"
exec npm run dev
