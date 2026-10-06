# Admin Resources & OAuth Integrations Design

**Date:** 2026-02-02
**Project:** ACDefenseCo Website
**Status:** Approved

## Overview

Implement comprehensive admin panel with full CRUD operations for all resources, add Google OAuth for authentication and calendar sync, integrate Calendly for course scheduling, and establish hybrid email system with SendGrid and ConstantContact.

## System Architecture

### Core Components

1. **Admin Panel** - React Admin interfaces for managing all resources with role-based access
2. **Google OAuth** - Sign in with Google using NextAuth.js
3. **Calendar Integration** - Auto-sync bookings to Google Calendar
4. **Calendly Integration** - Embedded scheduling with webhook capture
5. **Email System** - SendGrid for transactional, ConstantContact for marketing
6. **API Layer** - Next.js routes with admin authentication

### Authentication Flow

NextAuth.js handles both credentials and Google OAuth. Store OAuth tokens in existing `accounts` table. JWT sessions include user role for access control. Google refresh tokens enable Calendar API access without re-authentication.

### Data Flow

- **Booking:** User books via Calendly → Webhook → API → Database + Google Calendar + SendGrid confirmation
- **Admin:** Admin edits resource → React Admin → API → Database
- **Sign-in:** User signs in with Google → OAuth → User created/linked → Access granted

## Admin Resources

### 1. Products
- **List:** Name, slug, price, inventory, category, image thumbnail
- **Fields:** TextInput (name, slug), NumberInput (price, inventory), ReferenceInput (category), ImageField (JSON array), RichTextInput (description)
- **Endpoints:** GET/POST `/api/admin/products`, GET/PUT/DELETE `/api/admin/products/[id]`

### 2. Categories
- **List:** Name, slug, description
- **Fields:** TextInput (name, slug), TextInput multiline (description)
- **Endpoints:** GET/POST `/api/admin/categories`, GET/PUT/DELETE `/api/admin/categories/[id]`

### 3. Blog Posts
- **List:** Title, author, published date, status
- **Fields:** TextInput (title, slug, author), RichTextInput (content), DateTimeInput (publishedAt - nullable for drafts)
- **Endpoints:** GET/POST `/api/admin/blog-posts`, GET/PUT/DELETE `/api/admin/blog-posts/[id]`

### 4. Instructors
- **List:** Name, certifications, photo
- **Fields:** TextInput (name, photoUrl, certifications), TextInput multiline (bio)
- **Endpoints:** GET/POST `/api/admin/instructors`, GET/PUT/DELETE `/api/admin/instructors/[id]`

### 5. Orders (Read-only)
- **List/Show:** Order ID, user email, total, status, Stripe payment ID, created date, items
- **No edit/create** - orders created only through checkout
- **Endpoints:** GET `/api/admin/orders`, GET `/api/admin/orders/[id]`

### 6. Bookings
- **List:** User email, course name, schedule date, payment status
- **Edit:** Update payment status only (logs to history table)
- **Endpoints:** GET `/api/admin/bookings`, GET/PUT `/api/admin/bookings/[id]`

### 7. Dashboard
- **Stats:** Total products, orders, bookings, revenue
- **Activity:** Last 5 orders, upcoming 5 schedules
- **Actions:** Quick links to create product, blog post, view bookings
- **Endpoint:** GET `/api/admin/dashboard`

## Google OAuth & Calendar

### NextAuth.js Setup
Add Google provider to `auth.ts` alongside Credentials. Store tokens in `accounts` table.

**Scopes:**
- `openid`
- `email`
- `profile`
- `https://www.googleapis.com/auth/calendar.events`

**Flow:**
- First sign-in: Create user, link Google account
- Subsequent: Update tokens if refreshed

### Calendar Sync
When booking confirmed:
1. Retrieve user's Google access token from `accounts` table
2. Create calendar event with course details
3. Store event ID in bookings table (new field: `googleCalendarEventId`)
4. If booking cancelled: Delete calendar event via API

**Failure handling:** Log error, continue booking (don't block user)

### Environment Variables
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google
```

## Calendly Integration

### Setup
1. Admin configures Calendly event type URL (env or database)
2. Embed Calendly widget on course pages (iframe/React component)
3. Webhook endpoint receives `invitee.created` events at `/api/webhooks/calendly`

### Webhook Flow
1. Verify `X-Calendly-Webhook-Signature` header
2. Extract booking details
3. Create booking record
4. Send confirmation email via SendGrid
5. Create Google Calendar event

**Security:** Verify webhook signature using signing secret to prevent unauthorized bookings.

### Environment Variables
```
CALENDLY_API_KEY=...
CALENDLY_WEBHOOK_SECRET=...
```

## Email System (Hybrid)

### SendGrid (Transactional)
- Booking confirmation
- Payment receipts
- Course reminders (24hrs before)
- Password reset

### ConstantContact (Marketing)
- Welcome series
- Monthly newsletter
- Course announcements
- Promotional campaigns

### Environment Variables
```
SENDGRID_API_KEY=...
SENDGRID_FROM_EMAIL=noreply@acdefenseco.com
```

## Implementation Structure

### Admin Files
```
app/admin/
├── AdminApp.tsx           # Register all resources + dashboard
├── Dashboard.tsx          # Stats + quick actions
├── products.tsx           # List, Edit, Create
├── categories.tsx         # List, Edit, Create
├── blog-posts.tsx         # List, Edit, Create
├── instructors.tsx        # List, Edit, Create
├── orders.tsx             # List, Show (read-only)
└── bookings.tsx           # List, Edit (status only)
```

### API Routes
```
app/api/
├── admin/
│   ├── products/route.ts + [id]/route.ts
│   ├── categories/route.ts + [id]/route.ts
│   ├── blog-posts/route.ts + [id]/route.ts
│   ├── instructors/route.ts + [id]/route.ts
│   ├── orders/route.ts + [id]/route.ts
│   ├── bookings/route.ts + [id]/route.ts
│   └── dashboard/route.ts
├── webhooks/
│   └── calendly/route.ts
└── calendar/
    ├── create-event/route.ts
    └── delete-event/route.ts
```

### Auth & Helpers
```
auth.ts                    # Add Google provider
lib/google-calendar.ts     # Calendar API helper
lib/sendgrid.ts           # Email helper
```

## Database Changes

Add field to bookings table:
```sql
ALTER TABLE bookings ADD COLUMN google_calendar_event_id TEXT;
ALTER TABLE users ADD COLUMN google_calendar_sync BOOLEAN DEFAULT true;
```

## Error Handling

- **Calendar API failure:** Log error, continue booking
- **Email failure:** Log error, retry with exponential backoff
- **Webhook signature failure:** Return 401, log suspicious activity
- **OAuth token expiry:** Auto-refresh using refresh_token
- **Calendly API error:** Allow manual booking entry in admin

## Testing Strategy

### Unit Tests
- Email helper functions (SendGrid)
- Calendar helper functions (Google Calendar API)
- Webhook signature verification

### E2E Tests (Playwright)
- Admin CRUD operations for each resource
- Google OAuth sign-in flow
- Booking creation through Calendly
- Calendar event verification

### Integration Tests
- Webhook endpoint with sample Calendly payloads
- Use ngrok for local webhook testing
- Manual: Verify Google Calendar events, email delivery

## Security Considerations

1. **Admin routes:** Check user role in all admin API routes
2. **OAuth tokens:** Store encrypted in database, never expose in client
3. **Webhook verification:** Always verify Calendly signature
4. **API keys:** Store in environment variables, never commit
5. **CORS:** Restrict admin API to same-origin requests
6. **Rate limiting:** Implement on webhook endpoint to prevent abuse

## Deployment Checklist

- [ ] Set all environment variables in production
- [ ] Configure Google OAuth redirect URI for production domain
- [ ] Set up Calendly webhook URL pointing to production
- [ ] Configure SendGrid sender domain and verify DNS
- [ ] Test OAuth flow in production
- [ ] Test webhook delivery from Calendly
- [ ] Verify calendar events create successfully
- [ ] Confirm transactional emails deliver
