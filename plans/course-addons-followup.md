# Plan: Course Add-ons Follow-up — Post-purchase Visibility, Confirmation Emails, Dead-code Removal, Deploy

Context: The course add-ons feature (schema `course_addons`/`booking_addons`, AddonSelector, booking API validation, Revere amount recomputation, admin CRUD) is complete, verified locally, and **uncommitted**. This plan finishes the follow-up items and ships everything to production.

Subagent policy (user-mandated):
- **haiku** subagents: full-file reads, shell/DB verification, and post-deploy browser testing via claude-in-chrome
- **sonnet** subagents: implementation
- **opus** subagents: review/validation before deploy
- Use `/ui-design` / `/ui-ux-pro-max` tooling where it helps UI work.

---

## Phase 0: Documentation Discovery — COMPLETE (findings below; do not re-run)

### Allowed APIs / verified facts (with sources)

**Schema** (`lib/db/schema.ts`):
- `bookings` (lines ~189-205): `id, userId, scheduleId, paymentStatus, stripePaymentId, revereTransactionId, constantcontactContactId, googleCalendarEventId, createdAt`
- `bookingAddons` (lines ~228-240): `id, bookingId, addonId (nullable, SET NULL), nameAtBooking, priceAtBooking (decimal string), quantity, createdAt`
- `courseAddons` (lines ~209-223). No Drizzle `relations()` exist anywhere — use explicit joins/`inArray` queries, NOT `db.query.*.with()`.
- `paymentStatusEnum`: pending | completed | failed | refunded

**Customer dashboard** (`app/dashboard/page.tsx`):
- Server component; booking query at lines 24-37 joins bookings→courseSchedules→courses selecting `id, paymentStatus, createdAt, courseName, startDate, endDate`
- Booking cards render at lines 113-127. Add-ons list slots inside each card.

**Admin** (`app/admin/bookings.tsx`):
- `BookingList` (16-34), `BookingEdit` (37-62). No Show view. `lib/dataProvider.ts` expects `{ data, total }` from `GET /api/admin/<resource>` and `{ data }` from `/<id>`; all filtering/sorting is client-side; extra fields in `data` are fine.
- `GET /api/admin/bookings` (`route.ts` line 15) is a raw `db.select().from(bookings)` — no joins.
- `GET/PUT /api/admin/bookings/[id]` — raw single-row fetch; PUT updates paymentStatus + inserts `bookingStatusHistory`.

**Email** (`lib/sendgrid.ts`):
- Client init lines 4-6: **silently no-ops if `SENDGRID_API_KEY` unset** — safe to wire calls even with placeholder key. From: `SENDGRID_FROM_EMAIL || "noreply@acdefenseco.com"`.
- `sendBookingConfirmation(to, {courseName, startDate, endDate, location?, bookingId}) → Promise<boolean>` — no line-item support.
- `sendPaymentReceipt(to, {orderId, amount, items: {name, quantity, price}[], stripePaymentId?}) → Promise<boolean>` — itemized, **currently never called** (ready to use).
- `sendBookingConfirmation` is only called from `app/api/webhooks/calendly/route.ts:140-145`.

**Revere callbacks**:
- `app/api/revere/callback/route.ts`: idempotency guard lines 25-39 (early success-redirect if already completed); completion tx lines 46-57. **Email goes after line 57, before redirect (59-61)** — that runs exactly once thanks to the guard. Only `bookingId` in scope; must fetch user email + course + schedule + bookingAddons.
- `app/api/revere/shop-callback/route.ts`: guard lines 23-37; completion lines 44-50 (no tx). Email goes after line 50. Must fetch order + orderItems + customer email (`orders` has user or guestEmail — check exact columns before use).

**Dead code (verified via repo-wide grep)**:
- `components/courses/course-detail-client.tsx` — zero importers.
- `components/booking/booking-dialog.tsx` — sole importer is course-detail-client. Both safe to delete.

**Env**: `.env` has `SENDGRID_API_KEY` placeholder + `SENDGRID_FROM_EMAIL=noreply@acdefenseco.com`. Emails will silently not send until a real key is provided — acceptable; wiring is still correct.

### Anti-patterns to avoid
- ❌ `db.query.bookings.findMany({ with: ... })` — no relations() defined; use explicit `select`/`leftJoin`/`inArray`.
- ❌ Zod `.errors` — Zod v4 uses `.issues`.
- ❌ `BookingStatus "paid"` — enum value is `"completed"`.
- ❌ Forgetting `export const dynamic = "force-dynamic"` on DB-querying pages (dashboard already has it — don't remove).
- ❌ Making email failures break the callback: email calls must be fire-safe (`await` but ignore/log failure; sendgrid functions already return boolean, never throw).
- ❌ Sending email before/inside the idempotency-guarded completion path incorrectly (double-fire) — it must be inside the "we just transitioned to completed" branch only, never in the early-return already-completed branch.
- ❌ N+1 queries in admin list — fetch all bookingAddons with one `inArray(bookingAddons.bookingId, ids)` query and group in JS.
- ❌ Bare `docker compose up -d` locally (joins prod tunnel). Local dev: `docker compose up -d --build postgres acdefense`.

---

## Phase 1: Commit current add-ons feature (baseline)

The verified add-ons work must land as its own commit before follow-up work.

Tasks (orchestrator or sonnet subagent):
1. `git add` exactly: `lib/db/schema.ts`, `init/009_course_addons.sql`, `components/booking/addon-selector.tsx`, `app/components/BookingButton.tsx`, `app/api/bookings/route.ts`, `app/api/revere/checkout/route.ts`, `app/courses/[slug]/page.tsx`, `app/admin/course-addons.tsx`, `app/api/admin/course-addons/`, `app/admin/AdminApp.tsx`. **Exclude `.serena/project.yml`** and stray screenshots.
2. Commit: `feat(courses): configurable billable add-ons on course bookings` with body describing snapshot pricing + server-authoritative Revere amount. Include the Fable co-author + session trailers.

Verification: `git status` shows only `.serena/project.yml` modified; `git show --stat HEAD` lists the expected files.

---

## Phase 2: Dead-code removal (sonnet subagent, separate commit)

1. Delete `components/booking/booking-dialog.tsx` and `components/courses/course-detail-client.tsx`.
2. Grep repo for `BookingDialog|CourseDetailClient|booking-dialog|course-detail-client` — must return zero matches outside deleted files.
3. `npx tsc --noEmit` must exit 0.
4. Commit: `chore: remove dead BookingDialog/CourseDetailClient components`.

---

## Phase 3: Post-purchase add-on visibility (sonnet subagent)

### 3a. Customer dashboard (`app/dashboard/page.tsx`)
- After the existing booking query (lines 24-37), collect booking ids and run ONE query: `db.select().from(bookingAddons).where(inArray(bookingAddons.bookingId, ids))`; group by bookingId in JS.
- In each booking card (render block lines 113-127), when the booking has add-ons, render a small itemized list: `nameAtBooking`, `× quantity` (only when quantity > 1), and line total `(priceAtBooking * quantity)`; style consistent with the existing tactical dark theme (match classes already in the file — `text-[#9ca3af]`, `tactical-*`). Optionally a "Total paid" line = course price + add-ons (course price is available via the existing join — add `price: courses.price` to the select if needed).

### 3b. Admin bookings (API + react-admin)
- `app/api/admin/bookings/route.ts`: after fetching bookings, fetch all their bookingAddons via one `inArray` query; attach `addons: [...]` array and `addonsTotal` (string, 2dp, integer-cents math like `app/api/revere/checkout/route.ts`) to each booking object in `data`. dataProvider passes extra fields through unchanged.
- `app/api/admin/bookings/[id]/route.ts` GET: same attachment for the single booking.
- `app/admin/bookings.tsx`:
  - `BookingList`: add a `FunctionField` "Add-ons" showing e.g. `2 items — $93.50` (or "—" when none).
  - `BookingEdit`: add a read-only add-ons section (e.g. `ArrayField source="addons"` with a `Datagrid` of nameAtBooking / quantity / priceAtBooking / line total, `bulkActionButtons={false}`), clearly non-editable — snapshots must never be edited.

Verification checklist:
- `npx tsc --noEmit` exit 0.
- Local: create a test booking with add-ons via API (pattern from previous session tests), confirm dashboard card shows itemized add-ons and admin list/edit shows them; then delete test rows.
- `curl` GET `/api/admin/bookings` as admin returns `addons` arrays.

Commit: `feat(bookings): surface purchased add-ons on customer dashboard and admin bookings`.

---

## Phase 4: Confirmation emails (sonnet subagent)

### 4a. Booking callback (`app/api/revere/callback/route.ts`)
- Inside the branch where the booking just transitioned to completed (after the tx ending line 57, before the success redirect), fetch: user email (bookings→users), course name + schedule dates (bookings→courseSchedules→courses), course price, and bookingAddons.
- Call `sendPaymentReceipt(email, { orderId: bookingId, amount: <course + addons, integer-cents math>, items: [ {name: courseName, quantity: 1, price: coursePrice}, ...addons.map(a => ({name: a.nameAtBooking, quantity: a.quantity, price: Number(a.priceAtBooking)})) ] })` — itemized, matches the new add-ons reality. Also call `sendBookingConfirmation(email, {courseName, startDate, endDate, bookingId})` for the schedule details.
- Wrap in try/catch logging only — email failure must never affect the redirect. Do NOT add email to the already-completed early-return branch.
- Optional admin notification: send the same receipt to `SENDGRID_FROM_EMAIL`/an `ADMIN_EMAIL` env var if present (add to `.env.example` only; don't invent required config).

### 4b. Shop callback (`app/api/revere/shop-callback/route.ts`)
- Same pattern after line 50: fetch order, orderItems (name/quantity/priceAtPurchase — verify exact column names in schema before writing code), and customer email (order's user email or guest email column — verify in `lib/db/schema.ts` `orders` table first). Call `sendPaymentReceipt`.

Anti-pattern guards: no throwing on email failure; no emails in early-return idempotent branch; verify `orders` column names by reading schema, don't assume.

Verification: `npx tsc --noEmit`; run a local test booking → confirm container logs show the sendgrid call attempted (it will no-op/false with placeholder key — assert the code path executes via a log line, e.g. `console.log("[email] booking receipt", bookingId, sent)`).

Commit: `feat(emails): send itemized receipt + booking confirmation on Revere completion`.

---

## Phase 5: Opus review (opus subagent, read-only)

Dispatch an opus reviewer over the diff (`git diff main~N..HEAD` or the phase commits) with focus:
- Security: no client-trusted prices; admin routes still session-gated; no snapshot mutation paths added.
- Correctness: idempotency preserved in both callbacks; single-fire email; integer-cents math; `inArray` with empty id arrays guarded (Drizzle `inArray` with `[]` throws — guard `ids.length > 0`).
- Zod v4 `.issues`, force-dynamic intact, no `relations()` API usage.
Fix any CONFIRMED findings (sonnet subagent), re-run tsc, amend/commit fixes.

---

## Phase 6: Deploy to production (orchestrator; follows CLAUDE.md exactly)

Hard constraint: **do not touch the postgres volume** (Carmine's data).

1. Push commits to `main`.
2. Apply migration to prod DB:
   ```bash
   rsync -av -e "ssh -i ~/.ssh/id_ed25519-doctl" init/ root@45.55.235.37:/root/acdefense-website/init/
   ssh -i ~/.ssh/id_ed25519-doctl root@45.55.235.37 \
     "docker exec -i postgres psql -U acdefense -d acdefense < /root/acdefense-website/init/009_course_addons.sql"
   ```
   Verify: `\dt course_addons booking_addons` via psql on droplet.
3. Build + push all three tags (tmux/background — long-running):
   ```bash
   docker buildx build --platform linux/amd64 \
     -t ghcr.io/chicago-joe/acdefense:development \
     -t ghcr.io/chicago-joe/acdefense:production \
     -t ghcr.io/chicago-joe/acdefense:staging . --push
   ```
4. `ssh ... "cd /root/acdefense-website && docker compose pull && docker compose up -d --force-recreate website"` (never `down -v`).
5. Smoke: `curl -sI https://acdefenseco.net` 200; stream logs briefly for startup errors.

---

## Phase 7: Production browser verification (haiku subagent + claude-in-chrome)

Dispatch a haiku subagent using claude-in-chrome (load tools via one ToolSearch select call; call tabs_context_mcp first; create a new tab) to verify on https://acdefenseco.net:
1. Course detail page for CCL certification loads; BOOK NOW modal opens; add-ons section renders (Range fee $35 flat + 50-round box $19.50 qty) — NOTE: prod DB won't have demo add-ons unless created; first create one add-on via the admin panel (`admin@acdefenseco.net` / seeded password) or skip and verify empty-state renders cleanly.
2. Admin → Course Add-ons resource lists/creates correctly.
3. Admin → Bookings list shows the new Add-ons column.
4. Customer dashboard (`user@example.com` if it exists in prod — otherwise verify via admin only; do NOT create test charges in prod unless Revere test mode is confirmed still enabled).
5. Report findings with screenshots. Console must be free of new errors (pre-existing ccl-certification.jpg 404 is known).

Final: report results; store session learnings; do not update CLAUDE.md unless new gotchas emerged.

---

## Execution notes
- Phases 3 and 4 touch different files except none overlap — they may run as parallel sonnet subagents IF each commits only its own files; otherwise run sequentially (default: sequential to keep commits clean).
- Every implementation subagent must run `npx tsc --noEmit` before reporting done.
- Local runtime testing uses `docker compose up -d --build postgres acdefense` only.
