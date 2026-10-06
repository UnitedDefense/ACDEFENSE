#!/usr/bin/env sh
# Install node_modules on the host filesystem (for LSP type visibility)
# using Docker so no local Node.js is required.
# Files are created with the current user's UID/GID to avoid permission issues.
#
# Usage: ./scripts/install-deps.sh

set -e

PROJ="$(cd "$(dirname "$0")/.." && pwd)"

docker run --rm \
  -v "$PROJ:/app" \
  -w /app \
  -e HOME=/tmp \
  -e npm_config_cache=/tmp/.npm \
  -u "$(id -u):$(id -g)" \
  node:20-alpine \
  npm install --legacy-peer-deps

echo "node_modules installed with owner $(id -u):$(id -g)"
