# ACDefenseCo Website - Technical Design

**Date:** 2026-01-30
**Project:** ACDefenseCo Full-Stack E-commerce & Booking Platform
**Reference Sites:**
- Content: https://www.americancivildefensecompany.com/
- Design: https://ghostringtactical.com

---

## Executive Summary

Build a modern, full-stack Next.js website for American Civil Defense Company featuring:
- E-commerce shop (tactical gear, ammo, accessories - NO firearms)
- Class booking system with calendar integration
- Stripe payment processing
- ConstantContact email automation
- Admin panel for content management
- Docker-based local development
- Cloudflare Pages deployment

---

## 1. High-Level Architecture

### Core Technology Stack

- **Frontend & Backend**: Next.js 14+ (App Router) with React Server Components
- **Database**: SQLite (local) → Turso (production) with Drizzle ORM
- **Authentication**: NextAuth.js v5 with JWT sessions, email/password + OAuth
- **Payments**: Stripe Checkout for products and class bookings
- **Email**: ConstantContact API for marketing automation
- **Styling**: Tailwind CSS + shadcn/ui components
- **Development**: Docker Compose (Next.js + PostgreSQL)

### Deployment Architecture

- **Hosting**: Cloudflare Pages (edge distribution)
- **Database**: Turso (edge-replicated SQLite)
- **CDN**: Cloudflare Images for media optimization
- **Webhooks**: Stripe payment events, ConstantContact tracking

### Design Principles

1. **Edge-first**: Optimized for Cloudflare's edge network
2. **Type-safe**: TypeScript throughout, Drizzle ORM
3. **Server-centric**: Leverage React Server Components
4. **Secure by default**: NextAuth sessions, Stripe secure checkout

---

## 2. Data Model & Database Schema

### User Management

**users**
- id, email, password_hash, name, role (user/admin), created_at

**accounts** (OAuth)
- id, user_id, provider, provider_account_id

**sessions**
- id, user_id, session_token, expires

### E-commerce

**products**
- id, name, slug, description, price, images[], inventory_count, category_id, created_at

**product_categories**
- id, name, slug, description

**cart_items**
- id, user_id, product_id, quantity, created_at

**orders**
- id, user_id, total, status, stripe_payment_id, created_at

**order_items**
- id, order_id, product_id, quantity, price_at_purchase

### Booking System

**courses**
- id, name, slug, description, tagline, price, duration_hours, max_capacity, prerequisites, image_url, created_at

**course_schedules**
- id, course_id, start_date, end_date, available_seats, status (open/full/cancelled), created_at

**bookings**
- id, user_id, schedule_id, payment_status, stripe_payment_id, constantcontact_contact_id, created_at

**booking_status_history**
- id, booking_id, status, timestamp

### Content

**blog_posts**
- id, title, slug, content, author, published_at

**instructor_profiles**
- id, name, bio, photo_url, certifications

### Key Relationships

- One user → many orders, bookings, cart items
- One course → many schedules → many bookings
- One order → many order items → references products
- Stripe payment IDs for reconciliation
- ConstantContact IDs for email automation

---

## 3. Application Structure & Features

### Page Structure (App Router)

```
app/
├── (auth)/
│   ├── login/              # NextAuth login
│   ├── register/           # User registration
│   └── layout.tsx
├── (marketing)/
│   ├── page.tsx            # Homepage
│   ├── about/              # Team, mission
│   ├── courses/
│   │   ├── page.tsx        # Course list
│   │   └── [slug]/         # Course detail + booking
│   └── layout.tsx
├── shop/
│   ├── page.tsx            # Product catalog
│   ├── [slug]/             # Product detail
│   └── cart/               # Cart review
├── checkout/               # Stripe integration
├── booking/
│   ├── [scheduleId]/       # Book class
│   └── confirmation/       # Success page
├── account/
│   ├── dashboard/          # User overview
│   ├── orders/             # Order history
│   ├── bookings/           # Class schedule
│   └── profile/            # Edit profile
├── admin/
│   ├── products/           # Inventory management
│   ├── courses/            # Course catalog
│   ├── schedules/          # Class dates
│   ├── orders/             # Order management
│   └── bookings/           # Registration management
└── api/
    ├── auth/[...nextauth]/ # NextAuth
    ├── stripe/webhook/     # Payment events
    ├── constantcontact/    # Email triggers
    └── checkout/           # Create sessions
```

### Core Features

1. Product browsing with filters, search, inventory status
2. Class calendar with real-time availability
3. Integrated Stripe checkout for products and classes
4. User dashboard with order tracking and class schedules
5. Admin panel for inventory, courses, schedules
6. Automated emails via ConstantContact

---

## 4. Third-Party Integrations

### Stripe Integration

**Product Purchases:**
- Create Checkout Session with cart line items
- Redirect to Stripe-hosted checkout (PCI-compliant)
- Webhook: `checkout.session.completed`
- On success: Create order, decrement inventory, send email

**Course Bookings:**
- Checkout Session with course schedule item
- Metadata: scheduleId, userId, courseName
- Webhook creates booking, decrements available_seats
- Idempotency keys prevent double-booking

**Security:**
- Verify Stripe signatures
- Store payment_intent_id for refunds
- Exponential backoff retry logic

### ConstantContact Integration

**Email Automation:**
1. On booking: Add contact to course-specific list
2. API calls: Create/update contact, add to "Registered Students"
3. Trigger automated sequences (materials, venue, checklist)
4. Reminders: 1 week, 3 days, 1 day before class
5. Post-course: Move to "Alumni", send survey

**Implementation:**
- OAuth2 authentication
- Store contact_id in bookings
- Rate limiting: 4 req/sec
- Handle bounce/unsubscribe webhooks

**Error Handling:**
- Email failure doesn't block booking
- Queue failed operations for retry
- Admin dashboard shows sync issues

---

## 5. Docker Setup & Development

### Docker Compose Services

```yaml
services:
  nextjs:
    - Port 3000, hot reload
    - Volume mounts for code

  postgres:
    - PostgreSQL 16 (dev parity with Turso)
    - Persistent volume
    - Port 5432

  stripe-cli:
    - Webhook forwarding to localhost
```

### Development Workflow

1. `docker-compose up` - Start services
2. `npm run db:push` - Sync schema
3. `npm run db:seed` - Test data
4. Access: http://localhost:3000
5. Stripe test mode, ConstantContact sandbox

### Environment Variables

```
DATABASE_URL=postgresql://user:pass@postgres:5432/acdefense
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
CC_API_KEY=...
CC_ACCESS_TOKEN=...
```

### Production Deployment

- GitHub → Cloudflare Pages auto-deploy
- Environment variables in Cloudflare dashboard
- Turso database connection
- Zero-downtime deployments with preview URLs

---

## 6. UI/UX Design (Ghost Ring Tactical Aesthetic)

### Design System

**Color Palette:**
- Dark backgrounds: #0f172a, #1e293b
- Accent CTAs: #ff6b35, #dc2626
- Military green: #4ade80
- High contrast text: #f8fafc, #cbd5e1

**Typography:**
- Headings: Bold sans-serif (Inter, Roboto)
- Body: 16px Inter
- Tactical: Uppercase labels with letter-spacing

### Key Pages

**Homepage:**
- Hero: Video background, bold headline ("PROTECT WHAT'S S.A.C.R.E.D.")
- Upcoming courses grid
- Featured products carousel
- Mission statement with team photo
- Client logos

**Course Pages:**
- Header: Image, title, tagline, price
- Calendar widget: Interactive date grid
- Tabs: Overview, What You'll Learn, Prerequisites, Instructor
- Booking: Select date → Review → Checkout

**Shop:**
- Product grid with filters
- Cards: Image, title, price, stock, "Add to Cart"
- Sticky cart icon with count
- Checkout: Cart review → Stripe redirect

**Admin Panel:**
- Functional dashboard (not customer-facing)
- Tables with search/filter
- Forms for CRUD operations
- Stats: Revenue, upcoming classes, inventory alerts

**Responsive:**
- Mobile-first
- Hamburger menu on mobile
- Touch-friendly buttons (44px min)

---

## 7. Security, Error Handling & Testing

### Security

**Authentication:**
- HTTP-only cookies (NextAuth)
- Bcrypt password hashing (10 rounds)
- CSRF protection
- Role-based access (user/admin)
- Rate limiting: 5 login attempts/15min

**Payment:**
- No credit card storage (Stripe PCI)
- Webhook signature verification
- Idempotency keys
- HTTPS enforced (Cloudflare)

**Data Protection:**
- Zod validation on all forms
- Drizzle ORM prevents SQL injection
- React XSS prevention
- Content Security Policy headers
- No env vars exposed to client

### Error Handling

**User-Facing:**
- Friendly error messages
- Toast notifications for cart/checkout
- Retry buttons for API failures
- Custom 404/500 pages

**Background:**
- Webhook failures logged with retry queue
- Email failures logged but don't block bookings
- Inventory conflicts with optimistic locking
- Stripe automatic 3-day retry

**Monitoring:**
- Server errors with context (user_id, request_id)
- Failed payments tracked
- Low inventory alerts (< 5 units)
- ConstantContact sync failures in admin

### Testing

**Essential:**
- Unit tests: Booking logic (seat availability, double-booking)
- Integration: Stripe checkout flow
- E2E (Playwright): Complete purchase, complete booking
- Database migrations (up/down)

**Manual Checklist:**
- Complete product purchase end-to-end
- Book class and verify email
- Admin CRUD operations
- Mobile responsiveness

---

## 8. Performance & SEO

### Performance

**Next.js:**
- React Server Components for lists
- Image optimization (WebP, lazy load)
- Route prefetching
- Streaming SSR
- Edge runtime for APIs

**Database:**
- Turso edge replication
- Indexes: user_id, course_id, schedule_id, product_id
- Cursor-based pagination
- Select only needed columns

**Cloudflare:**
- Edge caching for static pages
- Auto format conversion (WebP/AVIF)
- Brotli compression
- HTTP/3 support

### SEO

**Technical:**
- SSR pages (no client routing for core content)
- Semantic HTML with proper headings
- OpenGraph meta tags
- JSON-LD structured data (Event schema for courses)
- Dynamic sitemap.xml
- Robots.txt

**Content:**
- Unique course titles/descriptions
- Detailed product descriptions
- Blog for content marketing
- Local SEO: Chicago location schema

---

## 9. Course Catalog (From ACDefense)

### 14 Courses Offered

1. **Concealed Carry License Certification** - $275+ | IL + 38 states
2. **Concealed Carry License Renewal** - $125+ | Skills refresh
3. **First Shot Advantage** - $175+ | Decisive first-shot training
4. **Mass Shooter Medical** - $199 | Combat medical response
5. **Combat Pistol** - $199 | Carry permit to combat-ready
6. **OC Pepper Spray Certification** - $169 | OC integration
7. **Taser Certification** - $199 | CEW training
8. **Armored Combat** - $125 | Counter-grapple, restrain
9. **Personal Defense Coaching** - $99 | Personalized training
10. **Women Only CCL Certification** - $249+ | Women-focused
11. **2 Day CQB Course** - $499 | Solo & team methods
12. **ICAIR Pistol Fundamentals** - $150 | Insert-Chamber-Aim-Action-Reload
13. **USCCA Instructor Certification** - $699 | Instructor training
14. **CPR | AED | First Aid** - $125 | Emergency response

### Company Info

**Mission:** "PROTECT WHAT'S S.A.C.R.E.D."
**Location:** Chicago, IL
**Story:** Founded during 2016 social unrest, officially launched 2020, multigenerational MIL & LEO family
**Clients:** Chicago Veterans, Armstrong Security, 5.11 Tactical, Bender Martial Arts

---

## 10. Implementation Plan

### Phase 1: Foundation (Weeks 1-2)
1. Initialize Next.js with TypeScript
2. Docker Compose with PostgreSQL
3. Drizzle ORM schema
4. NextAuth email/password
5. Tailwind + shadcn/ui layout

### Phase 2: E-commerce (Weeks 3-4)
1. Product catalog and detail pages
2. Shopping cart
3. Stripe Checkout integration
4. Admin order management
5. Inventory tracking

### Phase 3: Booking (Weeks 5-6)
1. Course catalog (14 courses)
2. Schedule management (admin)
3. Booking flow with availability
4. Stripe booking payments
5. ConstantContact integration

### Phase 4: Deploy (Week 7)
1. Homepage Ghost Ring design
2. Mobile responsive
3. Turso production database
4. Cloudflare Pages deploy
5. Domain configuration
6. Production testing

---

## Design Validated: 2026-01-30

All sections approved. Ready for implementation.
