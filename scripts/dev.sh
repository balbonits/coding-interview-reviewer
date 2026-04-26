#!/usr/bin/env bash
# Start MongoDB + Ollama (if not already running) then launch the Next.js dev server.
set -euo pipefail

# ─── helpers ──────────────────────────────────────────────────────────────────

die() { echo "✗ $*" >&2; exit 1; }

# Poll until Ollama accepts connections on :11434 (max ~6 s).
wait_for_ollama() {
  local i=0
  while (( i < 20 )); do
    (echo >/dev/tcp/127.0.0.1/11434) &>/dev/null && return 0
    sleep 0.3
    i=$(( i + 1 ))
  done
  return 1
}

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

# ─── ollama check / start ─────────────────────────────────────────────────────

OLLAMA_MODEL="${OLLAMA_INTERVIEW_MODEL:-qwen2.5:14b}"

if ! command -v ollama &>/dev/null; then
  die "ollama not found on PATH.

Install Ollama:
  brew install ollama

Or download from https://ollama.com/download"
fi

if pgrep -x ollama &>/dev/null; then
  echo "✓ ollama already running"
else
  echo "  ollama not running — starting…"
  ollama serve &>/tmp/ollama.log &
  wait_for_ollama \
    || die "ollama started but is not accepting connections on :11434"
  echo "✓ ollama started"
fi

# Ensure the required model is pulled.
if ollama list 2>/dev/null | awk '{print $1}' | grep -qx "${OLLAMA_MODEL}"; then
  echo "✓ model ${OLLAMA_MODEL} ready"
else
  # Warn if RAM is likely too low for the default 14B model.
  if [[ "${OLLAMA_MODEL}" == "qwen2.5:14b" ]]; then
    RAM_GB=0
    if [[ "$(uname)" == "Darwin" ]]; then
      RAM_GB=$(sysctl -n hw.memsize 2>/dev/null | awk '{printf "%d", $1/1024/1024/1024}')
    elif [[ -f /proc/meminfo ]]; then
      RAM_GB=$(awk '/MemTotal/{printf "%d", $2/1024/1024}' /proc/meminfo)
    fi
    if (( RAM_GB > 0 && RAM_GB < 16 )); then
      echo ""
      echo "⚠️  RAM warning: you have ~${RAM_GB} GB RAM."
      echo "   qwen2.5:14b needs ~10 GB free to run comfortably."
      echo ""
      echo "   Recommended alternatives:"
      echo "     8–16 GB → qwen2.5:7b  (~4.5 GB):  OLLAMA_INTERVIEW_MODEL=qwen2.5:7b"
      echo "     < 8 GB  → qwen2.5:3b  (~2 GB):    OLLAMA_INTERVIEW_MODEL=qwen2.5:3b"
      echo ""
      echo "   Press Enter to pull ${OLLAMA_MODEL} anyway, or Ctrl-C to abort."
      read -r
    fi
  fi

  echo "  model ${OLLAMA_MODEL} not found — pulling (this may take a while)…"
  ollama pull "${OLLAMA_MODEL}" \
    || die "Failed to pull ${OLLAMA_MODEL}. Check your internet connection."
  echo "✓ model ${OLLAMA_MODEL} pulled"
fi

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
