# Plan: Revere Payments — Three-Step Redirect Integration

**Date:** 2026-07-01
**Scope:** Implement Revere Payments Three-Step Redirect checkout flow. Replace Stripe checkout path. Phase 6 (test transactions) BLOCKED until user confirms gateway is in Test Mode.

---

## Phase 0: Documentation Discovery (Done)

### Allowed APIs — Three-Step Redirect
**Source:** `revere_docs/Revere-Three-Step-Redirect-API.pdf` (skill: `revere-three-step-redirect-api`, reference: `~/PyCharmProjects/Skill_Seekers/output/Revere-Three-Step-Redirect-API/references/Revere-Three-Step-Redirect-API.md`)

**Step 1 POST** (PDF p.3, p.8–9):
- URL: `https://secure.reverepayments.com/api/v2/three-step`
- Content-Type: `text/xml`
- Required XML elements: `<sale>`, `<api-key>` (REVERE_PRIVATE_SECURITY_KEY), `<redirect-url>`, `<amount>` (format: `x.xx`)
- Optional: `<order-id>`, `<order-description>`, `<ip-address>`, `<billing>` block
- Response XML: `<result>1</result><form-url>https://...</form-url>` — result 1=ok, 2=declined, 3=error

**Step 2 — HTML form** (PDF p.10–11):
- `<form method="POST" action="{form-url}">` — action is the form-url from Step 1
- Required inputs: `billing-cc-number`, `billing-cc-exp` (MMYY, no slash)
- Optional: `billing-cvv`
- On submit: browser POSTs directly to Revere; Revere redirects to `{redirect-url}?token-id=TOKEN`

**Step 3 POST** (PDF p.12):
- URL: same `https://secure.reverepayments.com/api/v2/three-step`
- Body: `<complete-action><api-key>...</api-key><token-id>...</token-id></complete-action>`
- Response: `<result>1</result><transaction-id>2612675976</transaction-id><result-text>SUCCESS</result-text><authorization-code>...</authorization-code>`

**Anti-patterns:**
- NEVER send `billing-cc-number` / `billing-cc-exp` / `billing-cvv` in Step 1 — forbidden
- Response is XML, not JSON — do not `JSON.parse()`
- `form-url` is one-time use — never cache
- Do NOT use Direct Post endpoint (`/api/transact.php`) for this flow

### Codebase Findings
**Source:** Explored earlier in this session

- Booking lookup join pattern: `app/api/checkout/route.ts:27–37`
- Status update + history insert pattern: `app/api/webhooks/stripe/route.ts:48–62`
- Checkout call in dialog: `components/booking/booking-dialog.tsx:82–88` → `POST /api/checkout`
- Checkout call in button: `app/components/BookingButton.tsx:84–89` → `POST /api/checkout`
- Schema: `lib/db/schema.ts:182–197` — bookings table; `stripePaymentId: text("stripe_payment_id")`
- No `app/api/revere/` exists yet

---

## Phase 1: DB Schema — Add `revere_transaction_id`

**Goal:** Add nullable `revere_transaction_id` column to `bookings`.

### 1a. SQL migration

Create `init/006_revere_migration.sql`:
```sql
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS revere_transaction_id TEXT;
```

### 1b. Drizzle schema

File: `lib/db/schema.ts` — in the `bookings` pgTable, after line with `stripePaymentId`, add:
```ts
revereTransactionId: text("revere_transaction_id"),
```

### Apply + Verify
```bash
docker compose exec postgres psql -U acdefense -d acdefense < init/006_revere_migration.sql
docker compose exec postgres psql -U acdefense -d acdefense -c "\d bookings" | grep revere
npx tsc --noEmit --skipLibCheck 2>&1 | grep -v node_modules
```
**Pass:** column appears; zero TS errors.

**Anti-patterns:** Do not use `drizzle-kit push` — use raw SQL in `init/` like all other migrations.

---

## Phase 2: API Client — `lib/revere.ts`

**Goal:** Typed helpers for Step 1 and Step 3. No network calls yet — build XML builders + parser only.

Create `lib/revere.ts` with:

1. `buildStep1Xml(params)` — produces `<sale>` XML (PDF p.3); reads `REVERE_PRIVATE_SECURITY_KEY` from env
2. `buildStep3Xml(tokenId)` — produces `<complete-action>` XML (PDF p.12); reads same env var
3. `parseRevereXml(xml)` — regex tag extractor: `/<([a-z][a-z0-9-]*)>([^<]*)<\/\1>/g` → flat Record
4. `initiateThreeStep(params)` — fetches Step 1, throws if `result !== "1"`, returns `{ formUrl }`
5. `completeThreeStep(tokenId)` — fetches Step 3, returns `{ result, resultText, transactionId, authorizationCode, avsResult, cvvResult }`
6. `escapeXml(s)` — replace `& < > " '`

**Key types:**
```ts
interface Step1Params {
  bookingId: number; amount: string; orderDescription: string;
  redirectUrl: string; billingEmail?: string;
  billingFirstName?: string; billingLastName?: string; ipAddress?: string;
}
interface Step3Result {
  result: "1" | "2" | "3"; resultText: string; transactionId: string;
  authorizationCode?: string; avsResult?: string; cvvResult?: string;
}
```

### Verify
```bash
npx tsc --noEmit --skipLibCheck 2>&1 | grep -v node_modules
```
**Pass:** Zero errors in `lib/revere.ts`.

---

## Phase 3: API Routes

### 3a. Step 1 — `app/api/revere/checkout/route.ts`

**Goal:** Accepts `{ bookingId }`, POSTs to Revere Step 1, returns `{ url }` pointing to our Step 2 page.

Pattern to copy: `app/api/checkout/route.ts:14–51` for booking lookup + error handling.

Key logic (after booking lookup):
```ts
const redirectUrl = `${process.env.NEXTAUTH_URL}/api/revere/callback?bookingId=${bookingId}`;
const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
const { formUrl } = await initiateThreeStep({ bookingId, amount, orderDescription, redirectUrl, ipAddress });
const url = `${process.env.NEXTAUTH_URL}/checkout/revere?formUrl=${encodeURIComponent(formUrl)}&bookingId=${bookingId}&courseName=${encodeURIComponent(courseName)}&amount=${amount}`;
return NextResponse.json({ url }, { status: 200 });
```

Add `export const dynamic = "force-dynamic"` at top.

### 3b. Step 3 callback — `app/api/revere/callback/route.ts`

**Goal:** GET handler — receives `?token-id=TOKEN&bookingId=N` from Revere redirect, runs Step 3, updates DB, redirects.

Status update pattern: copy from `app/api/webhooks/stripe/route.ts:48–62` (transaction + bookingStatusHistory insert).

```ts
// approved path: set paymentStatus "completed", revereTransactionId = result.transactionId
// declined/error: set paymentStatus "failed"
// redirect to /dashboard/bookings?success=true or ?failed=true
```

Call `triggerBackup().catch(() => {})` on success (same as stripe handler line 60).

Add `export const dynamic = "force-dynamic"` at top.

### Verify
```bash
npx tsc --noEmit --skipLibCheck 2>&1 | grep -v node_modules
```
**Pass:** Zero errors in both new route files.

---

## Phase 4: Step 2 Payment Page — `app/(public)/checkout/revere/page.tsx`

**Goal:** Server component that renders the card-entry form. `action` is the `formUrl` from query params.

Accept `searchParams: Promise<{ formUrl?; bookingId?; courseName?; amount? }>`.

Form must have `method="POST"` and `action={decodeURIComponent(formUrl)}`.

Required inputs (PDF p.10): `name="billing-cc-number"`, `name="billing-cc-exp"` (placeholder `1025`, no slash), optional `name="billing-cvv"`.

Show course name + amount from query params. Display lock icon + "card data goes directly to secure payment processor" notice.

### Verify
```bash
npx tsc --noEmit --skipLibCheck 2>&1 | grep -v node_modules
# Start dev server and load: http://localhost:3000/checkout/revere?formUrl=https%3A%2F%2Ftest.com&bookingId=1&courseName=Test&amount=450.00
# Page should render form; no 500
```

---

## Phase 5: Wire Booking Components

**Goal:** One-line path change in two files. No other changes.

**`components/booking/booking-dialog.tsx:82–88`** — change:
- `"/api/checkout"` → `"/api/revere/checkout"`

**`app/components/BookingButton.tsx:84–89`** — same change.

Do NOT delete `app/api/checkout/route.ts` or `app/api/webhooks/stripe/route.ts` — leave as fallback.

### Verify
```bash
npx tsc --noEmit --skipLibCheck 2>&1 | grep -v node_modules
grep -r '"/api/checkout"' components/ app/components/   # expect 0 results
grep -r '"/api/revere/checkout"' components/ app/components/  # expect 2 results
```

---

## Phase 6: Test Transactions ⛔ BLOCKED

**Do not execute until user says: "Revere Payments Gateway is in Test Mode"**

When unblocked, create `scripts/test-revere.ts`:

```ts
// Override with demo key (PDF p.39)
process.env.REVERE_PRIVATE_SECURITY_KEY = "2F822Rw39fx762MaV7Yy86jXGTC7sCDy";
// Test Visa: 4111111111111111  exp: 1025  cvv: 999  amount: 1.00
// Decline trigger: amount < 1.00
// AVS match: address1="888" postal="77777"
```

Step 1 only — print form-url, then manually open in browser to complete Step 2 + 3.

```bash
# Run inside container
docker compose exec acdefense npx tsx scripts/test-revere.ts
# After Step 2 completes in browser, verify DB:
docker compose exec postgres psql -U acdefense -d acdefense \
  -c "SELECT id, payment_status, revere_transaction_id FROM bookings ORDER BY id DESC LIMIT 5;"
```
**Pass:** `payment_status=completed`, `revere_transaction_id` is a numeric string from Revere.

---

## Phase 7: Final Verification

```bash
# 1. TypeScript
npx tsc --noEmit --skipLibCheck 2>&1 | grep -v node_modules

# 2. All files exist
ls app/api/revere/checkout/route.ts \
   app/api/revere/callback/route.ts \
   app/(public)/checkout/revere/page.tsx \
   lib/revere.ts \
   init/006_revere_migration.sql

# 3. DB column
docker compose exec postgres psql -U acdefense -d acdefense \
  -c "\d bookings" | grep revere_transaction_id

# 4. Components point to Revere
grep -r "revere/checkout" components/ app/components/

# 5. Old Stripe routes still intact
ls app/api/checkout/route.ts app/api/webhooks/stripe/route.ts

# 6. Build
docker buildx build --platform linux/amd64 -t ghcr.io/chicago-joe/acdefense:development . 2>&1 | tail -10
```
**All must pass.**
