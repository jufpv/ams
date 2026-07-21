#!/usr/bin/env bash
#
# Mise à jour AMS depuis un remote/branche git, puis dépendances + migration.
#
# Usage :
#   ./update.sh --remote origin --branch main
#   ./update.sh --remote https://github.com/jufpv/ams.git --branch main
#
# Conservé : fichiers ignorés (.gitignore), settings.private.json, uploads/, DB locale.
#

set -euo pipefail

REMOTE=""
BRANCH=""
SKIP_INSTALL=0
SKIP_MIGRATE=0
SKIP_PM2=0

usage() {
  echo "Usage: $0 --remote <name-or-url> --branch <name> [options]"
  echo
  echo "Options:"
  echo "  --skip-install   Ne pas exécuter npm install"
  echo "  --skip-migrate   Ne pas exécuter npm run db:migrate"
  echo "  --skip-pm2       Ne pas redémarrer PM2 (processus ams)"
  echo "  -h, --help       Afficher cette aide"
  echo
  echo "Examples:"
  echo "  $0 --remote origin --branch main"
  echo "  $0 --remote https://github.com/jufpv/ams.git --branch main"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --remote)
      REMOTE="${2:-}"
      [[ -n "$REMOTE" ]] || { echo "Error: --remote requires a value."; exit 1; }
      shift 2
      ;;
    --branch)
      BRANCH="${2:-}"
      [[ -n "$BRANCH" ]] || { echo "Error: --branch requires a value."; exit 1; }
      shift 2
      ;;
    --skip-install)
      SKIP_INSTALL=1
      shift
      ;;
    --skip-migrate)
      SKIP_MIGRATE=1
      shift
      ;;
    --skip-pm2)
      SKIP_PM2=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$REMOTE" || -z "$BRANCH" ]]; then
  echo "Error: --remote and --branch are required."
  usage
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

if [[ ! -d ".git" ]]; then
  echo "Error: this script must run from the AMS repository root."
  exit 1
fi

if [[ ! -f "Server.js" || ! -f "package.json" ]]; then
  echo "Error: AMS project files not found (Server.js / package.json)."
  exit 1
fi

echo "Repository: $ROOT"
echo "Target: ${REMOTE}/${BRANCH}"
echo
echo "Current status:"
git status --short --branch
echo

if [[ "$REMOTE" =~ :// ]] || [[ "$REMOTE" =~ ^git@ ]]; then
  echo "Fetch from URL and hard reset tracked files to branch ${BRANCH}..."
  git fetch "$REMOTE" "$BRANCH"
  git reset --hard FETCH_HEAD
else
  echo "Fetch and hard reset tracked files to ${REMOTE}/${BRANCH}..."
  git fetch "$REMOTE"
  git reset --hard "${REMOTE}/${BRANCH}"
fi
echo

if [[ "$SKIP_INSTALL" -eq 0 ]]; then
  echo "Installing dependencies (root + api)..."
  npm install
  echo
else
  echo "Skip npm install."
  echo
fi

if [[ "$SKIP_MIGRATE" -eq 0 ]]; then
  echo "Running database migration..."
  npm run db:migrate
  echo
else
  echo "Skip db:migrate."
  echo
fi

if [[ "$SKIP_PM2" -eq 0 ]]; then
  if command -v pm2 >/dev/null 2>&1; then
    if pm2 describe ams >/dev/null 2>&1; then
      echo "Restarting PM2 process « ams »..."
      pm2 restart ams
      echo
    else
      echo "PM2 is available but no process named « ams » — skip restart."
      echo "  Tip: pm2 start ecosystem.config.cjs"
      echo
    fi
  else
    echo "PM2 not found — skip restart."
    echo
  fi
else
  echo "Skip PM2 restart."
  echo
fi

echo "Done."
echo "Note: ignored files (.gitignore), untracked files, settings.private.json,"
echo "      uploads/ and the local SQLite DB are preserved."
