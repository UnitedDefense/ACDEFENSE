# ACDefense Website Deployment Guide

## Quick Start

### Method 1: Git Pull + Docker Rebuild (Recommended)
```bash
./deploy.sh 162.243.250.87 main
```
- Pulls latest code from GitHub
- Rebuilds Docker image with latest code
- Restarts all services
- Takes ~2-3 minutes

### Method 2: Fast Rsync + Conditional Build
```bash
./deploy-rsync.sh 162.243.250.87 main
```
- Pulls git changes
- Only rebuilds if `package.json` changed
- Faster when dependencies unchanged
- Takes ~30-60 seconds

### Method 3: SSH with Password (sshpass)
```bash
SSH_PASSWORD='your_password' SSH_KEY=none ./deploy.sh 162.243.250.87 main
```
- Requires `sshpass`: `apt-get install sshpass`
- Set `SSH_PASSWORD` env var
- Fallback if SSH keys not configured

---

## Prerequisites

### On Your Machine
1. **SSH access to droplet** (key-based or password)
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/droplet_key
   ssh-copy-id -i ~/.ssh/droplet_key root@162.243.250.87
   ```

2. **Set SSH_KEY env var** (optional, defaults to `~/.ssh/id_rsa`)
   ```bash
   export SSH_KEY=~/.ssh/droplet_key
   ```

3. **Make scripts executable**
   ```bash
   chmod +x deploy.sh deploy-rsync.sh
   ```

### On Droplet
1. **Clone repository** (one time only)
   ```bash
   ssh root@162.243.250.87
   cd /root
   git clone https://github.com/chicago-joe/acdefense-website
   cd acdefense-website
   ```

2. **Create .env.local** (one time only)
   ```bash
   # Copy from your local .env.local
   scp -i ~/.ssh/droplet_key .env.local root@162.243.250.87:/root/acdefense-website/
   ```

3. **Verify docker-compose installed**
   ```bash
   ssh root@162.243.250.87 docker compose --version
   ```

---

## Common Workflows

### Deploy Latest Main Branch
```bash
./deploy.sh 162.243.250.87 main
```

### Deploy with Custom Branch
```bash
./deploy.sh 162.243.250.87 feature/new-feature
```

### Fast Deploy (only code changes)
```bash
./deploy-rsync.sh 162.243.250.87 main
```

### Check Deployment Status
```bash
ssh root@162.243.250.87 'cd /root/acdefense-website && docker compose ps'
ssh root@162.243.250.87 'cd /root/acdefense-website && docker compose logs acdefense -f'
```

### Rollback to Previous Version
```bash
ssh root@162.243.250.87 'cd /root/acdefense-website && git revert HEAD && docker compose up -d --build'
```

### SSH Without Password
```bash
# Install sshpass
apt-get install sshpass

# Create .env for credentials
cat > deploy.env <<EOF
SSH_HOST=162.243.250.87
SSH_USER=root
SSH_PASSWORD=your_password
SSH_KEY=none
EOF

# Deploy
SSH_PASSWORD=$(grep SSH_PASSWORD deploy.env | cut -d= -f2) \
SSH_KEY=none \
./deploy.sh 162.243.250.87 main
```

---

## Troubleshooting

### SSH Connection Failed
```bash
# Test connectivity
ssh -v root@162.243.250.87

# Copy public key
ssh-copy-id -i ~/.ssh/id_rsa.pub root@162.243.250.87

# Specify custom SSH key
SSH_KEY=~/.ssh/custom_key ./deploy.sh 162.243.250.87
```

### .env.local Missing
```bash
# Copy to droplet
scp -i ~/.ssh/id_rsa .env.local root@162.243.250.87:/root/acdefense-website/

# Verify
ssh root@162.243.250.87 'cat /root/acdefense-website/.env.local | head -5'
```

### Docker Build Fails
```bash
# Check logs
ssh root@162.243.250.87 'cd /root/acdefense-website && docker compose logs acdefense'

# Clear cache and rebuild
ssh root@162.243.250.87 'cd /root/acdefense-website && docker compose down && docker system prune -a && docker compose up -d --build'
```

### Application Not Responding
```bash
# Wait longer for build to complete
sleep 10

# Check if containers are running
ssh root@162.243.250.87 'docker ps'

# Check network connectivity
ssh root@162.243.250.87 'curl -s http://localhost:3000 | head -20'
```

---

## Advanced: Automated Deployments

### GitHub Actions Integration
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to droplet
        env:
          SSH_KEY: ${{ secrets.DROPLET_SSH_KEY }}
          DEPLOY_IP: 162.243.250.87
        run: |
          mkdir -p ~/.ssh
          echo "$SSH_KEY" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          SSH_KEY=~/.ssh/deploy_key ./deploy.sh $DEPLOY_IP main
```

### Scheduled Deployments
```bash
# Deploy every day at 2 AM
0 2 * * * cd /home/user/acdefense-website && ./deploy.sh 162.243.250.87 main >> /var/log/deploy.log 2>&1
```

---

## Performance Tips

1. **Use deploy-rsync.sh for frequent updates** — faster when dependencies unchanged
2. **Rebuild only when package.json changes** — saves ~1-2 minutes
3. **Cache Docker layers** — subsequent builds use cached layers
4. **Deploy during off-hours** — reduces impact on users

---

## Rollback Strategy

### Quick Rollback
```bash
ssh root@162.243.250.87 'cd /root/acdefense-website && git revert HEAD && docker compose up -d --build'
```

### Previous Version
```bash
ssh root@162.243.250.87 'cd /root/acdefense-website && git log --oneline | head -10'
ssh root@162.243.250.87 'cd /root/acdefense-website && git reset --hard <commit-hash> && docker compose up -d --build'
```

### Keep Last N Versions
```bash
ssh root@162.243.250.87 'cd /root/acdefense-website && git reflog'
```

---

## Monitoring Deployments

### Real-time Logs
```bash
ssh root@162.243.250.87 'cd /root/acdefense-website && docker compose logs -f acdefense'
```

### Health Check
```bash
# Check if app is responding
curl -s https://acdefense.chicagojoe.dev/api/health

# Check database connection
ssh root@162.243.250.87 'docker compose exec postgres pg_isready'
```

### Disk Space
```bash
ssh root@162.243.250.87 'docker system df'
ssh root@162.243.250.87 'df -h'
```

---

## Security Notes

1. **Never commit .env.local** — use `scp` to deploy
2. **Rotate SSH keys regularly** — `ssh-keygen` with new key
3. **Use SSH keys over passwords** — more secure, easier to automate
4. **Limit SSH access** — use firewall rules (`ufw`)
5. **Monitor deployment logs** — check for suspicious changes

---

## Support

For issues, check:
1. SSH connectivity: `ssh root@162.243.250.87 echo ok`
2. Git status: `ssh root@162.243.250.87 'cd /root/acdefense-website && git status'`
3. Docker status: `ssh root@162.243.250.87 'docker ps'`
4. Application logs: `ssh root@162.243.250.87 'docker compose logs acdefense -f'`
