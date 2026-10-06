# ACDefenseCo.net — Ridgeline-Style Redesign Design Spec

**Date:** 2026-04-27  
**Reference sites:** ridgelinedefense.com (aesthetic), americancivildefensecompany.com (content)  
**Stack:** Next.js 14+, Drizzle ORM, PostgreSQL, Tailwind CSS

---

## 1. Goals

Redesign acdefenseco.net to adopt Ridgeline Defense's dark, tactical, high-contrast aesthetic while preserving ACDefenseCo's existing content scope (civilian CCL training, legal services, VETS2, shop, blog). Add Law Enforcement and Military audience tracks alongside the existing civilian track, mirroring Ridgeline's three-audience structure. All new content sections must be admin-editable without a code deploy.

---

## 2. Visual Identity

| Token | Value |
|-------|-------|
| Background | `#0a0a0a` (near-black) |
| Surface | `#141414` (card/section backgrounds) |
| Text primary | `#ffffff` |
| Text muted | `#9ca3af` |
| Accent / CTA | `#B22222` (red) |
| Accent hover | `#8b0000` |
| Heading font | Oswald or Bebas Neue — bold, condensed, all-caps |
| Body font | Inter |
| Border | `#262626` |

All section headings rendered in all-caps. CTA buttons: solid red with white text, uppercase tracking-widest. Nav: dark bar, white links, red active indicator.

---

## 3. Navigation

```
HOME | TRAINING ▾ | LEGAL SERVICES | SECURITY & LOGISTICS | VETS2 | THE TEAM | SHOP | BLOG | CONTACT
```

Training dropdown: Open Enrollment → `/courses?audience=open` | Law Enforcement → `/courses?audience=le` | Military → `/courses?audience=military`

Mobile: hamburger → full-screen dark overlay menu.

---

## 4. Pages

### 4.1 Home (`/`)

**Hero**
- Full-bleed background image: `https://static.wixstatic.com/media/126043_72229a45dbea4138b733d7eaced19d53~mv2.png/...`
- Giant all-caps tagline: **PROTECT WHATS S.A.C.R.E.D.**
- Sub-headline: body text from `pageContent` key `home.hero.subheadline` (admin-editable)
- No CTA button — page scrolls into sections below
- Overlay: dark gradient (bottom 40%) for text legibility

**3-Up Audience Cards**
Three equal cards, each: full-bleed image, all-caps heading, short tagline, CTA button.

| Card | Heading | CTA | Links to |
|------|---------|-----|----------|
| 1 | OPEN ENROLLMENT | FIND A COURSE | `/courses?audience=open` |
| 2 | LAW ENFORCEMENT | FIND A COURSE | `/courses?audience=le` |
| 3 | MILITARY | FIND A COURSE | `/courses?audience=military` |

Images: admin-uploadable via `pageContent` keys `home.card.open.image`, `home.card.le.image`, `home.card.military.image`.

**How to Enroll** — 3-step numbered process (dark section, centered)
1. FIND AND ENROLL IN A COURSE
2. DEFINE YOUR TRAINING OBJECTIVES
3. COMPLETE TRAINING THAT PREPARES YOU FOR REAL-WORLD DEFENSE

**4-Up Value Props** (icon + heading + short line)
1. STATE-LICENSED INSTRUCTORS
2. ILLINOIS CCL CERTIFIED
3. VETERAN-OWNED & OPERATED
4. MODERN TRAINING METHODOLOGY

**Newsletter Capture**
- Section heading: "STAY UP TO DATE"
- Email input + "SUBSCRIBE" button
- Submissions → `newsletterSubscriptions` table; ENV-configurable webhook (`NEWSLETTER_WEBHOOK_URL`) fires on each new subscriber for future service integration (Mailchimp, ConvertKit, etc.)

---

### 4.2 Courses (`/courses`)

**Layout:** 3-tab audience switcher at top (OPEN ENROLLMENT / LAW ENFORCEMENT / MILITARY). Active tab underlined in red. Below: dark card grid.

**Course Card:** course image (full bleed top), all-caps course name, tagline/excerpt, duration, price, red "BOOK NOW" button.

**Existing courses from Wix to seed (Open Enrollment):**
CCL Certification ($249) · CCL Renewal ($99) · First Shot Advantage ($175+) · Mass Shooter Medical ($199) · Combat Pistol ($199) · OC Pepper Spray Cert ($169) · Taser Cert ($199) · Armored Combat ($125) · Personal Defense Coaching ($99) · Women Only CCL ($249+) · 2-Day CQB ($499) · ICAIR Pistol Fundamentals ($150) · CPR/AED/First Aid ($125) · FCC Requalification ($399)

LE and Military catalogs start empty — admin populates via admin panel.

**Admin control:** each course has `audience` and `courseCategory` fields (see DB section).

---

### 4.3 Course Detail (`/courses/[slug]`)

- Full-bleed hero image (course `imageUrl`)
- Bold all-caps course name
- Description block (rich text)
- Right sidebar: duration · schedule (next available from `courseSchedules`) · price
- Red "BOOK NOW" button → existing `/register` booking flow
- Breadcrumb: Home → Courses → [Course Name]

---

### 4.4 Legal Services (`/legal-services`)

**Layout:** Professional services rows — not card grid. Dark page, centered content.

Page intro: heading + short paragraph (admin-editable via `pageContent` key `legal.intro`).

Each service row: icon left, name + description center, duration + price right, red "BOOK NOW" button. Services from `services` table.

**Services to seed:**

| Name | Duration | Price |
|------|----------|-------|
| In-Person FOID/CCL Application Assist | 30 min | $49 |
| FOID/CCL Reset and Restore | 15 min | $29 |
| Firearm Rights Restoration | 1 hr | $499 |

---

### 4.5 Security & Logistics (`/security`)

Placeholder page:
- Dark hero with heading: "SECURITY & LOGISTICS"
- Sub-heading: "Professional security solutions — coming soon."
- Single red CTA: "CONTACT US FOR DETAILS" → `/contact`

No DB dependency. Static page until content is ready.

---

### 4.6 VETS2 Foundation (`/vets2`)

Minimal page:
- VETS2 logo: `https://static.wixstatic.com/media/126043_9fd283f0957e4b8f9bb828024b776fdc~mv2.png/...`
- Mission paragraph: "VETS² (Veterans Education & Training in Security Services) is a veteran owned and veteran operated nonprofit organization dedicated to training and preparing United States military veterans for careers in the security and protective service fields..."
- Red "DONATE TODAY" button → `https://donorbox.org/veterans-education-and-training-fund`

Static page — no DB dependency for v1.

---

### 4.7 The Team (`/team`)

**Sections:**

**Dark hero** — heading "THE TEAM", tagline "PROTECT WHATS S.A.C.R.E.D."

**About Us + Our Story** (admin-editable via `pageContent` keys `team.about` and `team.story`)
- About: "American Civil Defense Company is a Chicago-based defense consultant & security school..."
- Story: "~ Always Ready, Always There ~ ACDefense didn't start off as a business plan..."

**Meet The Team** — alternating instructor rows from `instructorProfiles` table:
- Photo (left or right, alternating)
- Name (all-caps heading)
- Title
- Bio (full paragraph)
- Credential bullets (• separated)
- Social icons (Facebook, Twitter, LinkedIn — stored per instructor)

**Instructors to seed:**
1. Carmine Mattozzi — Founder and CEO
2. Kevin Wheeler — Training Coordinator
3. Lewis Sanborn — Lead Instructor
4. Brian Krieter — Tactical/Medical Instructor

**Our Clients** — horizontal logo strip from `clients` table:
- Chicago Veterans (chicagovets.org)
- Armstrong Security (armstrongsecurityllc.com)
- 5.11 Tactical (511tactical.com)
- Bender Martial Arts (bendermartialarts.com)

---

### 4.8 Shop (`/shop`)

Dark card grid. Category filter tabs at top (from `productCategories`).

**Product card:** image (full-bleed), all-caps product name, price, red "ADD TO CART" button.

Uses existing `products` + `productCategories` + `cartItems` + `orders` tables. No schema changes.

---

### 4.9 Blog (`/blog`)

Dark card grid. Each card: featured image, all-caps category tag (red), title, excerpt, date, "READ MORE" link.

Uses existing `blogPosts` table. No schema changes.

---

### 4.10 Contact (`/contact`)

Minimal page:
- Dark background, centered form
- Fields: First Name, Last Name, Email, Message
- "SEND MESSAGE" red button
- Submissions → `contactSubmissions` table (admin-readable, mark-as-read)
- Social links below form: WhatsApp (`wa.me/13126209330`), Instagram, Facebook, YouTube, LinkedIn

---

## 5. Database Changes

### 5.1 Modified Tables

**`courses`** — add columns:
```sql
audience        audience_enum  NOT NULL DEFAULT 'open_enrollment'
  -- enum: open_enrollment | law_enforcement | military
course_category course_category_enum NOT NULL DEFAULT 'other'
  -- enum: ccl_renewal | defensive_firearms | fcc_advanced | other
```

### 5.2 New Tables

**`services`** — legal/appointment services (same shape as courses, separate entity)
```
id              uuid PK
name            text NOT NULL
slug            text NOT NULL UNIQUE
description     text
duration        integer  -- minutes
price           numeric(10,2)
imageUrl        text
bookingUrl      text  -- external or internal booking link
isActive        boolean DEFAULT true
sortOrder       integer DEFAULT 0
createdAt       timestamp DEFAULT now()
updatedAt       timestamp DEFAULT now()
```

**`clients`** — team page partner logos
```
id              uuid PK
name            text NOT NULL
logoUrl         text NOT NULL
websiteUrl      text
sortOrder       integer DEFAULT 0
isActive        boolean DEFAULT true
```

**`pageContent`** — admin-editable text/image blocks
```
id              uuid PK
page            text NOT NULL   -- e.g. 'home', 'team', 'legal'
key             text NOT NULL   -- e.g. 'hero.subheadline', 'story'
value           text NOT NULL
updatedAt       timestamp DEFAULT now()
UNIQUE(page, key)
```

**`newsletterSubscriptions`**
```
id              uuid PK
email           text NOT NULL UNIQUE
firstName       text
subscribedAt    timestamp DEFAULT now()
webhookSent     boolean DEFAULT false
source          text DEFAULT 'homepage'
```

**`contactSubmissions`**
```
id              uuid PK
firstName       text NOT NULL
lastName        text NOT NULL
email           text NOT NULL
message         text NOT NULL
isRead          boolean DEFAULT false
createdAt       timestamp DEFAULT now()
```

---

## 6. Admin Panel Additions

| Panel | Location | Actions |
|-------|----------|---------|
| Services | `/admin` → Services tab | CRUD for legal services |
| Clients/Partners | `/admin` → Clients tab | CRUD, reorder |
| Page Content | `/admin` → Content tab | Key/value editor per page |
| Newsletter Subscribers | `/admin` → Subscribers tab | Read-only list, CSV export |
| Contact Submissions | `/admin` → Contact tab | Read-only, mark as read |
| Courses (updated) | existing Courses tab | Add audience + category dropdowns |

---

## 7. Routing Summary

| Route | Status |
|-------|--------|
| `/` | Redesigned |
| `/courses` | Redesigned + audience tab param |
| `/courses/[slug]` | New (detail page) |
| `/legal-services` | New |
| `/security` | New (placeholder) |
| `/vets2` | New |
| `/team` | New (merges `/about` + `/instructors`) |
| `/shop` | Restyled |
| `/blog` | Restyled |
| `/contact` | New (replaces any existing) |
| `/admin` | Extended (5 new panels) |
| `/about` | Redirect → `/team` |
| `/instructors` | Redirect → `/team` |

---

## 8. Out of Scope (v1)

- Google Reviews integration (deferred)
- ID.me integration for VETS2
- Security & Logistics content (placeholder only)
- LE/Military course content (admin populates post-launch)
- External newsletter service wiring (webhook stub only)
- Video hero background
