#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/src"
DIST="$ROOT/dist"
ZIP_NAME="ai-slop-detector.zip"

# ── Colors ───────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[build]${NC} $*"; }
ok()   { echo -e "${GREEN}[  ok ]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn ]${NC} $*"; }
err()  { echo -e "${RED}[error]${NC} $*" >&2; }

# ── Commands ─────────────────────────────────────────────────────────

cmd_build() {
  log "Copying src/ → dist/"
  rm -rf "$DIST"
  mkdir -p "$DIST"
  cp -r "$SRC"/* "$DIST"/

  # Validate manifest exists
  if [[ ! -f "$DIST/manifest.json" ]]; then
    err "manifest.json not found in dist/"
    exit 1
  fi

  # Validate all files referenced in manifest exist
  local missing=0
  for f in $(grep -oP '"[^"]+\.(js|css|html|png)"' "$DIST/manifest.json" | tr -d '"'); do
    if [[ ! -f "$DIST/$f" ]]; then
      err "manifest.json references '$f' but it doesn't exist in dist/"
      missing=1
    fi
  done
  if [[ $missing -eq 1 ]]; then
    exit 1
  fi

  ok "Build complete → dist/"
  echo ""
  echo "  To load in Chrome:"
  echo "    1. Go to chrome://extensions"
  echo "    2. Enable 'Developer mode'"
  echo "    3. Click 'Load unpacked'"
  echo "    4. Select the dist/ directory"
  echo ""
}

cmd_package() {
  cmd_build
  log "Packaging dist/ → $ZIP_NAME"
  cd "$DIST"
  zip -r "$ROOT/$ZIP_NAME" . -x ".*" > /dev/null
  cd "$ROOT"
  local size
  size=$(du -h "$ZIP_NAME" | cut -f1)
  ok "Package complete → $ZIP_NAME ($size)"
}

cmd_clean() {
  log "Cleaning build artifacts"
  rm -rf "$DIST"
  rm -f "$ROOT/$ZIP_NAME"
  ok "Clean"
}

cmd_watch() {
  # Try fswatch (macOS), inotifywait (Linux), or fall back to polling
  cmd_build

  if command -v fswatch &> /dev/null; then
    log "Watching src/ for changes (fswatch)… Ctrl+C to stop"
    fswatch -o "$SRC" | while read -r; do
      log "Change detected, rebuilding…"
      cmd_build
    done
  elif command -v inotifywait &> /dev/null; then
    log "Watching src/ for changes (inotifywait)… Ctrl+C to stop"
    while true; do
      inotifywait -r -e modify,create,delete "$SRC" --quiet
      log "Change detected, rebuilding…"
      cmd_build
    done
  else
    warn "Neither fswatch nor inotifywait found. Falling back to polling (2s)."
    log "Watching src/ for changes… Ctrl+C to stop"
    local last_hash=""
    while true; do
      local hash
      hash=$(find "$SRC" -type f -exec md5sum {} + 2>/dev/null | sort | md5sum)
      if [[ "$hash" != "$last_hash" && -n "$last_hash" ]]; then
        log "Change detected, rebuilding…"
        cmd_build
      fi
      last_hash="$hash"
      sleep 2
    done
  fi
}

cmd_lint() {
  log "Running basic checks…"
  local issues=0

  # Check manifest version
  local mv
  mv=$(grep -o '"manifest_version": [0-9]*' "$SRC/manifest.json" | grep -o '[0-9]*')
  if [[ "$mv" != "3" ]]; then
    warn "manifest_version is $mv, expected 3"
    issues=$((issues + 1))
  fi

  # Check for console.log left in source
  local log_lines
  log_lines=$(grep -rn 'console\.log' "$SRC"/*.js 2>/dev/null || true)
  local logs
  logs=$(echo "$log_lines" | grep -c . 2>/dev/null || true)
  if [[ -n "$log_lines" && "$logs" -gt 0 ]]; then
    warn "Found $logs console.log statement(s) in source:"
    echo "$log_lines" | sed 's/^/    /'
    issues=$((issues + 1))
  fi

  # Check for TODO/FIXME/HACK
  local todos
  todos=$(grep -rn 'TODO\|FIXME\|HACK' "$SRC"/*.js "$SRC"/*.css 2>/dev/null || true)
  local todo_count
  todo_count=$(echo "$todos" | grep -c . 2>/dev/null || true)
  if [[ -n "$todos" && "$todo_count" -gt 0 ]]; then
    warn "Found $todo_count TODO/FIXME/HACK comment(s):"
    echo "$todos" | sed 's/^/    /'
    issues=$((issues + 1))
  fi

  # Basic JS syntax check (if node available)
  if command -v node &> /dev/null; then
    for jsfile in "$SRC"/*.js; do
      if ! node --check "$jsfile" 2>/dev/null; then
        err "Syntax error in $(basename "$jsfile")"
        issues=$((issues + 1))
      fi
    done
    ok "JS syntax OK"
  else
    warn "Node.js not found, skipping syntax check"
  fi

  if [[ $issues -eq 0 ]]; then
    ok "All checks passed"
  else
    warn "$issues issue(s) found"
  fi
}

# ── Main ─────────────────────────────────────────────────────────────

case "${1:-build}" in
  build)   cmd_build ;;
  package) cmd_package ;;
  clean)   cmd_clean ;;
  watch)   cmd_watch ;;
  lint)    cmd_lint ;;
  *)
    echo "Usage: $0 {build|package|clean|watch|lint}"
    exit 1
    ;;
esac
