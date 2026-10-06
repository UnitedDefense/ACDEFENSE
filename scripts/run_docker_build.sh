#!/bin/sh
# Usage: deployment=production ./scripts/run_docker_build.sh
#        deployment=development ./scripts/run_docker_build.sh
set -e

DEPLOYMENT="${deployment:-development}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Building image for target: $DEPLOYMENT"

docker buildx build \
  --no-cache \
  --load \
  --target "$DEPLOYMENT" \
  -t "ghcr.io/chicago-joe/acdefense:${DEPLOYMENT}" \
  -f "${REPO_ROOT}/Dockerfile" \
  "${REPO_ROOT}"
