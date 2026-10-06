#!/bin/bash
set -e

# ACDefense Website Deployment Script (Fast Rsync Variant)
# Syncs code via rsync + rebuilds only if package.json changed
# Usage: ./deploy-rsync.sh <droplet_ip> [branch]

DROPLET_IP="${1:-45.55.235.37}"
DROPLET_USER="root"
DEPLOY_PATH="/root/acdefense-website"
SSH_KEY="${SSH_KEY:-~/.ssh/id_ed25519-doctl}"

# Colors
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🚀 ACDefense Rsync Deploy${NC}"
echo "Target: $DROPLET_USER@$DROPLET_IP:$DEPLOY_PATH"
echo ""

# Step 1: Verify connectivity
echo -e "${YELLOW}[1/3]${NC} Checking SSH connectivity..."
ssh -i "$SSH_KEY" -o ConnectTimeout=5 "$DROPLET_USER@$DROPLET_IP" "echo '✓ Connected'" || {
  echo -e "${RED}✗ SSH failed${NC}"
  exit 1
}

# Step 2: Sync compose file, env, and init SQL to droplet
echo -e "${YELLOW}[2/3]${NC} Rsyncing docker-compose.yml + init/ to droplet..."
rsync -az -e "ssh -i $SSH_KEY" \
  docker-compose.yml \
  init/ \
  "$DROPLET_USER@$DROPLET_IP:$DEPLOY_PATH/"

# Step 3: Pull latest image and recreate containers (no build on droplet)
echo -e "${YELLOW}[3/3]${NC} Pulling image and recreating containers..."
ssh -i "$SSH_KEY" "$DROPLET_USER@$DROPLET_IP" \
  "cd $DEPLOY_PATH && docker compose pull && docker compose up -d --force-recreate" || {
  echo -e "${RED}✗ Deploy failed${NC}"
  exit 1
}

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo "  Live:  https://acdefenseco.net"
echo "  Logs:  ssh -i $SSH_KEY $DROPLET_USER@$DROPLET_IP 'cd $DEPLOY_PATH && docker compose logs -f acdefense'"
