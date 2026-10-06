#!/bin/bash
set -e

# ACDefense Website Deployment Script
# Build locally (amd64) → push to GHCR → SSH pull + recreate on droplet
# Usage: ./deploy.sh [droplet_ip] [tag]

DROPLET_IP="${1:-45.55.235.37}"
TAG="${2:-production}"
DROPLET_USER="root"
DEPLOY_PATH="/root/acdefense-website"
SSH_KEY="${SSH_KEY:-~/.ssh/id_ed25519-doctl}"
IMAGE="ghcr.io/chicago-joe/acdefense:${TAG}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 ACDefense Website Deployment${NC}"
echo "Image:  $IMAGE"
echo "Target: $DROPLET_USER@$DROPLET_IP:$DEPLOY_PATH"
echo ""

# Step 1: Build locally for linux/amd64
echo -e "${YELLOW}[1/4]${NC} Building image for linux/amd64..."
docker buildx build --platform linux/amd64 \
  -t "$IMAGE" \
  --push .

# Step 2: Verify SSH connectivity
echo -e "${YELLOW}[2/4]${NC} Checking SSH connectivity..."
if ! ssh -i "$SSH_KEY" -o ConnectTimeout=5 "$DROPLET_USER@$DROPLET_IP" "echo '✓ Connected'" 2>/dev/null; then
  echo -e "${RED}✗ SSH connection failed to $DROPLET_IP${NC}"
  echo "  SSH key: $SSH_KEY"
  exit 1
fi

# Step 3: Pull new image and recreate containers (no build on droplet)
echo -e "${YELLOW}[3/4]${NC} Pulling image and recreating containers on droplet..."
ssh -i "$SSH_KEY" "$DROPLET_USER@$DROPLET_IP" \
  "cd $DEPLOY_PATH && docker compose pull && docker compose up -d --force-recreate" || {
  echo -e "${RED}✗ Deploy failed${NC}"
  echo "  Check logs: ssh -i $SSH_KEY $DROPLET_USER@$DROPLET_IP 'cd $DEPLOY_PATH && docker compose logs -f acdefense'"
  exit 1
}

# Step 4: Verify
echo -e "${YELLOW}[4/4]${NC} Verifying deployment..."
sleep 5
ssh -i "$SSH_KEY" "$DROPLET_USER@$DROPLET_IP" \
  "curl -s http://localhost:3000 > /dev/null && echo '✓ App is responding'" || {
  echo -e "${YELLOW}⚠ App not responding yet — may still be starting${NC}"
}

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo "  Live:  https://acdefenseco.net"
echo "  Logs:  ssh -i $SSH_KEY $DROPLET_USER@$DROPLET_IP 'cd $DEPLOY_PATH && docker compose logs -f acdefense'"
