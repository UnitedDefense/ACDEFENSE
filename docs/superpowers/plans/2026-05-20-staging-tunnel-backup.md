# ACDefense Staging Tunnel + Backup System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up staging.acdefenseco.net via a dedicated Cloudflare tunnel, add event-triggered DB backups for all transactional operations, and schedule daily+incremental cron backups for both prod and staging.

**Architecture:** Separate `acdefense-staging` Cloudflare tunnel (free, already created) routes `staging.acdefenseco.net → website-staging:3000`. Event backups are triggered from the Next.js app by calling `pg_dump` via the `DATABASE_URL` connection string (requires `postgresql-client` in the Docker image). Cron backups on the droplet cover both prod and staging with 4-hour and daily cadences respectively.

**Tech Stack:** cloudflared CLI · cfcli (DNS management) · Docker Compose · Next.js 15 API routes · pg_dump (postgresql-client) · cron

---

## Current State (as of 2026-05-20)

- Tunnel `acdefense-staging` created, ID `349193fd-8257-481c-94e6-cac7d898c1a4`
- Token: `<REDACTED-CLOUDFLARE-TUNNEL-TOKEN>`
- Credentials: `~/.cloudflared/349193fd-8257-481c-94e6-cac7d898c1a4.json`
- Wrong CNAME was added to `chicagojoe.dev` zone (not `acdefenseco.net`) — see Task 1 for fix
- Production backup cron: daily at 03:00 UTC via `/root/scripts/pg-backup.sh` ✅
- Staging stack: compose file exists, NO tunnel service, NO backup cron

---

## Task 1: Add staging.acdefenseco.net DNS CNAME

**Files:**
- No file changes — DNS API call only

**Context:** The `cfcli` token has read-only DNS access. The `cloudflared tunnel route dns` command added a CNAME to the wrong zone (`chicagojoe.dev` instead of `acdefenseco.net`). A write-capable Cloudflare API token is needed for the `acdefenseco.net` zone, OR do it manually.

**Option A — Manual (fastest, recommended):**

- [ ] **Step 1: Log into Cloudflare dashboard**

  Go to https://dash.cloudflare.com → Select zone `acdefenseco.net` → DNS → Records

- [ ] **Step 2: Add CNAME record**

  | Type | Name | Target | Proxy status |
  |------|------|--------|--------------|
  | CNAME | staging | `349193fd-8257-481c-94e6-cac7d898c1a4.cfargotunnel.com` | Proxied ✅ |

- [ ] **Step 3: Clean up wrong CNAME in chicagojoe.dev zone**

  Go to `chicagojoe.dev` DNS → find record `staging.acdefenseco.net` → delete it

**Option B — API (if token has Zone DNS Edit permission):**

- [ ] **Step 1: Get acdefenseco.net zone ID**

  ```bash
  curl -s "https://api.cloudflare.com/client/v4/zones?name=acdefenseco.net" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -o /tmp/cf-zone.json && cat /tmp/cf-zone.json | grep '"id"' | head -1
  ```

- [ ] **Step 2: Add CNAME record (replace ZONE_ID)**

  ```bash
  curl -s -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/dns_records" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    -H "Content-Type: application/json" \
    --data '{"type":"CNAME","name":"staging","content":"349193fd-8257-481c-94e6-cac7d898c1a4.cfargotunnel.com","proxied":true}' \
    -o /tmp/cf-dns-add.json
  ```

---

## Task 2: Add Staging Tunnel Container to docker-compose.staging.yml

**Files:**
- Modify: `docker-compose.staging.yml`
- Modify: `.env.staging` (droplet only — not committed)

The staging stack has no tunnel service — traffic can't reach it from the internet. Add a `cloudflared` container mirroring the production pattern.

- [ ] **Step 1: Add tunnel service to docker-compose.staging.yml**

  In `docker-compose.staging.yml`, add after the `acdefense-staging` service:

  ```yaml
    acdefense-staging-tunnel:
      container_name: ac-tunnel-staging
      image: cloudflare/cloudflared:latest
      command: "tunnel --no-autoupdate run --token ${STAGING_CLOUDFLARE_TUNNEL_TOKEN}"
      depends_on:
        - acdefense-staging
      networks:
        - staging_network
  ```

  The `--url` flag is intentionally omitted — the tunnel uses its remote config (Public Hostname configured in CF dashboard in Task 1) to route `staging.acdefenseco.net → http://website-staging:3000`.

- [ ] **Step 2: Commit**

  ```bash
  git add docker-compose.staging.yml
  git commit -m "feat: add cloudflared tunnel container to staging compose"
  ```

- [ ] **Step 3: Set STAGING_CLOUDFLARE_TUNNEL_TOKEN on droplet**

  ```bash
  ssh -i ~/.ssh/id_ed25519-doctl root@45.55.235.37 \
    "echo 'STAGING_CLOUDFLARE_TUNNEL_TOKEN=<REDACTED-CLOUDFLARE-TUNNEL-TOKEN>' >> /root/acdefense-website/.env.staging"
  ```

- [ ] **Step 4: Configure Public Hostname in Cloudflare Zero Trust**

  The tunnel uses remote config, not `--url`. You must set the ingress rule in Cloudflare:

  Go to https://one.dash.cloudflare.com → Networks → Tunnels → `acdefense-staging` → Configure → Public Hostnames → Add:

  | Subdomain | Domain | Service |
  |-----------|--------|---------|
  | staging | acdefenseco.net | http://website-staging:3000 |

  > Note: `website-staging` is the hostname because cloudflared runs on the same Docker network as the staging app container (`staging_network`).

- [ ] **Step 5: Rsync updated compose to droplet and restart staging**

  ```bash
  rsync -av -e "ssh -i ~/.ssh/id_ed25519-doctl" \
    docker-compose.staging.yml \
    root@45.55.235.37:/root/acdefense-website/

  ssh -i ~/.ssh/id_ed25519-doctl root@45.55.235.37 \
    "cd /root/acdefense-website && docker compose -f docker-compose.staging.yml --env-file .env.staging up -d"
  ```

- [ ] **Step 6: Verify staging is reachable**

  ```bash
  curl -I https://staging.acdefenseco.net 2>&1 | head -5
  ```

  Expected: HTTP 200 or redirect from Next.js.

---

## Task 3: Enhance Production + Staging Backup Scripts (Droplet)

**Files (on droplet):**
- Modify: `/root/scripts/pg-backup.sh`
- Create: `/root/scripts/pg-backup-staging.sh`
- Modify: `/root/acdefense-website/docker-compose.yml` (for Stripe/event backup — Task 4)

**Context:** Production backup is daily at 03:00 UTC. No staging backup exists. We want production backed up every 4 hours and staging daily at 04:00 UTC.

- [ ] **Step 1: Update production crontab to 4-hourly**

  ```bash
  ssh -i ~/.ssh/id_ed25519-doctl root@45.55.235.37 bash << 'ENDSSH'
  crontab -l > /tmp/current-crontab
  # Remove old daily entry, add 4-hourly
  grep -v "pg-backup.sh" /tmp/current-crontab > /tmp/new-crontab
  echo "0 */4 * * * /root/scripts/pg-backup.sh >> /var/log/pg-backup.log 2>&1" >> /tmp/new-crontab
  echo "0 4 * * * /root/scripts/pg-backup-staging.sh >> /var/log/pg-backup-staging.log 2>&1" >> /tmp/new-crontab
  crontab /tmp/new-crontab
  crontab -l
  ENDSSH
  ```

  Expected output shows both entries, no old `0 3 * * *` entry.

- [ ] **Step 2: Create staging backup script on droplet**

  ```bash
  ssh -i ~/.ssh/id_ed25519-doctl root@45.55.235.37 bash << 'ENDSSH'
  cat > /root/scripts/pg-backup-staging.sh << 'EOF'
  #!/usr/bin/env bash
  set -euo pipefail
  STAMP=$(date +%Y%m%d-%H%M%S)
  cd /root/acdefense-website
  mkdir -p /root/backups/staging
  docker compose -f docker-compose.staging.yml exec -T postgres-staging \
    pg_dump -U acdefense -Fc acdefense \
    > "/root/backups/staging/acdefense-staging-${STAMP}.dump"
  find /root/backups/staging -name "acdefense-staging-*.dump" -mtime +7 -delete
  echo "Staging backup complete: acdefense-staging-${STAMP}.dump"
  EOF
  chmod +x /root/scripts/pg-backup-staging.sh
  echo "Script created"
  ENDSSH
  ```

- [ ] **Step 3: Verify by running staging backup manually**

  ```bash
  ssh -i ~/.ssh/id_ed25519-doctl root@45.55.235.37 \
    "/root/scripts/pg-backup-staging.sh && ls -lh /root/backups/staging/"
  ```

  Expected: a `.dump` file appears, size >10KB.

---

## Task 4: Event-Triggered Backups via Next.js App

**Files:**
- Modify: `Dockerfile` (add postgresql-client to production stage)
- Create: `lib/backup.ts`
- Create: `app/api/internal/backup/route.ts`
- Modify: `app/api/webhooks/stripe/route.ts`
- Modify: `app/api/bookings/route.ts`
- Modify: `app/api/checkout-shop/route.ts`
- Modify: `app/api/contact/route.ts`

**Context:** The Next.js container doesn't have `pg_dump`. Installing `postgresql-client` in the Alpine production image gives access to `pg_dump`. The backup function runs `pg_dump` using `DATABASE_URL` and writes to a volume-mounted path. A bearer-token-protected internal API route allows the app to trigger its own backup.

The backup fires:
- After a Stripe payment completes (`checkout.session.completed`)
- After a booking is created
- After a shop order is created  
- After a contact form is submitted (lower priority, same mechanism)

**Backup file path inside container:** `/app/backups/` — mount this as a volume to persist to the droplet.

- [ ] **Step 1: Add postgresql-client to Dockerfile production stage**

  In `Dockerfile`, find the `FROM node:20-alpine AS production` stage and add one line before `EXPOSE 3000`:

  ```dockerfile
  RUN apk add --no-cache postgresql-client
  ```

  Full production stage tail should look like:
  ```dockerfile
  FROM node:20-alpine AS production
  WORKDIR /app
  COPY --from=builder /app/package*.json ./
  COPY --from=builder /app/node_modules ./node_modules
  COPY --from=builder /app/.next ./.next
  COPY --from=builder /app/public ./public
  COPY --from=builder /app/next.config.ts ./
  COPY --from=builder /app/drizzle.config.ts ./
  COPY --from=builder /app/tsconfig.json ./
  COPY --from=builder /app/lib ./lib
  COPY --from=builder /app/scripts ./scripts
  COPY --from=builder /app/.env ./.env
  RUN apk add --no-cache postgresql-client
  EXPOSE 3000
  CMD ["npm", "start"]
  ```

- [ ] **Step 2: Create lib/backup.ts**

  ```typescript
  import { exec } from "child_process";
  import { promisify } from "util";
  import { mkdir } from "fs/promises";
  import path from "path";

  const execAsync = promisify(exec);

  export async function triggerBackup(): Promise<void> {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return;

    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const backupDir = "/app/backups";
    const outFile = path.join(backupDir, `acdefense-event-${stamp}.dump`);

    try {
      await mkdir(backupDir, { recursive: true });
      await execAsync(`pg_dump "${dbUrl}" -Fc -f "${outFile}"`, { timeout: 30000 });
    } catch (err) {
      // Never throw — backup failure must not affect request
      console.error("[backup] event backup failed:", err);
    }
  }
  ```

- [ ] **Step 3: Create app/api/internal/backup/route.ts**

  ```typescript
  import { NextRequest, NextResponse } from "next/server";
  import { triggerBackup } from "@/lib/backup";

  export async function POST(request: NextRequest) {
    const auth = request.headers.get("authorization");
    const expected = `Bearer ${process.env.INTERNAL_BACKUP_TOKEN}`;
    if (!process.env.INTERNAL_BACKUP_TOKEN || auth !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await triggerBackup();
    return NextResponse.json({ ok: true });
  }
  ```

- [ ] **Step 4: Hook into Stripe webhook — add backup after payment completion**

  In `app/api/webhooks/stripe/route.ts`, add import at top:
  ```typescript
  import { triggerBackup } from "@/lib/backup";
  ```

  In the `checkout.session.completed` case, add `triggerBackup()` call after the transaction (non-blocking, fire-and-forget):

  ```typescript
  case "checkout.session.completed": {
    // ... existing code (db.transaction for bookingId or orders update) ...
    // Add at end of case, before break:
    triggerBackup().catch(() => {}); // fire-and-forget
    break;
  }
  ```

- [ ] **Step 5: Hook into bookings creation — add backup after booking insert**

  In `app/api/bookings/route.ts`, add import:
  ```typescript
  import { triggerBackup } from "@/lib/backup";
  ```

  After the booking is inserted into the DB (after `db.insert(bookings)...`), add:
  ```typescript
  triggerBackup().catch(() => {});
  ```

- [ ] **Step 6: Hook into shop checkout — add backup after order creation**

  In `app/api/checkout-shop/route.ts`, add import:
  ```typescript
  import { triggerBackup } from "@/lib/backup";
  ```

  After the order and order items are inserted (find the `db.insert(orders)` and subsequent items insert), add:
  ```typescript
  triggerBackup().catch(() => {});
  ```

- [ ] **Step 7: Hook into contact form**

  In `app/api/contact/route.ts`, add the same import and trigger call after the contact submission insert.

- [ ] **Step 8: Add backup volume mount to docker-compose.yml**

  In `docker-compose.yml`, under the `acdefense` service `volumes`:
  ```yaml
  volumes:
    - uploads_data:/app/public/uploads
    - /root/backups/events:/app/backups
  ```

  Do the same in `docker-compose.staging.yml` for `acdefense-staging`:
  ```yaml
  volumes:
    - uploads_staging_data:/app/public/uploads
    - /root/backups/staging/events:/app/backups
  ```

- [ ] **Step 9: Add INTERNAL_BACKUP_TOKEN to .env.local and droplet .env**

  Generate a token:
  ```bash
  openssl rand -base64 32
  ```

  Add to `.env.local`:
  ```
  INTERNAL_BACKUP_TOKEN=<generated>
  ```

  Add to droplet `.env` and `.env.staging`:
  ```bash
  ssh -i ~/.ssh/id_ed25519-doctl root@45.55.235.37 \
    "echo 'INTERNAL_BACKUP_TOKEN=<generated>' >> /root/acdefense-website/.env"
  ssh -i ~/.ssh/id_ed25519-doctl root@45.55.235.37 \
    "echo 'INTERNAL_BACKUP_TOKEN=<generated>' >> /root/acdefense-website/.env.staging"
  ```

  Also add to docker-compose.yml environment section for `acdefense` service:
  ```yaml
  - INTERNAL_BACKUP_TOKEN=${INTERNAL_BACKUP_TOKEN}
  ```

- [ ] **Step 10: Commit all app changes**

  ```bash
  git add Dockerfile lib/backup.ts app/api/internal/backup/ \
    app/api/webhooks/stripe/route.ts app/api/bookings/route.ts \
    app/api/checkout-shop/route.ts app/api/contact/route.ts \
    docker-compose.yml docker-compose.staging.yml
  git commit -m "feat: event-triggered pg_dump backups on transactions"
  ```

---

## Task 5: Build, Push, and Deploy

- [ ] **Step 1: Build new image (adds postgresql-client)**

  ```bash
  docker buildx build --platform linux/amd64 \
    -t ghcr.io/chicago-joe/acdefense:development . --load
  ```

  Expected: build completes, `acdefense:development` image updated.

- [ ] **Step 2: Tag and push staging image**

  ```bash
  docker tag ghcr.io/chicago-joe/acdefense:development \
    ghcr.io/chicago-joe/acdefense:staging
  docker push ghcr.io/chicago-joe/acdefense:development
  docker push ghcr.io/chicago-joe/acdefense:staging
  ```

- [ ] **Step 3: Create /root/backups/events and /root/backups/staging/events dirs on droplet**

  ```bash
  ssh -i ~/.ssh/id_ed25519-doctl root@45.55.235.37 \
    "mkdir -p /root/backups/events /root/backups/staging/events"
  ```

- [ ] **Step 4: Rsync compose files to droplet**

  ```bash
  rsync -av -e "ssh -i ~/.ssh/id_ed25519-doctl" \
    docker-compose.yml docker-compose.staging.yml \
    root@45.55.235.37:/root/acdefense-website/
  ```

- [ ] **Step 5: Pull and restart production on droplet**

  ```bash
  ssh -i ~/.ssh/id_ed25519-doctl root@45.55.235.37 \
    "cd /root/acdefense-website && docker compose pull && docker compose up -d --force-recreate"
  ```

- [ ] **Step 6: Pull and restart staging on droplet**

  ```bash
  ssh -i ~/.ssh/id_ed25519-doctl root@45.55.235.37 \
    "cd /root/acdefense-website && docker compose -f docker-compose.staging.yml --env-file .env.staging pull && docker compose -f docker-compose.staging.yml --env-file .env.staging up -d --force-recreate"
  ```

- [ ] **Step 7: Verify production health**

  ```bash
  ssh -i ~/.ssh/id_ed25519-doctl root@45.55.235.37 \
    "docker compose ps && docker compose logs acdefense --tail 20"
  ```

  Expected: all containers healthy, no errors in logs.

- [ ] **Step 8: Smoke test event backup**

  ```bash
  # Hit the internal backup endpoint to verify pg_dump works
  TOKEN=$(ssh -i ~/.ssh/id_ed25519-doctl root@45.55.235.37 \
    "grep INTERNAL_BACKUP_TOKEN /root/acdefense-website/.env | cut -d= -f2")
  curl -s -X POST https://acdefenseco.net/api/internal/backup \
    -H "Authorization: Bearer $TOKEN" | cat
  # Expected: {"ok":true}

  ssh -i ~/.ssh/id_ed25519-doctl root@45.55.235.37 \
    "ls -lh /root/backups/events/"
  # Expected: a .dump file from ~now
  ```

---

## Quick Reference: What Was Already Done

| Item | Status |
|------|--------|
| Tunnel `acdefense-staging` created | ✅ Done |
| Staging DNS CNAME (acdefenseco.net zone) | ❌ Manual CF dashboard step (Task 1) |
| Staging tunnel container in compose | ❌ Task 2 |
| Production 4-hourly backup cron | ❌ Task 3 |
| Staging daily backup script + cron | ❌ Task 3 |
| Event-triggered backups from app | ❌ Task 4 |
| Image rebuild + deploy | ❌ Task 5 |
