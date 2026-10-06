# ACDefenseCo Website

Full-stack Next.js 15 platform for firearms training courses, tactical gear, and booking management.

**Stack**: Next.js 15 (App Router) · TypeScript · TailwindCSS · shadcn/ui · Drizzle ORM · PostgreSQL 16 · NextAuth v5 · Stripe · React-Admin · Docker Compose

---

## Commands

```bash
# Logs (container name is "website", service name is "acdefense")
docker compose logs acdefense --tail 50 -f
docker compose logs postgres --tail 20

# DB shell
docker compose exec postgres psql -U acdefense -d acdefense

# Seed database (run after fresh volume)
docker compose exec acdefense npm run db:seed

# Check running containers
docker compose ps
```

## Deployment Model

**The image is prebuilt — `docker compose up --build` does nothing useful.**
**Always push BOTH tags** — the droplet resolves `${deployment:-development}`, so production env pulls `:production`.

```bash
# 1. Build locally (amd64 for droplet)
docker buildx build --platform linux/amd64 \
  -t ghcr.io/chicago-joe/acdefense:development \
  -t ghcr.io/chicago-joe/acdefense:production \
  -t ghcr.io/chicago-joe/acdefense:staging . --load

# 2. Push to registry
docker push ghcr.io/chicago-joe/acdefense:development
docker push ghcr.io/chicago-joe/acdefense:production
docker push ghcr.io/chicago-joe/acdefense:staging

# 3. On droplet — pull and restart (no --build)
ssh -i ~/.ssh/id_ed25519-doctl root@45.55.235.37 \
  "cd /root/acdefense-website && docker compose pull && docker compose up -d"

# Or use deploy-rsync.sh / deploy.sh scripts in repo root
```

**There is no source volume mount.** Local file changes require a new image build + push to take effect.

---

## Environments

| | Local | Staging | Production |
|--|-------|---------|------------|
| URL | http://localhost:3000 | https://staging.acdefenseco.net | https://acdefenseco.net |
| Image tag | `:development` | `:staging` | `:production` |
| Compose file | `docker-compose.yml` | `docker-compose.staging.yml` | `docker-compose.yml` |
| DB | local `postgres` container | `postgres-staging` on droplet (port 5433) | `postgres` on droplet |
| Env file | `.env` | `/root/acdefense-website/.env.staging` | `/root/acdefense-website/.env` |
| CF tunnel | none (direct port 3000) | acdefense-staging `349193fd` (remote-managed) | flask-app-tunnel `afc64bf1` (remote-managed) |
| Event backups | `/app/backups` (local vol) | staging volume | `/root/backups/events/` |

---

## Critical Gotchas

- **`force-dynamic` is required on every server page that queries the DB.** Without it, Next.js attempts static pre-render at build time, hits `ENOTFOUND postgres`, and the build crashes. Add `export const dynamic = "force-dynamic"` as the first line of any `page.tsx` that imports from `lib/db`.

- **Zod v4 uses `.issues`, not `.errors`.** `result.error.errors` does not exist in Zod v4 — use `result.error.issues[0].message`. Using `.errors` throws a TypeError at runtime, producing a 500 with an empty body.

- **`docker compose down -v` wipes the DB.** Schema + seed data live in `./init/` — Postgres auto-runs these on fresh volume init. After `down -v`, just `docker compose up -d` and the DB is restored.

- **Admin redirects to `/` not `/login`.** The middleware intentionally hides the admin panel from non-admins. To reach the admin panel, log in at `/login` first, then navigate to `/admin`.

- **Rate limiter is in-memory per process.** `lib/rate-limit.ts` uses a `Map` — resets on container restart, not shared across instances.

- **Stripe webhook BookingStatus is `"completed"`, not `"paid"`.** The `BookingStatus` enum in `lib/db/schema.ts` uses `"completed"` for a successful payment. Using `"paid"` silently fails or inserts wrong status. Check `app/api/webhooks/stripe/route.ts`.

- **`cloudflared tunnel route dns` targets the wrong zone.** `cloudflared` uses `cert.pem` bound to `chicagojoe.dev`, so DNS records land in `chicagojoe.dev` zone, not `acdefenseco.net`. Use the CF REST API or dashboard for acdefenseco.net DNS changes.

- **CI deploy.yml has a `git pull` step that fails.** The new droplet has no source clone — only `docker-compose.yml`, `.env`, and `init/` SQL. The `git pull` block in `.github/workflows/deploy.yml` must be removed before CI deploys can succeed.

- **`docker-compose.override.yml` (gitignored, local dev only) needs `--build` to actually apply.** It sets `target: development` + bind mount `.:/app`. If an image already exists locally under the tag `image:` points to (e.g. from a separate `docker build ... :production` test), plain `docker compose up -d acdefense` / `--force-recreate` silently reuses that stale image and runs `npm start` against a frozen `/app/.next` anonymous volume — source edits appear to do nothing no matter how many times you rebuild separately. Always use `docker compose up -d --build acdefense` for local dev; add `--renew-anon-volumes` if `.next`/`node_modules` seem stale.

- **`middleware.ts` edits require a full container restart**, not just a source save. Turbopack hot-reload does not reliably pick up middleware changes (it compiles to a separate Edge runtime bundle) the way it does pages/routes/API handlers — run `docker compose restart acdefense` after editing it.

- **Never run bare `docker compose up -d` locally — it joins production's live Cloudflare tunnel.** `CLOUDFLARE_TUNNEL_TOKEN` in local `.env` is the same token as production's `flask-app-tunnel` (verified: decoding the historical hardcoded token in git history, commit `e73f2b3`, resolves to tunnel ID `afc64bf1-e10d-4af4-b4e7-df67b2eb5674` — matches prod exactly). Starting the tunnel service locally registers live connectors for `acdefenseco.net` pointed at your local container. Scope explicitly: `docker compose up -d --build postgres acdefense` (omit `acdefense-tunnel`).

- **Revere redirects depend entirely on `NEXTAUTH_URL` (course checkout) / `NEXT_PUBLIC_BASE_URL` (shop checkout) being correct.** Both build the Revere `redirect-url` from these env vars. If they point at a stale/wrong domain, Steps 1-2 succeed but Revere's Step-3 redirect never reaches the app, so the booking/order silently never gets marked `completed` even though the customer was charged. Found live 2026-07-16: production `.env` had `NEXTAUTH_URL=http://acdefense.chicagojoe.dev` (no DNS record at all) instead of `https://acdefenseco.net`. Always `grep NEXTAUTH_URL .env` and cross-check against the real public domain before trusting an environment's Revere flow.

- **Revere callback routes must be idempotent — a `token-id` can only be completed once.** Revere's Step-3 `complete-action` rejects a repeat call for the same `token-id` with `result=3` / `"Transaction previously completed"`. Browsers/redirects can genuinely double-fire the callback GET; if the route calls `completeThreeStep` unconditionally, the second call can overwrite an already-`completed` booking/order back to `failed` (observed live 2026-07-16 — `booking_status_history` showed a `failed` row inserted right after `completed` for the same booking). Both `app/api/revere/callback/route.ts` and `app/api/revere/shop-callback/route.ts` now check current status first and short-circuit to the success redirect if already `completed`.

- **`courses.description`/`prerequisites` hold EITHER plain text OR Tiptap HTML — always render via `renderRichText()` from `lib/rich-text.ts`.** The admin `RichTextInput` (`app/admin/components/RichTextInput.tsx:98`) writes `editor.getHTML()`, while seed rows in `init/003_real_data.sql` are plain blank-line-separated text. Rendering either one as a plain React text node shows literal `<p>`/`<strong>`/`&amp;` to visitors — that was the "weird characters" bug. `renderRichText` detects the format, escapes+paragraphizes plain text, and DOMPurifies the result. Never pass a raw DB value to `dangerouslySetInnerHTML`.

- **drizzle-orm 0.45 wraps Postgres errors — the SQLSTATE is at `err.cause.code`, NOT `err.code`.** Every `(err as any).code === "23505"` duplicate check is silently dead and returns 500 instead of 409. Use `getPgErrorCode()` from `lib/pg-error.ts`. This had been broken in `app/api/newsletter/route.ts` (now fixed).

- **Adding a DELETE endpoint for an admin resource silently activates react-admin's default BULK delete on that list.** react-admin 5.x `<Datagrid>` ships a bulk-delete button unless `bulkActionButtons={false}`, and the default `mutationMode` is `undoable` (5s snackbar, then permanent). For `bookings` this cascades into `booking_status_history` — the payment audit log. `app/admin/bookings.tsx` now sets `bulkActionButtons={false}`; single-row delete via the Edit toolbar is intentionally kept. Consider this before adding DELETE to any other admin resource.

- **The desktop navbar breakpoint is `xl:`, not `lg:`.** The header (`components/layout/site-header.tsx`) has 7 nav items + Sign in + Request Training, which overflow between 1024-1279px, so the mobile menu must stay active through `lg:`.

- **Brand colors live ONLY in `app/globals.css` `:root` tokens** (2026-10 light redesign — see `plans/redesign-brief.md`). Use the Tailwind token classes (`bg-brand-blue`, `text-brand-red`, `text-ink`, `text-ink-muted`, `bg-surface`, `border-line`, `bg-charcoal`) and the component classes (`.btn .btn-primary/-secondary/-outline/-outline-light`, `.heading`, `.eyebrow`, `.card`, `.callout`, `.field`, `.page-hero`, `.link-arrow`). Never hard-code hex values in public pages. `--brand-gray` (#848482) is 3.75:1 on white — borders/backgrounds only, never body text. The header is `bg-charcoal` (#1f1f1f) on purpose: it matches the logo JPEG's plate (`public/images/LOGOSHOT.jpg` has no transparent version).

- **Component classes must stay inside `@layer components { }` in `globals.css`.** Unlayered CSS beats Tailwind's layered utilities, so `hidden`, `tracking-*`, `hover:text-*` etc. silently stop working on any element that also has `.btn`/`.heading`/`.link-arrow`. If a utility seems ignored, check the served CSS — Turbopack dev has also been seen serving a stale `globals.css` after edits; restart `next dev` if the CSS in DevTools doesn't match the file.

- **The site has exactly three public audiences: `open_enrollment` (Civilian), `law_enforcement`, `security`.** `military` is retired but still in the Postgres enum (can't drop values) — `isPublicAudience()` in `lib/site-nav.ts` filters it out; `/courses?audience=military` falls back to civilian and military course pages 404. FCC/armed-guard courses (`course_category = 'fcc_advanced'`) are `security` (re-tagged in `init/012_redesign.sql`).

- **Law-enforcement courses are request-only** (`isRequestOnly()` in `lib/course-format.ts`): no price, no Book Now, never listed in upcoming dates — the course page links to `/request-training?type=agency&course=<id>`. This is UI-only; `POST /api/bookings` does not block LE schedules.

- **`waitlist_entries` now holds three request types** (`request_type`: `waitlist` | `private_group` | `agency`, plus `organization`, `contact_title`, `preferred_dates`, `location`). The duplicate guard is `uq_waitlist_request (email, request_type, course_id, schedule_id) NULLS NOT DISTINCT WHERE status='pending'` — 012 drops 011's `uq_waitlist_entry`. Re-running 011 by itself would recreate the old, stricter index and make agency requests 409 against an existing notify-me row; run 012 after it.

- **Client components must not import `lib/courses.ts`** (it imports the DB client). Date/price/request-only helpers live in `lib/course-format.ts` for that reason.

- **`POST /api/bookings` rejects schedules whose `start_date` has passed**, even if `status` is still `open` (nothing closes past schedules automatically). `BookingButton` previously seeded its date picker from `schedules[0]` (often a past row), so an untouched form could book and charge for a past class.

- **`docker compose up -d --force-recreate website` fails with `no such service: website`.** The compose *service* is `acdefense`; `website` is only the *container name* it creates. Use `docker compose up -d --force-recreate acdefense`.

---

## Environment Variables (`.env.local`)

```env
# Database
DATABASE_URL=postgresql://acdefense:${POSTGRES_PASSWORD}@postgres:5432/acdefense
POSTGRES_PASSWORD=<your-password>

# Auth
NEXTAUTH_URL=https://acdefense.chicagojoe.dev   # or http://localhost:3000
NEXTAUTH_SECRET=<openssl rand -base64 32>

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_BASE_URL=https://acdefense.chicagojoe.dev

# Cloudflare tunnel
CLOUDFLARE_TUNNEL_TOKEN=<token>

# Optional
TRAINING_REQUEST_NOTIFY_EMAIL=   # inbox that gets an email for every waitlist/private-group/agency request; unset = no notification (requests still in Admin -> Requests & Waitlist)
NEWSLETTER_WEBHOOK_URL=
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
```

---

## Payment Processing

**Active processor: Revere Payments** — Stripe keys in `.env.local` are test-only placeholders. Do NOT switch to live Stripe keys.
- Merchant portal: `https://secure.reverepayments.com/merchants/resources/integration/integration_portal.php?tid=c1499cb394e1041c519f57c4df78e5b1`
- **Status (2026-07-16): live for both course bookings and shop checkout.** Course bookings use the Three-Step Redirect via `app/api/revere/checkout/route.ts` + `app/api/revere/callback/route.ts`. Shop (`/shop`) was migrated from Stripe to the same pattern the same day — `app/api/checkout-shop/route.ts` calls `initiateThreeStep` directly (no Stripe Checkout Session), and `app/api/revere/shop-callback/route.ts` handles Step 3 for `orders` (mirrors the booking callback's idempotency guard, see Critical Gotchas). `orders` gained a `revere_transaction_id` column and `order_status` gained a `failed` value (`init/008_shop_revere_migration.sql`). `app/checkout/revere/page.tsx` accepts either `bookingId` or `orderId`.
- `pay.acdefenseco.net` DNS record intentionally deleted — Revere doesn't need a dedicated subdomain, it redirects back to the app's own domain (see `NEXTAUTH_URL`/`NEXT_PUBLIC_BASE_URL` gotcha above).
- **`middleware.ts` no longer protects `/checkout`** (removed from `protectedRoutes`) — required because shop supports guest checkout (`guestEmail`/`guestName`, no login). Booking creation (`POST /api/bookings`) still independently requires a session at the API level, so this doesn't weaken booking security.
- **Transactional email is Resend, in `lib/email.ts` (NOT SendGrid, NOT `lib/sendgrid.ts` — both are gone as of 2026-08-04).** Templates: `sendBookingConfirmation`, `sendPaymentReceipt`, `sendCourseReminder`, `sendPasswordReset`. Both Revere callbacks now email the purchaser an itemized receipt + booking confirmation, fired from the just-completed branch. Two things to know:
  - **Sends are fire-and-forget on purpose — never `await` them in a callback.** `retryWithBackoff` does 3 attempts with 1s/2s sleeps, so awaiting adds ~7s to the customer's post-payment redirect on every purchase.
  - **The Resend SDK returns `{data, error}` and does NOT throw on API errors.** `deliver()` in `lib/email.ts` explicitly throws on `error` — remove that check and every failed send silently reports success.
  - Env: `RESEND_API_KEY` + `EMAIL_FROM` (default `noreply@send.acdefenseco.net`). No key configured = every send silently returns `false`, no crash. Outbound is verified on the **`send.` subdomain** deliberately: the apex already carries Cloudflare Email Routing's inbound MX + SPF (`include:_spf.mx.cloudflare.net`), and putting Resend's SPF on the apex too would fight it. `sendCourseReminder` / `sendPasswordReset` are still defined but never invoked.

---

## Database Schema

21 tables. Key ones:

| Table | Purpose |
|-------|---------|
| `users` | Auth — `email`, `password_hash`, `role` (user/admin) |
| `courses` | `slug`, `price`, `audience` (open_enrollment/law_enforcement/military), `course_category` |
| `course_schedules` | `course_id`, `start_date`, `end_date`, `available_seats`, `status` |
| `bookings` | `user_id`, `schedule_id`, `payment_status`, `stripe_payment_id` |
| `booking_status_history` | Audit log for booking payment transitions |
| `waitlist_entries` | All training requests. `request_type` (`waitlist`/`private_group`/`agency`), `course_id` (nullable FK), `schedule_id` (nullable FK, waitlist only), `name`, `email`, `phone`, `organization`, `contact_title`, `party_size` (headcount), `preferred_dates`, `location` (`our_range`/`on_site`/`flexible`), `message`, `status` (`waitlist_status`: pending/contacted/converted/cancelled). For `waitlist` rows the nullable FKs disambiguate a general enquiry (no course_id) from "notify me when dates are announced" (course_id only) from a specific sold-out date (both) |
| `credentials` | Public `/credentials` page — `title`, `issuer`, `holder_name`, `valid_through`, `file_url` (owner-redacted scan, image or PDF), `sort_order`, `is_active` |
| `services` | Legal/expert-witness services (slug, is_active, sort_order) |
| `clients` | Partner/client logos for team page |
| `newsletter_subscriptions` | `email`, `first_name`, `webhook_sent`, `source` |
| `contact_submissions` | Contact form — `first_name`, `last_name`, `email`, `message`, `is_read` |
| `page_content` | Admin-editable text blocks — `(page, key)` UNIQUE |
| `blog_posts` | `slug`, `content`, `author`, `published_at` |
| `instructor_profiles` | `name`, `title`, `bio`, `photo_url`, `certifications` |
| `products` / `product_categories` | Shop |

Schema source of truth: `lib/db/schema.ts`
Init SQL (auto-runs on fresh volume): `init/001_init.sql`, `init/002_migrate.sql`, `init/011_waitlist.sql` (waitlist, additive/idempotent, applied to prod 2026-09-15), `init/012_redesign.sql` (security audience + FCC re-tag, request types, `credentials`, page_content rows — additive/idempotent; must run in autocommit, NOT `psql -1`, because `ALTER TYPE ... ADD VALUE` has to commit before the UPDATE that uses it)

---

## Pages & Routes

**Public pages**: `/` `/civilian` `/law-enforcement` `/security` (Professional Security — armed-guard training; was the Security & Logistics placeholder) `/credentials` `/request-training` (`?type=waitlist|private_group|agency&course=<id>`) `/courses` (`?audience=open_enrollment|law_enforcement|security`) `/courses/[slug]` `/blog` `/blog/[slug]` `/shop` `/shop/[slug]` `/contact` `/team` `/legal-services` `/vets2` `/payment-mock` `/login` `/register`. Redirects: `/waitlist` → `/request-training?type=waitlist` (308, `next.config.ts`), `/instructors` and `/about` → `/team`. Nav structure lives in `lib/site-nav.ts` (header + footer share it). Guard services are NOT sold on this site — the Security menu links out to the owner's sister company, Armstrong Security (`ARMSTRONG_SECURITY_URL`).

**Protected**: `/dashboard` `/admin` (admin role required)

**Public API**: `POST /api/contact` · `POST /api/newsletter` · `POST /api/bookings` · `POST /api/checkout` · `POST /api/auth/register` · `POST /api/webhooks/stripe` · `POST /api/waitlist`

**Admin API** (all require admin session → return 401 otherwise):
`/api/admin/dashboard` `/api/admin/courses[/id]` `/api/admin/schedules[/id]` `/api/admin/bookings[/id]` `/api/admin/products[/id]` `/api/admin/categories[/id]` `/api/admin/blog-posts[/id]` `/api/admin/instructors[/id]` `/api/admin/services` `/api/admin/clients` `/api/admin/contact-submissions` `/api/admin/subscribers` `/api/admin/orders[/id]` `/api/admin/page-content` `/api/admin/waitlist[/id]` `/api/admin/credentials[/id]`. `/api/admin/upload` accepts images (5MB), PDFs (5MB) and MP4/WebM (50MB, for `home.hero_video`); `/uploads/[...path]` answers Range requests for video (iOS Safari won't play an MP4 without 206 responses).

---

## Auth & Credentials

- **Admin login**: `admin@acdefenseco.net` / `password123` (seeded by `scripts/seed.ts`)
- **Test user**: `user@example.com` / `password123`
- Auth: NextAuth v5 credentials provider — JWT sessions, `role` in token
- Middleware (`middleware.ts`): `/admin/*` requires `role === 'admin'`, `/dashboard` requires any auth

---

## Agentic Workflow

**Memory-first** — before any non-trivial work, recover past context:
```
/mem-search → get_observations([IDs])   # structured session facts
/knowledge-agent (acdefense-website)    # query full project history
```

**Token-efficient execution:**
- `model=haiku` for: shell commands, DB queries, Docker ops, file reads, verification
- `model=sonnet` for: code generation, synthesis, architecture decisions
- tmux for long-running commands (builds, pushes): `tmux new-session -d -s build && tmux send-keys -t build "docker buildx build ..." Enter`
- Parallelize: send multiple `Agent()` calls in one message for independent tasks

**Relevant skills for this project:**

| Skill | When |
|-------|------|
| `/smart-explore` · `/pathfinder` | Always before manual grepping |
| `/mem-search` | Recover deployment facts, gotchas, DNS changes |
| `/knowledge-agent` (`acdefense-website`) | Query full project session history |
| `/frontend-design` | React components, landing pages, course/shop UI |
| `/database-design:postgresql` | Schema changes, indexing, migrations |
| `/database-migrations:sql-migrations` | `init/` SQL file management |
| `/backend-development:feature-development` | New API routes, auth, webhooks |
| `/cloudflare` · `/wrangler` | DNS zone changes, tunnel config, CF API |
| `/deploy` · `/deploy-agent` · `/pre-deploy-check` | Build → push → droplet restart |
| `/security-scanning:sast-configuration` | Before adding auth/payment code |
| `/claude-md-management:claude-md-improver` | After sessions with new gotchas |

---

## Exploration Tools

Always use `/smart-explore` + `/pathfinder` skills for code navigation (smart_search → smart_outline → smart_unfold). Do NOT chain Read or Agent(Explore) calls to discover files.

---

## Key Files

| File | Purpose |
|------|---------|
| `lib/db/schema.ts` | Drizzle schema — source of truth for all tables |
| `lib/rate-limit.ts` | In-memory IP rate limiter (5 req/min) |
| `lib/rich-text.ts` | Format-tolerant renderer for `courses.description`/`prerequisites` — detects plain text vs Tiptap HTML, sanitizes via `isomorphic-dompurify`. `toPlainText()` collapses a page_content value (Tiptap HTML or plain) for one-line headings |
| `lib/page-content.ts` | `getPageContent(page, keys)` — one query for a page's admin-editable copy (Admin → Site Content); keys ending `_image` get an image uploader, `_video` a video uploader |
| `lib/site-nav.ts` | Header/footer navigation, audience labels/landing pages, `isPublicAudience()` |
| `lib/courses.ts` / `lib/course-format.ts` | Course queries (server-only) / client-safe formatting + `isRequestOnly()` |
| `plans/redesign-brief.md` | 2026-10 public redesign requirements and decisions |
| `lib/pg-error.ts` | `getPgErrorCode()` — extracts the Postgres SQLSTATE from a drizzle-orm 0.45 error (`err.cause.code`, not `err.code`) |
| `auth.ts` | NextAuth v5 config (`trustHost: true` for Cloudflare) |
| `middleware.ts` | Route protection |
| `init/001_init.sql` | Full schema with `IF NOT EXISTS` (idempotent) |
| `init/002_migrate.sql` | Seed data (idempotent, `ON CONFLICT DO NOTHING`) |
| `scripts/seed.ts` | TypeScript seed script — run via `npm run db:seed` |
| `docker-compose.yml` | Uses `ghcr.io/chicago-joe/acdefense:${deployment:-development}` |
| `deploy.sh` / `deploy-rsync.sh` | Deployment helpers |
| `validate-deployment.sh` | Post-deploy smoke tests |

---

## Production

- **URL**: https://acdefenseco.net (Cloudflare tunnel → droplet:3000)
- **Droplet**: `root@45.55.235.37` (SSH key: `~/.ssh/id_ed25519-doctl`) — Ubuntu 24.04, Docker 29.x, **do not build on droplet**
  - Previous droplet `162.243.250.87` was destroyed; rebuilt 2026-05-16 via rsync of `docker-compose.yml`, `.env`, `init/*.sql` + `docker compose pull && up -d`.
  - GHCR auth on droplet: `echo $METRICS_TOKEN | docker login ghcr.io -u chicagojoe --password-stdin` (token is exported in `~/.bashrc` as both `METRICS_TOKEN` and `GH_TOKEN`).
  - No git clone needed on droplet — only the compose file, `.env`, and `init/` SQL are required because the image is prebuilt and Postgres seeds from `./init` on fresh volume.
- **Registry**: `ghcr.io/chicago-joe/acdefense`
- **Deployment path**: `/root/acdefense-website`

## Staging

- **Stack**: `docker-compose.staging.yml` — `website-staging` on port 3001, `postgres-staging` on 127.0.0.1:5433, separate volumes `postgres_staging_data` / `uploads_staging_data`.
- **Image tag**: `ghcr.io/chicago-joe/acdefense:staging` (tagged from `:development` until a dedicated CI pipeline is set up)
- **Env file**: `/root/acdefense-website/.env.staging` on droplet (same `POSTGRES_PASSWORD`, separate `STAGING_NEXTAUTH_SECRET`)
- **Start**: `docker compose -f docker-compose.staging.yml --env-file .env.staging up -d`
- **Expose via CF**: tunnel is managed via CF API. Ingress target is `http://website-staging:3000` (container name, not localhost). After updating remote config via API, **restart `ac-tunnel-staging`** — it does not hot-reload ingress rules.
  ```bash
  # Verify/update tunnel remote config (tunnel ID: 349193fd-8257-481c-94e6-cac7d898c1a4)
  curl -s "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/cfd_tunnel/349193fd-8257-481c-94e6-cac7d898c1a4/configurations" \
    -H "Authorization: Bearer $CF_TOKEN"
  # After any config change:
  ssh -i ~/.ssh/id_ed25519-doctl root@45.55.235.37 "docker restart ac-tunnel-staging"
  ```
- **Restore prod DB to staging**: `docker compose -f docker-compose.staging.yml exec -T postgres-staging pg_restore -U acdefense -d acdefense --clean --if-exists < /root/backups/<latest>.dump`

## Backups

- **Daily pg_dump** runs at 03:00 UTC via cron on the droplet: `/root/scripts/pg-backup.sh`
- **Backup location**: `/root/backups/acdefense-YYYYMMDD-HHMMSS.dump` (custom format, 14-day retention)
- **Verify**: `ls -lh /root/backups/` — should show a file from today, >50KB
- **Restore**: `docker compose exec -T postgres pg_restore -U acdefense -d acdefense --clean --if-exists < /root/backups/<file>.dump`
- **Log**: `/var/log/pg-backup.log` on droplet

## Common Operations

```bash
# Start local dev correctly (builds the override's dev target, excludes prod tunnel)
docker compose up -d --build postgres acdefense

# Reset local DB (wipes + reinits from init/ SQL — pgcrypto auto-enables)
docker compose down -v && docker compose up -d --build postgres acdefense

# Sync prod DB → staging (run on droplet)
LATEST=$(ls -t /root/backups/acdefense-*.dump | head -1)
docker exec -i postgres-staging pg_restore -U acdefense -d acdefense --clean --if-exists < "$LATEST"

# Full rebuild + deploy to prod (after Dockerfile/dep changes)
docker buildx build --platform linux/amd64 \
  -t ghcr.io/chicago-joe/acdefense:development \
  -t ghcr.io/chicago-joe/acdefense:production \
  -t ghcr.io/chicago-joe/acdefense:staging . --push
ssh -i ~/.ssh/id_ed25519-doctl root@45.55.235.37 \
  "cd /root/acdefense-website && docker compose pull && docker compose up -d --force-recreate acdefense"

# Sync compose file change to droplet (no rebuild)
rsync -av -e "ssh -i ~/.ssh/id_ed25519-doctl" docker-compose.yml \
  root@45.55.235.37:/root/acdefense-website/docker-compose.yml

# Apply new SQL migration to prod
rsync -av -e "ssh -i ~/.ssh/id_ed25519-doctl" init/ root@45.55.235.37:/root/acdefense-website/init/
ssh -i ~/.ssh/id_ed25519-doctl root@45.55.235.37 \
  "docker exec -i postgres psql -U acdefense -d acdefense < /root/acdefense-website/init/00X_new.sql"

# Stream prod logs locally
ssh -i ~/.ssh/id_ed25519-doctl root@45.55.235.37 "docker logs website -f --tail 50"

# Update CF tunnel ingress (staging), then restart to apply
curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/cfd_tunnel/349193fd-8257-481c-94e6-cac7d898c1a4/configurations" \
  -H "Authorization: Bearer $CF_TOKEN" -H "Content-Type: application/json" \
  --data '{"config":{"ingress":[{"hostname":"staging.acdefenseco.net","service":"http://website-staging:3000"},{"service":"http_status:404"}]}}'
ssh -i ~/.ssh/id_ed25519-doctl root@45.55.235.37 "docker restart ac-tunnel-staging"
```

## Debugging Quick Reference

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `503` on staging.acdefenseco.net | Tunnel has no ingress / not restarted | `docker restart ac-tunnel-staging` on droplet |
| Build fails `ENOTFOUND postgres` | Missing `force-dynamic` | Add `export const dynamic = "force-dynamic"` top of page.tsx |
| `result.error.errors` TypeError | Zod v4 API | Use `.issues[0].message` |
| GHCR pull fails on droplet | Auth expired | `echo $METRICS_TOKEN \| docker login ghcr.io -u chicagojoe --password-stdin` |
| Staging DB stale | Not synced | Restore from `/root/backups/acdefense-*.dump` |
| CNAME added to chicagojoe.dev zone | Used `cloudflared tunnel route dns` | Use CF REST API for acdefenseco.net DNS |
| Admin redirects to `/` | Not logged in | Login at `/login` first |
| Event backup dir empty | Image missing postgresql-client | Rebuild image — Dockerfile has `apk add postgresql-client` |
| Local source edits have zero effect despite rebuilding | `docker-compose.override.yml` reused a stale existing image instead of building the `development` target | `docker compose up -d --build acdefense` (plain `up -d`/`--force-recreate` isn't enough) |
| `middleware.ts` change doesn't take effect | Turbopack doesn't hot-reload the Edge middleware bundle | `docker compose restart acdefense` |
| Local `ac-tunnel` shows connections to `acdefenseco.net` | Bare `docker compose up -d` started the tunnel service, which shares prod's `CLOUDFLARE_TUNNEL_TOKEN` | `docker compose up -d --build postgres acdefense` (never include `acdefense-tunnel` locally) |
| Revere payment charges customer but booking/order never marks `completed` | `NEXTAUTH_URL` / `NEXT_PUBLIC_BASE_URL` points at wrong/no-DNS domain, so Step-3 redirect never reaches the app | `grep NEXTAUTH_URL .env` and fix to match the real public domain |
| Booking flips from `completed` to `failed` right after payment | Revere callback double-fired and wasn't idempotent | Callback routes now check current status and short-circuit if already `completed` — verify `app/api/revere/callback/route.ts` / `shop-callback/route.ts` still do this before editing |
| Literal `<p>`/`&amp;` visible in a course description | Field holds Tiptap HTML rendered as plain text | Render via `renderRichText()` (`lib/rich-text.ts`) |
| Duplicate POST returns 500 instead of 409 | `err.code` is undefined under drizzle 0.45 | Use `getPgErrorCode()` (`err.cause.code`) |
| `no such service: website` on deploy | Wrong name | The service is `acdefense`; `website` is the container name |
| Admin list unexpectedly offers bulk delete | react-admin default | Set `bulkActionButtons={false}` |

## Seed Data

Real content seeded from https://www.americancivildefensecompany.com/ (2026-05-19):
- `init/003_real_data.sql` — idempotent upsert, re-run after fresh volume to restore real content
- Git tag `v1-real-data` marks this state; `recovery/` dir has scraped source
