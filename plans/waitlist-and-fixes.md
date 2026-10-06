# Plan: Class Request / Waitlist Feature + Booking-Delete Fix + Course-Description Render Fix

**Created**: 2026-09-15 · **Branch base**: `main` @ `9481a61` (clean tree)

## Scope (three deliverables)

1. **FEATURE** — Public "Request a Class / Join Waitlist" capability for visitors (no login required).
2. **BUG A** — Server error when deleting bookings in `/admin`.
3. **BUG B** — Course description shows "weird characters" on the public course page.

## Subagent policy (user-mandated)

| Role | Model | Used for |
|------|-------|----------|
| Implementation | **sonnet** (high effort) | All code writing, Phases 1-5 |
| Verification / shell / browser | **sonnet** | Phase 6 integration testing via `/claude-in-chrome` |
| Final validation | **opus** (medium effort) | Phase 7 pre-deploy review — must run before any push |

## Hard constraints

- **Do NOT overwrite existing sales, booking, or calendar data on the droplet.** See Phase 8 guarantees.
- **Never run bare `docker compose up -d` locally** — it joins production's live Cloudflare tunnel (shared `CLOUDFLARE_TUNNEL_TOKEN`). Local dev is always `docker compose up -d --build postgres acdefense`.
- Test locally and on staging **before** production deploy.

---

## Phase 0: Documentation Discovery — ✅ COMPLETE (do not re-run)

Four discovery subagents reported with file:line evidence. Findings are authoritative; implementers must not re-derive them.

### 0.1 Verified facts — BUG A (booking delete)

**Root cause (confirmed, not inferred): there is no `DELETE` export in `app/api/admin/bookings/[id]/route.ts`.** The file defines only `GET` (line 8) and `PUT` (line 53). Next.js App Router returns its default 405 for an unimplemented method; react-admin's `fetchJson` throws `HttpError` on non-2xx, surfacing to the user as a server error.

- `lib/dataProvider.ts:111-119` — `delete` calls `DELETE ${apiUrl}/${resource}/${params.id}`; `deleteMany` (121-133) does the same per-id. `apiUrl = "/api/admin"` (line 3).
- `app/admin/bookings.tsx:19` — `<Datagrid>` does **not** set `bulkActionButtons={false}`, so react-admin's default bulk-delete button is exposed. `BookingEdit`'s `<Edit>` (line 47) uses the default toolbar, which includes `DeleteButton`. (The nested add-ons `<ArrayField>` at line 70 *does* set `bulkActionButtons={false}` — the pattern is known in this file, just not applied to the top-level list.)

**FK cascade is RULED OUT as a cause** — already correct in both Drizzle and live SQL:
- `lib/db/schema.ts:238-240` `bookingAddons.bookingId` → `onDelete: "cascade"`
- `lib/db/schema.ts:253-255` `bookingStatusHistory.bookingId` → `onDelete: "cascade"`
- `init/009_course_addons.sql:32` — `booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE`
- `init/001_init.sql:239-240` — same for `booking_status_history`

Therefore **no manual child-row cleanup is needed** before `db.delete(bookings)`.

**Copy-ready source**: `app/api/admin/products/[id]/route.ts:90-121` and `app/api/admin/courses/[id]/route.ts:87-118` are structurally identical working DELETE handlers.

**Next.js 15 param convention (consistent across all admin routes)**:
```ts
{ params }: { params: Promise<{ id: string }> }
const { id } = await params;
```

### 0.2 Verified facts — BUG B (course description)

**This is NOT mojibake.** Byte-level greps for `â€™ â€œ â€ Â ï»¿` and for raw HTML entities (`&amp; &#8217; &nbsp; &rsquo; &quot;`) across `init/003_real_data.sql`, `init/002_migrate.sql`, `init/007_prod_sync.sql`, and `recovery/0c-courses.md` returned **zero matches**. A raw byte scan for `\xc3\xa2` across all `init/*.sql` also returned zero.

**Actual root cause — a storage/render format mismatch:**
- `app/admin/components/RichTextInput.tsx:98` — `onUpdate: ({ editor }) => field.onChange(editor.getHTML())`. The Tiptap editor writes an **HTML string** (`<p>Text with <strong>bold</strong> &amp; a link</p>`).
- `app/admin/courses.tsx:56,60,75,79` — wires `RichTextInput` to `source="description"` **and** `source="prerequisites"` on both Create and Edit.
- `app/api/admin/courses/route.ts:45` and `app/api/admin/courses/[id]/route.ts:61` persist `body.description` verbatim — no sanitization or stripping.
- `app/courses/[slug]/page.tsx:80,85` — renders `{course.description}` / `{course.prerequisites}` as **plain React text nodes** inside `<p className="... whitespace-pre-line">`. React escapes the string, so literal `<p>`, `<strong>`, `&amp;` are shown to visitors.

**Blast radius**: only courses edited at least once through `/admin` since `RichTextInput` was added. Untouched seed rows are clean plain text (blank-line separated), which `whitespace-pre-line` renders correctly. `app/courses/page.tsx` renders only `course.tagline`, never `description` — **the listing page is unaffected**; the bug is confined to the detail page. `app/admin/course-addons.tsx:65-71` uses plain `TextInput multiline` — unaffected.

**Schema**: `lib/db/schema.ts:157-171` — `courses.name` (NOT `title`), `description: text`, `prerequisites: text`. Both nullable.

**Design decision (mine)**: fix at the **render layer** with a shared helper that handles *both* formats, rather than a data migration. Rationale: legacy plain-text rows and new HTML rows coexist permanently as long as `RichTextInput` stays, so the renderer must be format-tolerant regardless. A data migration alone would be re-broken by the next admin edit.

### 0.3 Verified facts — FEATURE (waitlist)

**No pre-existing waitlist code, table, or route exists anywhere** (grepped `app/`, `components/`, `lib/db/schema.ts`). Genuinely new.

**Sold-out / no-dates trigger point — `app/components/BookingButton.tsx:46, 90-96`:**
```tsx
const openSchedules = schedules.filter((s) => s.status === "open" && s.availableSeats > 0);
...
if (openSchedules.length === 0) {
  return (
    <div className="tactical-btn-primary w-full text-center block text-sm mt-4 opacity-50 cursor-not-allowed py-3">
      NO UPCOMING DATES
    </div>
  );
}
```
This exact block is where the waitlist CTA replaces the dead disabled div.

**`scheduleStatusEnum` (`lib/db/schema.ts:22`) is `open | full | cancelled`.** Do NOT add a `"waitlist"` value — the waitlist is a separate table.

**Public POST route template** — `app/api/contact/route.ts:1-49` (rate limit → Zod safeParse → DB insert). Duplicate-key 409 variant — `app/api/newsletter/route.ts` (`err.code === "23505"` → 409).

**Zod v4.3.6 confirmed** (`package.json:47`). Idiom is `result.error.issues[0].message`. **`result.error.errors` does not exist and appears nowhere in this repo.**

**Rate limiting** — `lib/rate-limit.ts` exports `getClientIP(req)` and `isRateLimited(ip)`. In-memory Map, 5 req/min per IP.

**Client form template** — `components/contact/contact-form.tsx:1-58`. Plain `useState` status machine (`idle | loading | success | error`), no form library. Reuse these exact class strings:
- input: `w-full bg-[#0a0a0a] border border-[#262626] text-white px-4 py-3 text-sm placeholder:text-[#9ca3af] focus:outline-none focus:border-[#B22222]`
- submit: `tactical-btn-primary w-full text-sm`

Duplicate-entry UI branch — `components/home/newsletter-form.tsx:7,18,43`.

**React-Admin contract** — `lib/dataProvider.ts` expects `{ data, total }` JSON bodies (**not** `Content-Range` headers). `getList` sorts/filters/paginates **client-side** over the whole array, so a new list route just returns everything. `getOne`/`update`/`delete` hit `${apiUrl}/${resource}/${id}`.

⚠️ **Do NOT copy `app/api/admin/contact-submissions/route.ts`** — it puts `PUT` on the base route reading `id` from the body, and has no `[id]/route.ts`. That path is broken/dead (dataProvider.update would 404). **Copy the bookings pair instead**: `app/api/admin/bookings/route.ts:1-55` + `app/api/admin/bookings/[id]/route.ts:1-103`.

**Email** — `lib/email.ts` exports `sendBookingConfirmation`, `sendPaymentReceipt`, `sendCourseReminder`, `sendPasswordReset` (last two defined but never invoked). Internal non-exported helpers: `deliver({to,subject,text,html})` (throws on missing key / on Resend `{error}`), `escapeHtml(s)`, `retryWithBackoff(fn, maxRetries=3, baseDelay=1000)`. Any new send function must go through `deliver()`, must `escapeHtml()` every interpolated user string, and must return `boolean` via `try { await retryWithBackoff(...); return true } catch { return false }`.

**Fire-and-forget idiom** — `app/api/revere/callback/route.ts:125-141`:
```ts
sendX(email, {...})
  .then((sent) => console.log("[email] ...", id, sent))
  .catch((err) => console.error("[email] ... failed", id, err));
```

**Migration convention** — `init/001`…`init/010` exist. **Next file is `init/011_waitlist.sql`.** Template: `init/009_course_addons.sql:1-39` (`DO $$ ... IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='...') THEN CREATE TYPE ... END IF; END $$;`, `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).

**Postgres is `postgres:16-alpine`** (`docker-compose.yml:3`) — `UNIQUE NULLS NOT DISTINCT` is available.

**Middleware** — `middleware.ts:44` matcher `["/((?!api|_next/static|_next/image|favicon.ico).*)"]` already excludes all `/api/*`. `protectedRoutes` (9-14) = `["/dashboard","/profile","/cart","/orders","/bookings"]`. **Do not add any waitlist path** — the feature must stay public.

**`force-dynamic`** — required first line of any DB-querying page: `export const dynamic = 'force-dynamic';` (`app/courses/page.tsx:1`).

### 0.4 Verified facts — deploy & data safety

- **`init/*.sql` scripts run ONLY on a fresh empty Postgres volume** (`docker-entrypoint-initdb.d` contract; data lives in the separate named volume `postgres_data`). Adding `init/011_waitlist.sql` therefore **cannot** auto-run against production's existing data. It only executes when piped in manually.
- **Destructive-statement audit of `init/001`–`010`**: zero `DROP TABLE`, zero `TRUNCATE`, zero `DROP COLUMN`, zero unqualified `UPDATE`/`DELETE`. Two qualified hits, both in `init/003_real_data.sql`: line 423-430 `DELETE FROM instructor_profiles WHERE name IN ('John Smith','Sarah Johnson')` (narrow, low risk) and line 433-434 `UPDATE instructor_profiles SET is_active = FALSE WHERE name != 'Carmine Mattozzi'` (**broad WHERE — medium risk if ever re-run**). Neither runs under normal `pull && up -d` operation.
- **`rsync init/` to the droplet is safe** (no `--delete`; the files are inert text on disk — Postgres does not re-execute them).
- **No `typecheck` or `test` npm script exists.** `package.json` scripts: `dev`, `build`, `start`, `lint`, `db:generate`, `db:push`, `db:studio`, `db:seed`. Typecheck must be run as **`npx tsc --noEmit`**.
- `tests/*.py` are 5 ad-hoc Python Playwright scripts with **stale hardcoded creds** (`admin@acdefenseco.com`/`admin123`, vs the real seeded `admin@acdefenseco.net`/`password123`). Not a runnable suite — do not rely on them.
- `validate-deployment.sh` hardcodes the **legacy** `REMOTE_URL="https://acdefense.chicagojoe.dev"`, not `acdefenseco.net` — stale, needs a URL override to be useful.
- `docker compose ps` at plan time: **no local containers running.**

### 0.5 Anti-patterns to avoid (global, all phases)

- ❌ `result.error.errors` — Zod v4 uses `.issues`
- ❌ `Content-Range` headers in admin routes — this repo uses `{data,total}` JSON bodies
- ❌ Copying the `contact-submissions` PUT-in-body admin route pattern
- ❌ `await`-ing an email send inside a request handler that responds to a user — always fire-and-forget
- ❌ Calling `resend.emails.send` directly — must go through `deliver()` in `lib/email.ts`
- ❌ Adding a `"waitlist"` value to `scheduleStatusEnum`
- ❌ Adding any waitlist path to `middleware.ts` `protectedRoutes`
- ❌ Omitting `export const dynamic = 'force-dynamic'` on a DB-querying page → build crashes with `ENOTFOUND postgres`
- ❌ `db.query.<table>.with()` — **no Drizzle `relations()` are defined anywhere**; use explicit `select`/`leftJoin`/`inArray`
- ❌ `BookingStatus "paid"` — the enum value is `"completed"`
- ❌ Bare `docker compose up -d` locally
- ❌ `courses.title` — the column is `courses.name`

---

## Phase 1: BUG A — Booking delete (sonnet)

### What to implement

**1a.** Add a `DELETE` export to `app/api/admin/bookings/[id]/route.ts` by **copying `app/api/admin/products/[id]/route.ts:90-121` verbatim** and swapping the table to `bookings`. `bookings` and `eq` are already imported in the target file — no new imports needed.

```ts
// DELETE /api/admin/bookings/[id] - Delete a booking
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    const bookingId = parseInt(id);
    if (Number.isNaN(bookingId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const [deletedBooking] = await db
      .delete(bookings)
      .where(eq(bookings.id, bookingId))
      .returning();
    if (!deletedBooking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    return NextResponse.json({ data: deletedBooking });
  } catch (error) {
    console.error("Error deleting booking:", error);
    return NextResponse.json({ error: "Failed to delete booking" }, { status: 500 });
  }
}
```
The `Number.isNaN` guard is an addition over the copied template — it matches the NaN-guard hardening already applied to the Revere callbacks in commit `d82058f`.

**1b.** Child rows cascade automatically (§0.1) — **do not** write manual `booking_addons` / `booking_status_history` cleanup.

### Verification checklist

- [ ] `grep -n "export async function DELETE" app/api/admin/bookings/\[id\]/route.ts` → 1 hit
- [ ] `npx tsc --noEmit` → exit 0
- [ ] Deferred to Phase 6: delete a seeded booking from `/admin` and confirm 200 + row gone + cascaded children gone

### Anti-pattern guards

- ❌ Do not use the sync `{ params }: { params: { id: string } }` form — Next.js 15 requires `Promise` + `await`
- ❌ Do not add manual child deletes
- ❌ Do not skip the `role !== "admin"` 401 check

---

## Phase 2: BUG B — Course description rendering (sonnet)

### What to implement

**2a.** Add `isomorphic-dompurify` to `package.json` (`npm install isomorphic-dompurify`). It works in both the Node server-render path and the browser, which a plain `dompurify` does not. Content is admin-authored, but sanitizing defends against an admin-account compromise and costs nothing.

**2b.** Create `lib/rich-text.ts` — a **format-tolerant** helper, because legacy plain-text rows and new Tiptap-HTML rows coexist permanently (§0.2):

```ts
import DOMPurify from "isomorphic-dompurify";

const HTML_TAG_RE = /<\/?[a-z][\s\S]*>/i;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Normalizes a DB text field that may be EITHER legacy plain text (seed data,
 * blank-line separated) OR Tiptap HTML (written by admin RichTextInput) into
 * sanitized HTML safe for dangerouslySetInnerHTML.
 */
export function renderRichText(value: string | null | undefined): string {
  if (!value) return "";
  const looksLikeHtml = HTML_TAG_RE.test(value);
  const html = looksLikeHtml
    ? value
    : escapeHtml(value)
        .split(/\n{2,}/)
        .map((p) => `<p>${p.replace(/\n/g, "<br />")}</p>`)
        .join("");
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p","br","strong","em","u","s","ul","ol","li","a","h2","h3","h4","blockquote","code"],
    ALLOWED_ATTR: ["href","target","rel"],
  });
}
```

**2c.** Update the two render sites in `app/courses/[slug]/page.tsx` (lines 80 and 85). Replace the plain-text render with:
```tsx
<div
  className="... prose-like tactical-body"
  dangerouslySetInnerHTML={{ __html: renderRichText(course.description) }}
/>
```
Drop `whitespace-pre-line` from those two elements — it is now redundant and would double-space the generated `<p>` tags. Preserve every other existing class on those elements.

**2d.** Add minimal typography CSS so generated `<p>/<ul>/<strong>` inherit the site's tactical styling rather than browser defaults. Scope it to a single new class used only by these blocks; do not restyle globals.

### Verification checklist

- [ ] `npx tsc --noEmit` → exit 0
- [ ] `grep -rn "whitespace-pre-line" app/courses/\[slug\]/page.tsx` → no hits on the description/prerequisites elements
- [ ] Phase 6 browser check: a course whose description was saved via `/admin` renders formatted text with **no literal `<p>` or `&amp;` visible**
- [ ] Phase 6 browser check: an untouched seed course still renders correct paragraph breaks
- [ ] `grep -rn "dangerouslySetInnerHTML" app/courses/` → only the two intended sites

### Anti-pattern guards

- ❌ Do not use `dangerouslySetInnerHTML` without routing through `renderRichText` (no raw unsanitized insert)
- ❌ Do not "fix" this by stripping tags in the API write path — that would silently destroy admin formatting
- ❌ Do not write a data migration that rewrites `courses.description` on prod (violates the no-data-loss constraint; unnecessary given the tolerant renderer)
- ❌ Do not touch `app/courses/page.tsx` — it renders only `tagline` and is unaffected

---

## Phase 3: FEATURE — Waitlist schema + migration (sonnet)

### Design decision (mine — unifies both user asks)

The user asked for two things that share one data shape: "request a class" (no dates scheduled / wants a new date) and "join a waitlist" (a specific date is sold out). Implement as **one `waitlist_entries` table** with two nullable FKs:

- `course_id` NULL ⇒ general "request any class / private training" enquiry
- `course_id` set, `schedule_id` NULL ⇒ "notify me when dates are announced for this course"
- `course_id` + `schedule_id` set ⇒ "this specific date is sold out, add me to its waitlist"

### What to implement

**3a.** Add to `lib/db/schema.ts`, following the style of `contactSubmissions` (`lib/db/schema.ts:329-338`):

```ts
export const waitlistStatusEnum = pgEnum("waitlist_status", [
  "pending",
  "contacted",
  "converted",
  "cancelled",
]);

export const waitlistEntries = pgTable("waitlist_entries", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").references(() => courses.id, { onDelete: "cascade" }),
  scheduleId: integer("schedule_id").references(() => courseSchedules.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  partySize: integer("party_size").default(1).notNull(),
  message: text("message"),
  status: waitlistStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  notifiedAt: timestamp("notified_at"),
});
```

**3b.** Create `init/011_waitlist.sql`, copying the idempotent structure of `init/009_course_addons.sql:1-39`:
- `DO $$ ... IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='waitlist_status') THEN CREATE TYPE ... END IF; END $$;`
- `CREATE TABLE IF NOT EXISTS waitlist_entries (...)` with `REFERENCES courses(id) ON DELETE CASCADE` and `REFERENCES course_schedules(id) ON DELETE CASCADE`
- `CREATE INDEX IF NOT EXISTS idx_waitlist_course ON waitlist_entries(course_id);`
- `CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist_entries(status);`
- Duplicate guard — Postgres 16 supports this (verified `postgres:16-alpine`):
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_waitlist_entry ON waitlist_entries (email, course_id, schedule_id) NULLS NOT DISTINCT;`
  This makes the 409-duplicate path in Phase 4 fire correctly even when `course_id`/`schedule_id` are NULL.
- The file must be **purely additive** — no `DROP`, no `TRUNCATE`, no `DELETE`, no `ALTER ... DROP`.

### Verification checklist

- [ ] `grep -cE "DROP|TRUNCATE|DELETE FROM" init/011_waitlist.sql` → **0**
- [ ] Applied twice in a row against the local DB with no error (proves idempotency):
      `docker compose exec -T postgres psql -U acdefense -d acdefense < init/011_waitlist.sql` ×2
- [ ] `\d waitlist_entries` shows both indexes and the `NULLS NOT DISTINCT` unique index
- [ ] `npx tsc --noEmit` → exit 0
- [ ] Drizzle schema and SQL agree on every column name/type/nullability (manual diff)

### Anti-pattern guards

- ❌ Do not run `npm run db:push` against any remote DB — migrations here are hand-written SQL files
- ❌ Do not renumber or edit `init/001`–`010`
- ❌ Do not add a `"waitlist"` value to `scheduleStatusEnum`

---

## Phase 4: FEATURE — Public API + form UI (sonnet)

### What to implement

**4a.** `app/api/waitlist/route.ts` — **copy the skeleton from `app/api/contact/route.ts:1-49`** and the 409 branch from `app/api/newsletter/route.ts`:
- `getClientIP` / `isRateLimited` guard → 429
- Zod v4 schema: `name` (min 1, trim), `email` (`.email()`), `phone` optional, `courseId` optional `number`, `scheduleId` optional `number`, `partySize` optional int ≥1 default 1, `message` optional
- `result.error.issues[0].message` on failure → 400 (**never `.errors`**)
- Insert into `waitlistEntries` with `email.toLowerCase()`
- Catch `err.code === "23505"` → **409 "You're already on this waitlist"**
- Fire-and-forget confirmation email (see 4c) — **never `await`**
- Return `{ success: true }`

**4b.** `components/waitlist/waitlist-form.tsx` — **copy `components/contact/contact-form.tsx:1-58` structure**. `"use client"`, `useState` status machine extended with a `"duplicate"` branch (pattern: `components/home/newsletter-form.tsx:7,18,43`). Reuse the exact `inputClass` and `tactical-btn-primary w-full text-sm` strings from §0.3. Accepts optional `courseId` / `scheduleId` / `courseName` props.

**4c.** Add `sendWaitlistConfirmation(to, { courseName?, name })` to `lib/email.ts`, modeled on `sendBookingConfirmation` (`lib/email.ts:89-144`). Must go through the internal `deliver()`, must `escapeHtml()` every interpolated value, must return `boolean` via `try { await retryWithBackoff(...); return true } catch { return false }`.

**4d.** Wire the CTA into `app/components/BookingButton.tsx`. Replace the dead disabled `NO UPCOMING DATES` div (lines 90-96) with a clickable "REQUEST THIS CLASS" control that opens the waitlist form in the existing modal pattern used by this component. Additionally, when `openSchedules.length > 0` but a *specific* schedule has `availableSeats === 0`, offer "JOIN WAITLIST" for that date.

**4e.** Add a standalone public page `app/waitlist/page.tsx` (general "Request a Class" enquiry, `courseId` unset) with `export const dynamic = 'force-dynamic';` as line 1 if it queries the DB for a course dropdown.

### Verification checklist

- [ ] `grep -rn "error.errors" app/api/waitlist/` → **0 hits**
- [ ] `grep -rn "await send" app/api/waitlist/route.ts` → **0 hits** (must be fire-and-forget)
- [ ] `npx tsc --noEmit` → exit 0 · `npm run lint` clean
- [ ] `curl -X POST localhost:3000/api/waitlist -d '{}'` → 400 with a Zod message, **not** a 500 with empty body
- [ ] Same valid payload twice → 200 then **409**
- [ ] 6 rapid requests → **429**
- [ ] `grep -n "protectedRoutes" middleware.ts` → unchanged, no waitlist path added

### Anti-pattern guards

- ❌ No auth requirement anywhere in this flow — visitors are unauthenticated by design
- ❌ Do not create a `users` row for a waitlist signup (unlike guest booking — a waitlist entry is not a customer yet)
- ❌ Do not call `resend.emails.send` directly
- ❌ Do not block the HTTP response on the email

---

## Phase 5: FEATURE — Admin resource (sonnet)

### What to implement

**5a.** `app/api/admin/waitlist/route.ts` (GET list) + `app/api/admin/waitlist/[id]/route.ts` (GET one, PUT, DELETE) — **copy `app/api/admin/bookings/route.ts:1-55` + `app/api/admin/bookings/[id]/route.ts:1-103`**, which are the internally-consistent pair. Every handler checks `session.user.role !== "admin"` → 401. List returns `{ data, total }`. Include the Phase 1 DELETE pattern here too so the admin can clear stale entries.

**5b.** `app/admin/waitlist.tsx` — `WaitlistList` + `WaitlistEdit`, modeled on `app/admin/contact-submissions.tsx:1-30` (the *component* file is a fine template; only its API route was broken). Show name, email, phone, course, requested date, party size, status, created. Edit exposes a `SelectInput` for `status`.

**5c.** Register in `app/admin/AdminApp.tsx`: one import + `<Resource name="waitlist" list={WaitlistList} edit={WaitlistEdit} />`.

**5d.** Resolve the course/schedule names for display. **No Drizzle `relations()` exist** — use an explicit `leftJoin` in the list route, or a single `inArray` fetch grouped in JS. Never `db.query.waitlistEntries.with()`. Avoid N+1.

**5e.** Fix the latent delete-affordance inconsistency found in Phase 0: `app/admin/bookings.tsx:19` now has a real DELETE backend, so leaving the buttons is correct — just confirm they work in Phase 6.

### Verification checklist

- [ ] `GET /api/admin/waitlist` unauthenticated → **401**
- [ ] Authenticated as admin → `{ data: [...], total: n }` shape
- [ ] `grep -rn "Content-Range" app/api/admin/waitlist/` → **0 hits**
- [ ] `grep -rn "db.query" app/api/admin/waitlist/` → **0 hits**
- [ ] `npx tsc --noEmit` → exit 0
- [ ] Resource appears in the admin sidebar and the list loads

---

## Phase 6: Local integration testing (sonnet + `/claude-in-chrome`)

**Start the stack correctly — scoped, never the tunnel:**
```bash
docker compose up -d --build postgres acdefense
docker compose ps
docker compose logs acdefense --tail 50
```
Apply the new migration to the **local** DB (the container is already initialized, so `init/011` will not auto-run):
```bash
docker compose exec -T postgres psql -U acdefense -d acdefense < init/011_waitlist.sql
```

### Test matrix (all via `/claude-in-chrome` against `http://localhost:3000`)

| # | Test | Pass criteria |
|---|------|---------------|
| 1 | Course detail page, seed course | Description renders with paragraph breaks, **no literal `<p>`/`&amp;`** |
| 2 | Edit that course's description in `/admin` (bold + an `&`), save, reload public page | Formatted correctly, no literal tags — **this is the BUG B regression test** |
| 3 | Course with no open schedules | Shows an actionable "REQUEST THIS CLASS" CTA, not a dead disabled div |
| 4 | Submit the waitlist form as a logged-out visitor | 200, success state, row in `waitlist_entries` |
| 5 | Submit identical payload again | **409**, friendly duplicate message (not a crash) |
| 6 | Submit with empty body / bad email | 400 with a readable Zod message |
| 7 | 6 rapid submits | **429** |
| 8 | `/admin` → Waitlist resource | Entry visible with course name resolved; status edit persists |
| 9 | **`/admin` → Bookings → delete a seeded booking** | **200, row gone — this is the BUG A regression test** |
| 10 | Verify cascade after #9 | `booking_addons` + `booking_status_history` rows for that id are gone |
| 11 | Bulk-select 2 bookings → bulk delete | Both deleted, no error toast |
| 12 | `npm run build` | Succeeds — catches any missing `force-dynamic` (`ENOTFOUND postgres`) |

Log in at `/login` with `admin@acdefenseco.net` / `password123` **before** navigating to `/admin` (admin redirects to `/` when unauthenticated). Ignore `tests/*.py` — stale creds, not a real suite.

### Verification checklist
- [ ] All 12 rows pass; capture screenshots for the visual ones (1, 2, 3, 8, 9)
- [ ] `docker compose logs acdefense` shows no unhandled errors during the run

---

## Phase 7: Final validation (opus, medium effort) — BLOCKING GATE

A single opus subagent reviews the complete diff **before anything is pushed**. It must not rubber-stamp; it reports findings with file:line.

Review dimensions:
1. **Correctness vs. Phase 0 facts** — every API used actually exists; no invented methods/params
2. **Anti-pattern grep sweep** — `error.errors`, `Content-Range`, `db.query.*.with(`, `courses.title`, `"paid"`, bare `dangerouslySetInnerHTML`, `await send*` in handlers, missing `force-dynamic`
3. **Security** — waitlist endpoint is rate-limited + Zod-validated; no SQL injection; every admin route enforces `role === "admin"`; XSS closed on the rich-text path; no PII leaked in logs
4. **Data safety** — `init/011_waitlist.sql` is additive-only and idempotent; nothing in the diff mutates existing bookings/orders/schedules rows
5. **Migration/schema parity** — `lib/db/schema.ts` matches `init/011_waitlist.sql` exactly
6. **Deploy readiness** — `npx tsc --noEmit` and `npm run build` both clean

**Gate**: any CRITICAL or HIGH finding → fix (sonnet) and re-run Phase 7 before proceeding. Do not deploy on an unresolved HIGH.

---

## Phase 8: Deploy — staged, data-preserving

### Data-preservation guarantees (restating the hard constraint)
- Steps 1-2 touch no remote host.
- Step 3 runs against **staging's separate volume** (`postgres_staging_data`).
- Step 4 takes a **fresh `pg_dump` before** touching prod, and executes **only `init/011_waitlist.sql`** — files 001-010 are never re-run (and contain no `DROP`/`TRUNCATE` anyway, per §0.4).
- Step 5 swaps only the **app container image**; the `postgres_data` volume is never touched. **No `down -v` anywhere.**
- `init/011` is purely `CREATE ... IF NOT EXISTS` — it cannot modify existing sales, booking, or calendar rows.

```bash
# --- 1. Commit ---
git checkout -b feat/waitlist-and-fixes
git add -A && git commit    # conventional commit; Co-Authored-By trailer

# --- 2. Final local gate ---
npx tsc --noEmit && npm run lint && npm run build

# --- 3. STAGING ---
rsync -av -e "ssh -i ~/.ssh/id_ed25519-doctl" init/ root@45.55.235.37:/root/acdefense-website/init/
ssh -i ~/.ssh/id_ed25519-doctl root@45.55.235.37 \
  "docker exec -i postgres-staging psql -U acdefense -d acdefense < /root/acdefense-website/init/011_waitlist.sql"
docker buildx build --platform linux/amd64 -t ghcr.io/chicago-joe/acdefense:staging . --push
ssh -i ~/.ssh/id_ed25519-doctl root@45.55.235.37 \
  "cd /root/acdefense-website && docker compose -f docker-compose.staging.yml pull && \
   docker compose -f docker-compose.staging.yml --env-file .env.staging up -d --force-recreate"
# Smoke-test https://staging.acdefenseco.net — repeat Phase 6 tests 1,2,3,4,5,9

# --- 4. PROD MIGRATION (backup first) ---
ssh -i ~/.ssh/id_ed25519-doctl root@45.55.235.37 \
  "docker exec postgres pg_dump -U acdefense -Fc acdefense > /root/backups/acdefense-prewaitlist-\$(date +%Y%m%d-%H%M%S).dump"
ssh -i ~/.ssh/id_ed25519-doctl root@45.55.235.37 "ls -lh /root/backups/ | tail -3"   # confirm fresh, >50KB
ssh -i ~/.ssh/id_ed25519-doctl root@45.55.235.37 \
  "docker exec -i postgres psql -U acdefense -d acdefense < /root/acdefense-website/init/011_waitlist.sql"

# --- 5. PROD DEPLOY (both tags — droplet resolves ${deployment:-development}) ---
docker buildx build --platform linux/amd64 \
  -t ghcr.io/chicago-joe/acdefense:development \
  -t ghcr.io/chicago-joe/acdefense:production \
  -t ghcr.io/chicago-joe/acdefense:staging . --push
ssh -i ~/.ssh/id_ed25519-doctl root@45.55.235.37 \
  "cd /root/acdefense-website && docker compose pull && docker compose up -d --force-recreate website"
ssh -i ~/.ssh/id_ed25519-doctl root@45.55.235.37 "docker logs website --tail 50"
```

### Post-deploy verification
- [ ] `https://acdefenseco.net` loads; a course detail page renders descriptions cleanly
- [ ] Waitlist form submits successfully from the public site
- [ ] `/admin` → Waitlist shows the entry; booking delete works
- [ ] **Sales data intact**: `SELECT count(*) FROM bookings; SELECT count(*) FROM orders;` match pre-deploy counts (capture them in step 4 before migrating)
- [ ] **Calendar data intact**: `SELECT count(*) FROM course_schedules;` unchanged
- [ ] No errors in `docker logs website`

### Rollback
`docker compose pull` the previous image digest and `up -d --force-recreate website`. The DB needs no rollback — `init/011` only *adds* a table; dropping it is optional and not required for the app to work on an older image (older code simply never queries it).

---

## Phase 9: Documentation + memory

- [ ] Update `CLAUDE.md`: new `waitlist_entries` table in the schema table, `/waitlist` in public pages, `/api/waitlist` in public API, `/api/admin/waitlist` in admin API, and a Critical Gotcha for the RichTextInput-HTML-vs-plain-text renderer contract
- [ ] Save a session memory capturing the two root causes (missing DELETE export; Tiptap HTML vs plain-text render) — both are non-obvious and cost real discovery time
