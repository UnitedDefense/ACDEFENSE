# Plan: Admin Connect Buttons, Dashboard Fix, Hero Image

**Date:** 2026-05-22  
**Scope:** 4 independent work items — dashboard 500 bug, hero image cutoff, Google Calendar OAuth connect, Revere/Stripe settings UI

---

## Phase 0: Documentation Discovery (Done)

### Findings

**Dashboard bug root cause:**
- `app/api/admin/dashboard/route.ts:56–62` returns `{ data: { stats, recentOrders, upcomingSchedules } }`
- `app/admin/Dashboard.tsx:38–47` does `fetch(...).then(res => res.json()).then(result => setData(result.data))`
- `.catch` only fires on network errors — a 500 HTTP response bypasses it
- `result.data` becomes `undefined` → `!data` → "Error loading dashboard"
- Likely 500 cause: `gte(courseSchedules.startDate, now)` where `startDate` is a Drizzle `date()` column (returns string) vs JS `Date` object — type mismatch in Postgres

**Hero image cutoff:**
- `app/page.tsx:59–79`: section is `h-[85vh] flex items-end`, Image is `object-cover opacity-50`
- `object-cover` defaults to `object-position: center` — cuts the top of the image
- Fix: add `object-top` to Image className

**Settings connect buttons:**
- `app/admin/settings.tsx` — read-only status badges only, no interactive buttons
- `app/api/admin/settings/route.ts` — GET only, reads env vars, no write path
- Google Calendar: OAuth2 with `googleapis` npm package. Requires offline `access_type`, stores `refresh_token` in DB
- Stripe: API key auth only. Stripe is a placeholder (Revere is active). Best UX: link to Stripe dashboard + validate button
- Revere Payments: API key auth at `https://api.reverepayments.dev/api/v1/`. No OAuth. Key managed in Hub at `https://reverepayments.dev`

**Required env vars (already in `.env`):**
- `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET` — exist but may be empty
- Need to add: `GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/api/auth/google-calendar/callback`

**Package needed:** `googleapis` (for OAuth2 client + calendar API)

---

## Phase 1: Quick Fixes (Dashboard + Hero Image)

**Goal:** Fix "Error loading dashboard" and hero image crop. No new packages. Ship immediately.

### 1a — Fix Dashboard fetch error handling

**File:** `app/admin/Dashboard.tsx:37–48`

Replace the fetch block with proper HTTP error detection:

```ts
useEffect(() => {
  fetch("/api/admin/dashboard")
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((result) => {
      setData(result.data);
      setLoading(false);
    })
    .catch((err: Error) => {
      console.error("Dashboard fetch error:", err.message);
      setError(err.message);   // need to add error state
      setLoading(false);
    });
}, []);
```

Add `const [error, setError] = useState<string | null>(null);` to state.

Render error message instead of the generic "Error loading dashboard":
```tsx
if (error) return <div style={{ padding: 20, color: "red" }}>Dashboard error: {error}</div>;
```

### 1b — Fix dashboard API date comparison

**File:** `app/api/admin/dashboard/route.ts:41–47`

`courseSchedules.startDate` is a Drizzle `date()` type — returns/accepts string, not `Date`. Fix:

```ts
const todayStr = new Date().toISOString().split("T")[0]; // "2026-05-22"
const upcomingSchedules = await db
  .select()
  .from(courseSchedules)
  .where(gte(courseSchedules.startDate, todayStr))
  .orderBy(courseSchedules.startDate)
  .limit(5);
```

**Verify:** `docker compose exec acdefense curl -s http://localhost:3000/api/admin/dashboard` with admin session cookie → should return `{ data: { stats: {...}, ... } }` not `{ error: "..." }`.

### 1c — Fix hero image cutoff

**File:** `app/page.tsx:61–68`

Change `className="object-cover opacity-50"` → `className="object-cover object-top opacity-50"`

This sets `object-position: top` so the top of the image is anchored in frame instead of the center.

**Verify:** Open `http://localhost:3000` — top of hero image should be visible.

### Phase 1 checklist
- [ ] Add `error` state to Dashboard.tsx
- [ ] Add `res.ok` check to Dashboard fetch
- [ ] Fix `gte` date comparison to use string in dashboard route
- [ ] Add `object-top` to hero Image
- [ ] `docker compose logs acdefense --tail 20` — no build errors
- [ ] Visit `http://localhost:3000` — hero not cut off
- [ ] Visit `http://localhost:3000/admin` → Dashboard tab loads without "Error loading dashboard"

---

## Phase 2: Site Settings DB Table

**Goal:** Add a `site_settings` key-value table to store OAuth tokens and API keys that admins configure via the UI. Required by Phases 3 and 4.

### 2a — SQL migration

**New file:** `init/005_site_settings.sql`

```sql
CREATE TABLE IF NOT EXISTS site_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed expected keys (empty values — admin fills in via UI)
INSERT INTO site_settings (key, value) VALUES
  ('google_calendar_refresh_token', ''),
  ('google_calendar_id',            ''),
  ('revere_api_key',                ''),
  ('revere_group_id',               '')
ON CONFLICT (key) DO NOTHING;
```

### 2b — Drizzle schema

**File:** `lib/db/schema.ts` — add at the bottom:

```ts
export const siteSettings = pgTable("site_settings", {
  key:       text("key").primaryKey(),
  value:     text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

### 2c — Settings API: add PATCH

**File:** `app/api/admin/settings/route.ts` — add `PATCH` handler:

```ts
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { key, value } = body as { key: string; value: string };

  const allowed = ["google_calendar_id", "revere_api_key", "revere_group_id"];
  if (!allowed.includes(key))
    return NextResponse.json({ error: "Unknown key" }, { status: 400 });

  await db
    .insert(siteSettings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date() } });

  return NextResponse.json({ ok: true });
}
```

Note: `google_calendar_refresh_token` is intentionally NOT in the allowed list — it is only written by the OAuth callback, never by admin UI directly.

### Phase 2 checklist
- [ ] `init/005_site_settings.sql` created
- [ ] `lib/db/schema.ts` — `siteSettings` table exported
- [ ] `app/api/admin/settings/route.ts` — PATCH handler added, imports `siteSettings`
- [ ] Apply migration locally: `docker compose exec -T postgres psql -U acdefense -d acdefense < init/005_site_settings.sql`
- [ ] Verify: `docker compose exec postgres psql -U acdefense -d acdefense -c "SELECT * FROM site_settings;"`

---

## Phase 3: Google Calendar OAuth Connect Button

**Goal:** Admin clicks "Connect Google Calendar" → browser redirects to Google consent screen → callback stores refresh token in DB → settings page shows "Connected" with calendar ID input.

### 3a — Install googleapis

```bash
docker compose exec acdefense npm install googleapis --legacy-peer-deps
# This installs inside the container for dev; Dockerfile already handles it on build
```

Add to `package.json` dependencies: `"googleapis": "^144.0.0"` (or latest).

### 3b — OAuth initiate route

**New file:** `app/api/auth/google-calendar/route.ts`

```ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { google } from "googleapis";

export async function GET() {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CALENDAR_CLIENT_ID,
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    process.env.GOOGLE_CALENDAR_REDIRECT_URI ??
      `${process.env.NEXTAUTH_URL}/api/auth/google-calendar/callback`
  );

  const url = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",           // force refresh_token on every connect
    scope: ["https://www.googleapis.com/auth/calendar"],
  });

  return NextResponse.redirect(url);
}
```

### 3c — OAuth callback route

**New file:** `app/api/auth/google-calendar/callback/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { google } from "googleapis";
import { db } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.redirect(new URL("/login", request.url));

  const code = request.nextUrl.searchParams.get("code");
  if (!code)
    return NextResponse.redirect(new URL("/admin#/settings?error=no_code", request.url));

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CALENDAR_CLIENT_ID,
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    process.env.GOOGLE_CALENDAR_REDIRECT_URI ??
      `${process.env.NEXTAUTH_URL}/api/auth/google-calendar/callback`
  );

  const { tokens } = await oauth2.getToken(code);
  if (!tokens.refresh_token)
    return NextResponse.redirect(new URL("/admin#/settings?error=no_refresh_token", request.url));

  await db
    .insert(siteSettings)
    .values({ key: "google_calendar_refresh_token", value: tokens.refresh_token, updatedAt: new Date() })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value: tokens.refresh_token, updatedAt: new Date() } });

  return NextResponse.redirect(new URL("/admin#/settings?connected=google", request.url));
}
```

### 3d — Update settings API GET to read from DB

**File:** `app/api/admin/settings/route.ts` — in the GET handler, after reading env vars, also check DB:

```ts
import { db } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";

// Inside GET:
const dbSettings = await db
  .select()
  .from(siteSettings)
  .where(inArray(siteSettings.key, ["google_calendar_refresh_token", "google_calendar_id", "revere_api_key"]));

const dbMap = Object.fromEntries(dbSettings.map(r => [r.key, r.value]));

return NextResponse.json({
  googleCalendar: {
    configured: !!(process.env.GOOGLE_CALENDAR_CLIENT_ID && dbMap.google_calendar_refresh_token),
    clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID?.slice(0, 12) + "..." || "Not set",
    calendarId: dbMap.google_calendar_id || "",
    connected: !!dbMap.google_calendar_refresh_token,
  },
  // ... rest unchanged
});
```

### 3e — Update settings UI

**File:** `app/admin/settings.tsx`

Update `IntegrationStatus` type to include `connected: boolean` and `calendarId: string` for Google Calendar.

Replace the Google Calendar `IntegrationCard` static display with:

```tsx
<Card>
  <Card.Header
    title="Google Calendar"
    subtitle="Course schedule sync"
    suffix={
      status.googleCalendar.connected
        ? <StatusBadge skin="success" label="Connected" />
        : <StatusBadge skin="warning" label="Not connected" />
    }
  />
  <Card.Content>
    {status.googleCalendar.connected ? (
      <Box gap="12px" direction="vertical">
        <Text size="small" secondary>Refresh token stored. Calendar ID:</Text>
        <Input
          value={calendarId}
          onChange={(e) => setCalendarId(e.target.value)}
          placeholder="e.g. acdefenseco.net_xxxx@group.calendar.google.com"
          size="small"
        />
        <Button size="small" onClick={saveCalendarId}>Save Calendar ID</Button>
        <Button size="small" skin="destructive" as="a" href="/api/auth/google-calendar">
          Re-authorize
        </Button>
      </Box>
    ) : (
      <Button size="small" as="a" href="/api/auth/google-calendar">
        Connect Google Calendar
      </Button>
    )}
  </Card.Content>
</Card>
```

Add `calendarId` state and `saveCalendarId` handler that PATCHes `/api/admin/settings`.

Add Wix DS `Input` and `Button` to imports from `@wix/design-system`.

### 3f — Add env var to .env

```env
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/api/auth/google-calendar/callback
# Production: https://acdefenseco.net/api/auth/google-calendar/callback
```

Also add to `.env` template/documentation so prod `.env` on droplet gets updated.

**Google Cloud Console setup (manual — admin does this once):**
1. Go to Google Cloud Console → OAuth Credentials
2. Add authorized redirect URI: `https://acdefenseco.net/api/auth/google-calendar/callback`
3. Copy Client ID + Client Secret into `.env`

### Phase 3 checklist
- [ ] `googleapis` in `package.json`
- [ ] `app/api/auth/google-calendar/route.ts` created
- [ ] `app/api/auth/google-calendar/callback/route.ts` created
- [ ] Settings GET reads `google_calendar_refresh_token` from DB
- [ ] Settings UI shows Connect button or Connected state
- [ ] `GOOGLE_CALENDAR_REDIRECT_URI` in `.env`
- [ ] Test locally: visit `/api/auth/google-calendar` while logged in as admin → redirects to Google

---

## Phase 4: Revere Payments & Stripe Settings UI

**Goal:** Admin can enter Revere API key and Group ID in settings panel. Stripe shows link to dashboard + validate button. No OAuth flows — both are API key auth.

### 4a — Revere Payments card with API key input

**File:** `app/admin/settings.tsx`

Replace static Revere card with:

```tsx
<Card>
  <Card.Header
    title="Revere Payments"
    subtitle="Active payment processor"
    suffix={
      revereConfigured
        ? <StatusBadge skin="success" label="Configured" />
        : <StatusBadge skin="neutralLight" label="Pending setup" />
    }
  />
  <Card.Content>
    <Box gap="12px" direction="vertical">
      <Text size="small" secondary>
        Enter credentials from your{" "}
        <a href="https://reverepayments.dev" target="_blank" rel="noopener">
          Revere Hub
        </a>{" "}
        → Profile → API Keys.
      </Text>
      <Input
        value={revereApiKey}
        onChange={(e) => setRevereApiKey(e.target.value)}
        placeholder="API Key"
        type="password"
        size="small"
      />
      <Input
        value={revereGroupId}
        onChange={(e) => setRevereGroupId(e.target.value)}
        placeholder="Group ID"
        size="small"
      />
      <Button size="small" onClick={saveRevereCredentials}>Save Revere Credentials</Button>
    </Box>
  </Card.Content>
</Card>
```

Add `revereApiKey`, `revereGroupId`, `revereConfigured` state. `saveRevereCredentials` PATCHes `/api/admin/settings` for each key.

### 4b — Stripe card with dashboard link

Stripe is a placeholder (Revere is active). Update Stripe card to:

```tsx
<Card>
  <Card.Header
    title="Stripe"
    subtitle="Payment processor (placeholder — Revere is active)"
    suffix={<StatusBadge skin="neutralLight" label="Inactive" />}
  />
  <Card.Content>
    <Text size="small" secondary>
      Stripe integration is not active. Revere Payments is the configured processor.
      To manage Stripe keys:{" "}
      <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener">
        Stripe Dashboard → API Keys
      </a>
    </Text>
  </Card.Content>
</Card>
```

No buttons needed — Stripe is not being activated.

### 4c — Update settings API GET to return Revere status

In the GET handler, after `dbMap` is built:

```ts
reverePayments: {
  configured: !!(dbMap.revere_api_key && dbMap.revere_group_id),
  status: dbMap.revere_api_key ? "API key set" : "Not configured",
},
```

### Phase 4 checklist
- [ ] Revere card shows API key + Group ID input fields
- [ ] `saveRevereCredentials` PATCHes both keys
- [ ] Stripe card updated to inactive placeholder with dashboard link
- [ ] Settings GET returns `reverePayments.configured` based on DB values
- [ ] Test: enter fake Revere key → save → page reloads → badge shows "Configured"

---

## Phase 5: Build, SQL Migration, Deploy

**Goal:** Build new image, apply `005_site_settings.sql` to prod, push and restart.

### 5a — Run SQL migration locally first

```bash
docker compose exec -T postgres psql -U acdefense -d acdefense < init/005_site_settings.sql
docker compose exec acdefense curl -s http://localhost:3000/api/admin/dashboard  # verify dashboard
```

### 5b — Build image

```bash
docker buildx build --platform linux/amd64 \
  -t ghcr.io/chicago-joe/acdefense:development \
  -t ghcr.io/chicago-joe/acdefense:production \
  -t ghcr.io/chicago-joe/acdefense:staging . --push
```

### 5c — Apply migration to prod + restart

```bash
# Copy SQL to droplet
rsync -av -e "ssh -i ~/.ssh/id_ed25519-doctl" init/005_site_settings.sql \
  root@45.55.235.37:/root/acdefense-website/init/

# Apply migration
ssh -i ~/.ssh/id_ed25519-doctl root@45.55.235.37 \
  "docker exec -i postgres psql -U acdefense -d acdefense < /root/acdefense-website/init/005_site_settings.sql"

# Pull new image and restart
ssh -i ~/.ssh/id_ed25519-doctl root@45.55.235.37 \
  "cd /root/acdefense-website && docker compose pull && docker compose up -d --force-recreate acdefense"
```

### 5d — Update prod .env on droplet

```bash
ssh -i ~/.ssh/id_ed25519-doctl root@45.55.235.37 \
  "echo 'GOOGLE_CALENDAR_REDIRECT_URI=https://acdefenseco.net/api/auth/google-calendar/callback' >> /root/acdefense-website/.env"
# Then restart to pick up new env var
ssh -i ~/.ssh/id_ed25519-doctl root@45.55.235.37 \
  "cd /root/acdefense-website && docker compose up -d --force-recreate acdefense"
```

### Phase 5 checklist
- [ ] `005_site_settings.sql` applied locally — verify with `SELECT * FROM site_settings`
- [ ] `docker compose logs acdefense --tail 20` — Next.js starts clean, no `ENOTFOUND`
- [ ] Dashboard loads in browser
- [ ] Hero image top visible (not cropped)
- [ ] Settings page: Google Calendar Connect button appears
- [ ] Settings page: Revere fields appear
- [ ] Build pushed to GHCR
- [ ] Migration applied to prod postgres
- [ ] Prod container restarted
- [ ] Verify at `https://acdefenseco.net/admin#/settings`

---

## Anti-Patterns to Avoid

- **Do NOT** use `gte(column, new Date())` when `column` is a Drizzle `date()` type — use ISO string `"2026-05-22"`
- **Do NOT** write `google_calendar_refresh_token` via PATCH endpoint — only the callback writes it
- **Do NOT** `prompt: "consent"` removal — without it, Google won't re-issue refresh tokens on re-auth
- **Do NOT** skip `--legacy-peer-deps` when adding packages (Wix DS + React 19 peer dep conflict)
- **Do NOT** `docker compose up --build` — image is prebuilt; use `docker buildx build ... --push` + `docker compose pull`
- **Do NOT** `cloudflared tunnel route dns` for acdefenseco.net DNS — use CF REST API

---

## Work Item Summary

| Phase | What | Files Changed | Risk |
|-------|------|---------------|------|
| 1a/b  | Dashboard 500 fix — `res.ok` check + date string fix | `Dashboard.tsx`, `dashboard/route.ts` | Low |
| 1c    | Hero image `object-top` | `app/page.tsx` | Trivial |
| 2     | `site_settings` DB table + schema + PATCH API | `init/005_site_settings.sql`, `schema.ts`, `settings/route.ts` | Low |
| 3     | Google Calendar OAuth | 2 new API routes, `settings.tsx`, `settings/route.ts` | Medium |
| 4     | Revere + Stripe settings UI | `settings.tsx`, `settings/route.ts` | Low |
| 5     | Build + SQL migration + deploy | Ops | Medium |
