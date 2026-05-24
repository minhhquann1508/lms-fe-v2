#!/usr/bin/env bash
set -euo pipefail

APP_NAME="lms-fe-v2"
COMPOSE_URL="https://raw.githubusercontent.com/minhhquann1508/lms-fe-v2/develop/docker-compose.yml"
COMPOSE_FILE="docker-compose.yml"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$ROOT_DIR"

step() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1"
}

fail() {
  echo "ERROR: $1" >&2
  exit 1
}

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose -f "$COMPOSE_FILE" "$@"
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose -f "$COMPOSE_FILE" "$@"
  else
    fail "Docker Compose is not installed."
  fi
}

step "Checking Docker"
command -v docker >/dev/null 2>&1 || fail "Docker is not installed."
docker info >/dev/null 2>&1 || fail "Docker daemon is not running or current user cannot access it."

step "Checking Docker Compose"
compose version >/dev/null

step "Loading .env if present"
if [ -f ".env" ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
else
  echo "No .env found. Using default IMAGE_TAG=latest and FRONTEND_PORT=3000."
fi

step "Validating deploy variables"
export IMAGE_TAG="${IMAGE_TAG:-latest}"
export FRONTEND_PORT="${FRONTEND_PORT:-3000}"
echo "IMAGE_TAG=$IMAGE_TAG"
echo "FRONTEND_PORT=$FRONTEND_PORT"

step "Downloading latest compose file"
tmp_file="$(mktemp)"
curl -fsSL "$COMPOSE_URL" -o "$tmp_file" || fail "Cannot download $COMPOSE_URL"
mv "$tmp_file" "$COMPOSE_FILE"

step "Pulling Docker image"
compose pull

step "Starting $APP_NAME"
compose up -d --remove-orphans

step "Container status"
compose ps
