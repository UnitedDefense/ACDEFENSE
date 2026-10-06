# ACDefenseCo.net — Ridgeline-Style Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign acdefenseco.net with Ridgeline Defense's dark tactical aesthetic, add LE/Military audience tracks, and introduce Legal Services, VETS2, Team, and Contact pages with full admin editability.

**Architecture:** All page-level data fetching uses Next.js App Router Server Components querying PostgreSQL via Drizzle ORM. Client Components are limited to interactive elements (tabs, forms). Admin panel extends React-Admin with new Resource components + matching API routes that return `{ data: [...], total: N }`. Auth guard pattern: `import { auth } from "@/auth"` then `if (!session || session.user.role !== "admin") return 401`. Design tokens extend Tailwind config with a `tactical` color palette and Oswald font family variable.

**Tech Stack:** Next.js 16 (App Router), Drizzle ORM, PostgreSQL, TailwindCSS, shadcn/ui, React-Admin, Docker Compose

---

## File Map

### Created
- `components/layout/tactical-navbar.tsx` — New dark nav with Training dropdown
- `components/layout/tactical-footer.tsx` — New dark footer
- `components/home/newsletter-form.tsx` — Client component for newsletter signup
- `components/courses/audience-tabs.tsx` — Client component for 3-tab audience filter
- `components/contact/contact-form.tsx` — Client component for contact form
- `app/legal-services/page.tsx` — Legal services listing page
- `app/security/page.tsx` — Security & Logistics placeholder
- `app/vets2/page.tsx` — VETS2 Foundation minimal page
- `app/team/page.tsx` — Merged about + instructors page
- `app/contact/page.tsx` — Contact page
- `app/about/page.tsx` — Redirect → /team
- `app/instructors/page.tsx` — Redirect → /team
- `app/api/newsletter/route.ts` — Newsletter subscription endpoint
- `app/api/contact/route.ts` — Contact form submission endpoint
- `app/api/admin/services/route.ts` — Admin CRUD for services
- `app/api/admin/clients/route.ts` — Admin CRUD for clients
- `app/api/admin/page-content/route.ts` — Admin CRUD for page content
- `app/api/admin/subscribers/route.ts` — Admin read + CSV export for subscribers
- `app/api/admin/contact-submissions/route.ts` — Admin read + mark-as-read for contact submissions
- `app/admin/services.tsx` — React-Admin Services resource
- `app/admin/clients.tsx` — React-Admin Clients resource
- `app/admin/page-content.tsx` — React-Admin PageContent resource
- `app/admin/subscribers.tsx` — React-Admin Subscribers resource
- `app/admin/contact-submissions.tsx` — React-Admin ContactSubmissions resource

### Modified
- `tailwind.config.ts` (or `.js`) — Add tactical color palette + Oswald font family
- `app/globals.css` — Add tactical CSS utility classes
- `app/layout.tsx` — Load Oswald + Inter fonts, swap to tactical nav/footer
- `lib/db/schema.ts` — Add `title` to instructorProfiles; add 2 new enums + 2 columns to courses; add 5 new tables
- `scripts/seed.ts` — Seed legal services, clients, page content, update course audience/category
- `app/page.tsx` — Full homepage redesign
- `app/courses/page.tsx` — 3-tab audience filter + dark card grid
- `app/courses/[slug]/page.tsx` — Ridgeline-style detail layout
- `app/shop/page.tsx` — Dark card grid reskin
- `app/blog/page.tsx` — Dark card grid reskin
- `app/admin/AdminApp.tsx` — Register 5 new Resource components
- `app/admin/courses.tsx` — Add audience + courseCategory select fields

---

## Phase 1: Design Foundation

### Task 1: Install shadcn components + Tailwind tokens + fonts

**Files:**
- Modify: `tailwind.config.ts` (or `.js` — check which exists)
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Install required shadcn components**

```bash
docker compose exec nextjs npx shadcn@latest add tabs dropdown-menu separator
```

Expected: `components/ui/tabs.tsx`, `components/ui/dropdown-menu.tsx`, `components/ui/separator.tsx` created.

- [ ] **Step 2: Find tailwind config**

```bash
ls /home/chicagojoe/PyCharmProjects/selfhosted/websites/acdefense-website/tailwind.config.*
```

Use whichever file exists. If neither exists, create `tailwind.config.ts`. The file to edit is whichever this command finds.

- [ ] **Step 3: Extend tailwind theme with tactical tokens**

Merge into the existing config's `theme.extend` block — do NOT replace existing entries:

```typescript
// Add inside theme.extend:
colors: {
  tactical: {
    black: "#0a0a0a",
    surface: "#141414",
    border: "#262626",
    muted: "#9ca3af",
    red: "#B22222",
    "red-hover": "#8b0000",
  },
},
fontFamily: {
  heading: ["var(--font-oswald)", "sans-serif"],
  body: ["var(--font-inter)", "sans-serif"],
},
```

- [ ] **Step 4: Add tactical utility classes to the END of `app/globals.css`**

Do not replace existing content — append only:

```css
/* Tactical design system */
.tactical-heading {
  font-family: var(--font-oswald), sans-serif;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.tactical-surface {
  background-color: #141414;
  border: 1px solid #262626;
}
.tactical-btn-primary {
  background-color: #B22222;
  color: #ffffff;
  font-family: var(--font-oswald), sans-serif;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 0.625rem 1.5rem;
  display: inline-block;
  transition: background-color 0.2s;
  cursor: pointer;
}
.tactical-btn-primary:hover {
  background-color: #8b0000;
}
.tactical-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

- [ ] **Step 5: Update `app/layout.tsx` to load Oswald + Inter via next/font**

Read the current layout.tsx first to keep existing providers. Then replace/add font loading:

```bash
head -30 /home/chicagojoe/PyCharmProjects/selfhosted/websites/acdefense-website/app/layout.tsx
```

Add at the top of layout.tsx (after existing imports):

```typescript
import { Oswald, Inter } from "next/font/google";

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-oswald",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
```

In the `<html>` tag, add the font variables:

```typescript
<html lang="en" className={`${oswald.variable} ${inter.variable}`}>
```

In the `<body>` tag, add base tactical classes:

```typescript
<body className="bg-[#0a0a0a] text-white antialiased">
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
docker compose exec nextjs npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add tailwind.config.ts app/globals.css app/layout.tsx
git commit -m "feat: tactical design tokens, Oswald font, shadcn tabs/dropdown-menu/separator"
```

---

### Task 2: Tactical Navbar

**Files:**
- Create: `components/layout/tactical-navbar.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create `components/layout/tactical-navbar.tsx`**

```typescript
// components/layout/tactical-navbar.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Menu, X } from "lucide-react";

const trainingLinks = [
  { label: "OPEN ENROLLMENT", href: "/courses?audience=open_enrollment" },
  { label: "LAW ENFORCEMENT", href: "/courses?audience=law_enforcement" },
  { label: "MILITARY", href: "/courses?audience=military" },
];

const navLinks = [
  { label: "LEGAL SERVICES", href: "/legal-services" },
  { label: "SECURITY & LOGISTICS", href: "/security" },
  { label: "VETS2", href: "/vets2" },
  { label: "THE TEAM", href: "/team" },
  { label: "SHOP", href: "/shop" },
  { label: "BLOG", href: "/blog" },
  { label: "CONTACT", href: "/contact" },
];

export function TacticalNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="bg-[#0a0a0a] border-b border-[#262626] sticky top-0 z-50">
      <div className="container mx-auto px-4 flex items-center justify-between h-16">
        <Link href="/" className="tactical-heading text-xl tracking-widest text-white">
          ACDEFENSECO
        </Link>

        {/* Desktop */}
        <div className="hidden lg:flex items-center gap-6">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 tactical-heading text-sm text-white/80 hover:text-white transition-colors outline-none">
              TRAINING <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#141414] border-[#262626] min-w-[200px]">
              {trainingLinks.map((link) => (
                <DropdownMenuItem key={link.href} asChild>
                  <Link
                    href={link.href}
                    className="tactical-heading text-xs text-white/80 hover:text-white cursor-pointer px-3 py-2"
                  >
                    {link.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="tactical-heading text-sm text-white/80 hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Mobile toggle */}
        <button
          className="lg:hidden text-white p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-[#141414] border-t border-[#262626]">
          <div className="container mx-auto px-4 py-4 flex flex-col">
            <p className="tactical-heading text-xs text-[#9ca3af] mb-2 mt-2">TRAINING</p>
            {trainingLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="tactical-heading text-sm text-white/80 hover:text-white py-3 pl-4 border-b border-[#262626]"
              >
                {link.label}
              </Link>
            ))}
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="tactical-heading text-sm text-white/80 hover:text-white py-3 border-b border-[#262626]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
```

- [ ] **Step 2: Read current layout.tsx to find existing header import**

```bash
grep -n "header\|Header\|nav\|Nav" /home/chicagojoe/PyCharmProjects/selfhosted/websites/acdefense-website/app/layout.tsx
```

Note the line that imports or renders the existing header component.

- [ ] **Step 3: Replace the existing header in `app/layout.tsx`**

Remove the old header import + usage. Add:

```typescript
import { TacticalNavbar } from "@/components/layout/tactical-navbar";
```

Replace the old `<Header />` (or whatever the existing component is called) with:

```typescript
<TacticalNavbar />
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
docker compose exec nextjs npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add components/layout/tactical-navbar.tsx app/layout.tsx
git commit -m "feat: tactical navbar with Training dropdown and mobile hamburger"
```

---

### Task 3: Tactical Footer

**Files:**
- Create: `components/layout/tactical-footer.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create `components/layout/tactical-footer.tsx`**

```typescript
// components/layout/tactical-footer.tsx
import Link from "next/link";

const footerSections = [
  {
    heading: "TRAIN",
    links: [
      { label: "OPEN ENROLLMENT", href: "/courses?audience=open_enrollment" },
      { label: "LAW ENFORCEMENT", href: "/courses?audience=law_enforcement" },
      { label: "MILITARY", href: "/courses?audience=military" },
      { label: "LEGAL SERVICES", href: "/legal-services" },
      { label: "SECURITY & LOGISTICS", href: "/security" },
    ],
  },
  {
    heading: "COMPANY",
    links: [
      { label: "THE TEAM", href: "/team" },
      { label: "VETS2 FOUNDATION", href: "/vets2" },
      { label: "BLOG", href: "/blog" },
      { label: "SHOP", href: "/shop" },
      { label: "CONTACT", href: "/contact" },
    ],
  },
];

const socialLinks = [
  { label: "Instagram", href: "https://www.instagram.com/acdefenseco/" },
  { label: "Facebook", href: "https://www.facebook.com/ACDefenseCo" },
  { label: "YouTube", href: "https://www.youtube.com/@ACDefenseCo" },
  { label: "WhatsApp", href: "https://wa.me/13126209330" },
];

export function TacticalFooter() {
  return (
    <footer className="bg-[#141414] border-t border-[#262626] mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          <div>
            <p className="tactical-heading text-xl text-white tracking-widest mb-3">ACDEFENSECO</p>
            <p className="text-[#9ca3af] text-sm leading-relaxed">
              Chicago-based defense consultant &amp; security school.
              Protecting life &amp; liberty for citizens of the free world.
            </p>
          </div>
          {footerSections.map((section) => (
            <div key={section.heading}>
              <p className="tactical-heading text-xs text-[#9ca3af] mb-4">{section.heading}</p>
              <div className="flex flex-col gap-2">
                {section.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="tactical-heading text-sm text-white/70 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-[#262626] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[#9ca3af] text-xs">
            © {new Date().getFullYear()} AMERICAN CIVIL DEFENSE COMPANY. ALL RIGHTS RESERVED.
          </p>
          <div className="flex gap-4">
            {socialLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="tactical-heading text-xs text-white/60 hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Replace existing footer in `app/layout.tsx`**

Find the existing footer import:

```bash
grep -n "footer\|Footer" /home/chicagojoe/PyCharmProjects/selfhosted/websites/acdefense-website/app/layout.tsx
```

Remove old footer import + usage. Add:

```typescript
import { TacticalFooter } from "@/components/layout/tactical-footer";
```

Replace old `<Footer />` with `<TacticalFooter />`.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
docker compose exec nextjs npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add components/layout/tactical-footer.tsx app/layout.tsx
git commit -m "feat: tactical footer with nav sections and social links"
```

---

## Phase 2: Database Schema

### Task 4: Schema additions — new enums, columns, tables

**Files:**
- Modify: `lib/db/schema.ts`

- [ ] **Step 1: Add new enums to `lib/db/schema.ts`**

After the existing enum declarations (after `paymentStatusEnum`), add:

```typescript
export const audienceEnum = pgEnum("audience", [
  "open_enrollment",
  "law_enforcement",
  "military",
]);

export const courseCategoryEnum = pgEnum("course_category", [
  "ccl_renewal",
  "defensive_firearms",
  "fcc_advanced",
  "other",
]);
```

- [ ] **Step 2: Add `audience` and `courseCategory` columns to the `courses` table**

Inside the `courses = pgTable(...)` definition, add before the closing `}`):

```typescript
audience: audienceEnum("audience").default("open_enrollment").notNull(),
courseCategory: courseCategoryEnum("course_category").default("other").notNull(),
```

- [ ] **Step 3: Add `title` column to `instructorProfiles` table**

Inside the `instructorProfiles = pgTable(...)` definition, add after `name`:

```typescript
title: text("title"),
```

- [ ] **Step 4: Add 5 new tables at the END of `lib/db/schema.ts`**

```typescript
// Legal / appointment services
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  durationMinutes: integer("duration_minutes"),
  price: decimal("price", { precision: 10, scale: 2 }),
  imageUrl: text("image_url"),
  bookingUrl: text("booking_url"),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Team page client / partner logos
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  logoUrl: text("logo_url").notNull(),
  websiteUrl: text("website_url"),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

// Admin-editable text blocks per page
export const pageContent = pgTable("page_content", {
  id: serial("id").primaryKey(),
  page: text("page").notNull(),
  key: text("key").notNull(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Newsletter subscriptions
export const newsletterSubscriptions = pgTable("newsletter_subscriptions", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  subscribedAt: timestamp("subscribed_at").defaultNow().notNull(),
  webhookSent: boolean("webhook_sent").default(false).notNull(),
  source: text("source").default("homepage").notNull(),
});

// Contact form submissions
export const contactSubmissions = pgTable("contact_submissions", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

- [ ] **Step 5: Run `db:push` to apply schema changes**

```bash
docker compose exec nextjs npm run db:push
```

Expected: Schema applied with no errors. Review any prompts carefully — adding columns and tables is non-destructive.

- [ ] **Step 6: Verify tables exist**

```bash
docker compose exec postgres psql -U postgres -d acdefense -c "\dt"
```

Expected: Output includes `services`, `clients`, `page_content`, `newsletter_subscriptions`, `contact_submissions`.

- [ ] **Step 7: Verify TypeScript compiles**

```bash
docker compose exec nextjs npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add lib/db/schema.ts
git commit -m "feat: add audience/courseCategory to courses, title to instructorProfiles, and 5 new tables"
```

---

### Task 5: Seed new data

**Files:**
- Modify: `scripts/seed.ts`

- [ ] **Step 1: Add `sql` import to seed.ts if not present**

At the top of `scripts/seed.ts`, verify `sql` is imported from `drizzle-orm`:

```bash
head -5 /home/chicagojoe/PyCharmProjects/selfhosted/websites/acdefense-website/scripts/seed.ts
```

If not present, add:

```typescript
import { sql } from "drizzle-orm";
```

Also add new table imports to the schema import line:

```typescript
import * as schema from "../lib/db/schema";
// Or add to destructured import:
import {
  // ...existing imports...
  services, clients, pageContent, instructorProfiles,
} from "../lib/db/schema";
```

- [ ] **Step 2: Append seed blocks at the END of the seed function**

```typescript
// ── Legal Services ───────────────────────────────────────────────
await db.insert(schema.services).values([
  {
    name: "In-Person FOID/CCL Application Assist",
    slug: "foid-ccl-application-assist",
    description: "Hands-on assistance completing your FOID or CCL application accurately and efficiently.",
    durationMinutes: 30,
    price: "49.00",
    isActive: true,
    sortOrder: 1,
  },
  {
    name: "FOID/CCL Reset and Restore",
    slug: "foid-ccl-reset-restore",
    description: "Resolve issues with a suspended, revoked, or problematic FOID or CCL status.",
    durationMinutes: 15,
    price: "29.00",
    isActive: true,
    sortOrder: 2,
  },
  {
    name: "Firearm Rights Restoration",
    slug: "firearm-rights-restoration",
    description: "Comprehensive assistance navigating the process of restoring revoked firearm rights.",
    durationMinutes: 60,
    price: "499.00",
    isActive: true,
    sortOrder: 3,
  },
]).onConflictDoNothing();

// ── Client / Partner Logos ────────────────────────────────────────
await db.insert(schema.clients).values([
  { name: "Chicago Veterans", logoUrl: "https://static.wixstatic.com/media/126043_afe619b2fd4c418fa614f996b254f3b9~mv2.png/v1/fill/w_100,h_100,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/WEB%20-%20Chicago%20Veterans.png", websiteUrl: "https://chicagovets.org/", sortOrder: 1, isActive: true },
  { name: "Armstrong Security", logoUrl: "https://static.wixstatic.com/media/126043_c51c9d5facd1460e903ef58ad740130e~mv2.png/v1/fill/w_100,h_100,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/WEB%20-%20Armstrong%20Security.png", websiteUrl: "https://www.armstrongsecurityllc.com/", sortOrder: 2, isActive: true },
  { name: "5.11 Tactical", logoUrl: "https://static.wixstatic.com/media/126043_a7b91b07a8104732ad89e06d79641854~mv2.png/v1/fill/w_100,h_100,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/WEB%20-%205_11%20Tactical.png", websiteUrl: "https://www.511tactical.com/", sortOrder: 3, isActive: true },
  { name: "Bender Martial Arts", logoUrl: "https://static.wixstatic.com/media/126043_ae68d26f44274cbeacaa119591d6ef20~mv2.png/v1/fill/w_100,h_100,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/WEB%20-%20Bender%20Martial%20Arts.png", websiteUrl: "https://www.bendermartialarts.com/", sortOrder: 4, isActive: true },
]).onConflictDoNothing();

// ── Page Content Blocks ───────────────────────────────────────────
await db.insert(schema.pageContent).values([
  { page: "home", key: "hero.subheadline", value: "American Civil Defense Company is a Chicago-based defense consultant & security school focused on the best practices of sustaining life & liberty for citizens of the free world." },
  { page: "home", key: "card.open.image", value: "https://static.wixstatic.com/media/126043_72229a45dbea4138b733d7eaced19d53~mv2.png/v1/fill/w_1080,h_940,al_c,q_90,enc_avif,quality_auto/126043_72229a45dbea4138b733d7eaced19d53~mv2.png" },
  { page: "home", key: "card.le.image", value: "" },
  { page: "home", key: "card.military.image", value: "" },
  { page: "team", key: "about", value: "American Civil Defense Company is a Chicago-based defense consultant & security school focused on the best practices of sustaining life & liberty for citizens of the free world. We provide self-defense, concealed carry, & security training led by highly qualified, state-licensed & nationally certified instructors, combining modern technology with proven instruction to equip everyday Americans to protect what they love." },
  { page: "team", key: "story", value: "~ Always Ready, Always There ~\n\n\"ACDefense\" didn't start off as a business plan, it started off as a calling. When the social unrest of 2016 began, people really started focusing on their self defense. Raised in a multigenerational family of MIL & LEO, service & protection were already two pillars of his youth, & our founder is who many Chicago locals reached out to. When the COVID psyop began in 2020 the demand for professional self defense & security training reached an all time high, and \"ACDefense\" officially launched." },
  { page: "legal", key: "intro", value: "We provide expert application assistance, licensing support, and firearm rights restoration services to help you navigate Illinois firearms law with confidence." },
]).onConflictDoNothing();

// ── Instructor Profiles ────────────────────────────────────────────
await db.insert(schema.instructorProfiles).values([
  {
    name: "Carmine Mattozzi",
    title: "Founder and CEO",
    bio: "Founder and CEO of American Civil Defense Company, this U.S. Army Infantryman brings 20+ years of private security experience in Chicago, forged in real-world protective work where judgment and performance matter. A competitor in both MMA and 2-Gun, his instruction isn't built on theory—it's validated through continual training, measurable results, and on-demand execution under pressure.",
    certifications: "USCCA, NRA, CSAT Firearms Instructor\nSOCP Certified, BJJ Instructor\nCLS certified, EFAF Instructor\nSub-Lethal Weapon Instructor",
    photoUrl: "https://static.wixstatic.com/media/126043_9d50ac5c70924f30a725a000e0638316~mv2.png/v1/fill/w_443,h_431,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/INS%20-%20Mattozzi_edited.png",
  },
  {
    name: "Kevin Wheeler",
    title: "Training Coordinator",
    bio: "U.S. Marine Corps Veteran and law-enforcement-trained security leader with extensive experience in executive protection, crisis response, and operations leadership. Serves as Training & Operations Manager for Armstrong Security, overseeing armed and unarmed teams, executive-protection assignments, personnel development, and threat-assessment initiatives.",
    certifications: "USMC Military Police & Training NCO\nTraining Manager – Armstrong Security\nCertified Instructor & Security Specialist\nYork Rite Grand Officer & Masonic Educator",
    photoUrl: "https://static.wixstatic.com/media/126043_8ea0ff3d852d45a89fa27a587d925efa~mv2.png/v1/fill/w_443,h_431,al_c,lg_1,q_85,enc_avif,quality_auto/INS%20-%20Wheeler_edited.png",
  },
  {
    name: "Lewis Sanborn",
    title: "Lead Instructor",
    bio: "15-year Army infantry veteran and firearms instructor delivering Special Operations-level standards to civilian and professional training. A current 11B, he has served as a HALO Team Sergeant in a Long-Range Surveillance unit, Infantry Scout Team Leader, Infantry Squad Leader, and Senior Operations Advisor in an SFAB.",
    certifications: "SFAB Senior Operations Advisor\nLRS HALO Team Sergeant\nNRA, S.E.R.E. C, SFBCC Instructor\nNat'l Disaster PSD Team Lead",
    photoUrl: "https://static.wixstatic.com/media/126043_646c1eb925d24c56a7b6218b3570f274~mv2.png/v1/fill/w_443,h_431,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/INS%20-%20Sanborn%2C%20Lewis.png",
  },
  {
    name: "Brian Krieter",
    title: "Tactical & Medical Instructor",
    bio: "Seasoned security professional and tactical instructor with extensive experience in executive protection, high-risk environments, and defensive operations. Brings years of hands-on medical expertise, holding multiple advanced certifications and teaching life-saving prehospital care to both civilian and professional audiences.",
    certifications: "TAC / SAR / ERT Medic\nHand to hand combat instructor\nFirearms instructor\nK9 Medical",
    photoUrl: "https://static.wixstatic.com/media/126043_0bc858e669434a1d8832d4538dd1c7f5~mv2.png/v1/fill/w_443,h_431,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/Krieter%2C%20Brian_edited.png",
  },
]).onConflictDoNothing();

// ── Update Courses with Audience + Category ───────────────────────
// Run raw SQL since slug names may vary — adjust slugs to match what's in your DB:
// First check what slugs exist:
//   docker compose exec postgres psql -U postgres -d acdefense -c "SELECT slug FROM courses;"
// Then update accordingly. This is a best-effort seed — verify and adjust slugs as needed.
await db.execute(sql`
  UPDATE courses SET audience = 'open_enrollment', course_category = 'ccl_renewal'
  WHERE slug ILIKE '%ccl%' OR slug ILIKE '%concealed%' OR name ILIKE '%CCL%' OR name ILIKE '%concealed carry%';
`);
await db.execute(sql`
  UPDATE courses SET audience = 'open_enrollment', course_category = 'fcc_advanced'
  WHERE slug ILIKE '%fcc%' OR name ILIKE '%FCC%' OR name ILIKE '%requalification%';
`);
await db.execute(sql`
  UPDATE courses SET course_category = 'defensive_firearms'
  WHERE audience = 'open_enrollment' AND course_category = 'other';
`);
```

- [ ] **Step 3: Run the seed**

```bash
docker compose exec nextjs npm run db:seed
```

Expected: Runs without errors. `onConflictDoNothing()` means re-running is safe.

- [ ] **Step 4: Verify services and clients seeded**

```bash
docker compose exec postgres psql -U postgres -d acdefense \
  -c "SELECT name, price FROM services ORDER BY sort_order;" \
  -c "SELECT name FROM clients ORDER BY sort_order;" \
  -c "SELECT page, key FROM page_content;"
```

Expected: 3 services, 4 clients, 7 page content rows.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed.ts
git commit -m "feat: seed legal services, clients, page content, instructors, update course categories"
```

---

## Phase 3: Homepage

### Task 6: Newsletter API route

**Files:**
- Create: `app/api/newsletter/route.ts`

- [ ] **Step 1: Create newsletter route**

```typescript
// app/api/newsletter/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { newsletterSubscriptions } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email: string = body.email ?? "";
  const firstName: string = body.firstName ?? "";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  try {
    await db.insert(newsletterSubscriptions).values({
      email: email.toLowerCase().trim(),
      firstName: firstName.trim() || null,
      source: "homepage",
    });

    const webhookUrl = process.env.NEWSLETTER_WEBHOOK_URL;
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName }),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("unique")) {
      return NextResponse.json({ error: "Already subscribed" }, { status: 409 });
    }
    return NextResponse.json({ error: "Subscription failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
docker compose exec nextjs npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Test the endpoint**

```bash
curl -s -X POST http://localhost:3000/api/newsletter \
  -H "Content-Type: application/json" \
  -d '{"email":"smoketest@example.com","firstName":"Test"}'
```

Expected: `{"success":true}`

- [ ] **Step 4: Commit**

```bash
git add app/api/newsletter/route.ts
git commit -m "feat: newsletter subscription API with DB storage and webhook stub"
```

---

### Task 7: NewsletterForm client component + homepage redesign

**Files:**
- Create: `components/home/newsletter-form.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create `components/home/newsletter-form.tsx`**

```typescript
// components/home/newsletter-form.tsx
"use client";

import { useState } from "react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "duplicate">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const res = await fetch("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.ok) { setStatus("success"); setEmail(""); }
    else if (res.status === 409) { setStatus("duplicate"); }
    else { setStatus("error"); }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          disabled={status === "success"}
          className="flex-1 bg-[#0a0a0a] border border-[#262626] text-white px-4 py-3 text-sm focus:outline-none focus:border-[#B22222]"
        />
        <button
          type="submit"
          disabled={status === "loading" || status === "success"}
          className="tactical-btn-primary text-sm whitespace-nowrap"
        >
          {status === "loading" ? "..." : "SUBSCRIBE"}
        </button>
      </form>
      {status === "success" && <p className="text-green-400 text-xs mt-2">You&apos;re in. Welcome to the mission.</p>}
      {status === "duplicate" && <p className="text-[#9ca3af] text-xs mt-2">Already subscribed.</p>}
      {status === "error" && <p className="text-[#B22222] text-xs mt-2">Something went wrong. Try again.</p>}
    </div>
  );
}
```

- [ ] **Step 2: Replace `app/page.tsx`**

```typescript
// app/page.tsx
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { pageContent } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { NewsletterForm } from "@/components/home/newsletter-form";

async function getContent(page: string, key: string): Promise<string> {
  const [row] = await db
    .select()
    .from(pageContent)
    .where(and(eq(pageContent.page, page), eq(pageContent.key, key)));
  return row?.value ?? "";
}

const audienceCards = [
  {
    title: "OPEN ENROLLMENT",
    tagline: "Purpose-driven courses for citizens who demand the highest standards in training.",
    cta: "FIND A COURSE",
    href: "/courses?audience=open_enrollment",
  },
  {
    title: "LAW ENFORCEMENT",
    tagline: "Scenario-driven instruction to enhance officer readiness in high-stakes environments.",
    cta: "FIND A COURSE",
    href: "/courses?audience=law_enforcement",
  },
  {
    title: "MILITARY",
    tagline: "Modern instruction for modern missions — direct from the field to the range.",
    cta: "FIND A COURSE",
    href: "/courses?audience=military",
  },
];

const howToEnroll = [
  { step: "01", text: "FIND AND ENROLL IN A COURSE OR CONTACT A TRAINING COORDINATOR." },
  { step: "02", text: "DEFINE AND CUSTOMIZE YOUR TRAINING OBJECTIVES." },
  { step: "03", text: "COMPLETE TRAINING THAT PREPARES YOU FOR REAL-WORLD DEFENSE." },
];

const valueProps = [
  { heading: "STATE-LICENSED INSTRUCTORS", sub: "Certified by USCCA, NRA, CSAT, and national bodies." },
  { heading: "ILLINOIS CCL CERTIFIED", sub: "Valid in Illinois and 38 other states." },
  { heading: "VETERAN-OWNED & OPERATED", sub: "Rooted in military and law enforcement service." },
  { heading: "MODERN TRAINING METHODOLOGY", sub: "Technology meets proven tactical instruction." },
];

export default async function HomePage() {
  const subheadline = await getContent("home", "hero.subheadline");

  return (
    <main className="bg-[#0a0a0a] text-white">
      {/* Hero */}
      <section className="relative h-[85vh] min-h-[500px] flex items-end overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://static.wixstatic.com/media/126043_72229a45dbea4138b733d7eaced19d53~mv2.png/v1/fill/w_1080,h_940,al_c,q_90,enc_avif,quality_auto/126043_72229a45dbea4138b733d7eaced19d53~mv2.png"
            alt="ACDefenseCo training"
            fill
            className="object-cover opacity-50"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/20 to-transparent" />
        </div>
        <div className="relative z-10 container mx-auto px-4 pb-16">
          <h1 className="tactical-heading text-4xl md:text-6xl lg:text-7xl text-white mb-4 max-w-4xl">
            PROTECT WHATS S.A.C.R.E.D.
          </h1>
          {subheadline && (
            <p className="text-[#9ca3af] text-lg max-w-2xl leading-relaxed">{subheadline}</p>
          )}
        </div>
      </section>

      {/* 3-Up Audience Cards */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {audienceCards.map((card) => (
            <div
              key={card.title}
              className="tactical-surface relative overflow-hidden min-h-[300px] flex flex-col justify-end group"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/90 to-transparent" />
              <div className="relative z-10 p-6">
                <h2 className="tactical-heading text-2xl text-white mb-2">{card.title}</h2>
                <p className="text-[#9ca3af] text-sm mb-5">{card.tagline}</p>
                <Link href={card.href} className="tactical-btn-primary text-sm">
                  {card.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How to Enroll */}
      <section className="bg-[#141414] border-y border-[#262626] py-16">
        <div className="container mx-auto px-4">
          <h2 className="tactical-heading text-3xl text-white text-center mb-12">HOW TO ENROLL</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-4xl mx-auto mb-10">
            {howToEnroll.map((item) => (
              <div key={item.step} className="flex flex-col items-center text-center gap-4">
                <span className="tactical-heading text-5xl text-[#B22222]">{item.step}</span>
                <p className="tactical-heading text-sm text-white tracking-wide leading-snug">{item.text}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/courses?audience=open_enrollment" className="tactical-btn-primary text-sm">OPEN ENROLLMENT</Link>
            <Link href="/courses?audience=law_enforcement" className="tactical-btn-primary text-sm">LAW ENFORCEMENT</Link>
            <Link href="/courses?audience=military" className="tactical-btn-primary text-sm">MILITARY</Link>
          </div>
        </div>
      </section>

      {/* 4-Up Value Props */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="tactical-heading text-3xl text-white text-center mb-12">
          MODERN. RELEVANT. PROFESSIONAL TRAINING.
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {valueProps.map((vp) => (
            <div key={vp.heading} className="tactical-surface p-6 text-center">
              <h3 className="tactical-heading text-sm text-white mb-2">{vp.heading}</h3>
              <p className="text-[#9ca3af] text-sm">{vp.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="bg-[#141414] border-t border-[#262626] py-16">
        <div className="container mx-auto px-4 max-w-lg text-center">
          <h2 className="tactical-heading text-2xl text-white mb-2">STAY UP TO DATE</h2>
          <p className="text-[#9ca3af] text-sm mb-6">
            Get training schedules, new courses, and mission-critical updates.
          </p>
          <NewsletterForm />
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
docker compose exec nextjs npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Verify homepage loads**

```bash
curl -s http://localhost:3000 | grep -c "PROTECT WHATS"
```

Expected: `1`

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx components/home/newsletter-form.tsx
git commit -m "feat: homepage redesign — hero, 3-up audience cards, how-to-enroll, value props, newsletter"
```

---

## Phase 4: Courses

### Task 8: Courses catalog — 3-tab audience filter

**Files:**
- Create: `components/courses/audience-tabs.tsx`
- Modify: `app/courses/page.tsx`

- [ ] **Step 1: Create `components/courses/audience-tabs.tsx`**

```typescript
// components/courses/audience-tabs.tsx
"use client";

import Link from "next/link";

const tabs = [
  { label: "OPEN ENROLLMENT", value: "open_enrollment" },
  { label: "LAW ENFORCEMENT", value: "law_enforcement" },
  { label: "MILITARY", value: "military" },
];

export function AudienceTabs({ active }: { active: string }) {
  return (
    <div className="bg-[#141414] border-b border-[#262626]">
      <div className="container mx-auto px-4">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = active === tab.value;
            return (
              <Link
                key={tab.value}
                href={`/courses?audience=${tab.value}`}
                className={`tactical-heading text-sm px-6 py-4 whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? "border-[#B22222] text-white"
                    : "border-transparent text-[#9ca3af] hover:text-white"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Read current `app/courses/page.tsx` to preserve existing data-fetch logic**

```bash
head -40 /home/chicagojoe/PyCharmProjects/selfhosted/websites/acdefense-website/app/courses/page.tsx
```

Note how courses are fetched (what query is used). The new page will add an `audience` filter to that query.

- [ ] **Step 3: Replace `app/courses/page.tsx`**

```typescript
// app/courses/page.tsx
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { courses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { AudienceTabs } from "@/components/courses/audience-tabs";

type Audience = "open_enrollment" | "law_enforcement" | "military";

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: { audience?: string };
}) {
  const audience = (searchParams.audience ?? "open_enrollment") as Audience;

  const allCourses = await db
    .select()
    .from(courses)
    .where(eq(courses.audience, audience));

  return (
    <main className="bg-[#0a0a0a] text-white min-h-screen">
      <section className="bg-[#141414] border-b border-[#262626] py-12">
        <div className="container mx-auto px-4">
          <h1 className="tactical-heading text-4xl text-white">TRAINING COURSES</h1>
          <p className="text-[#9ca3af] mt-2">State-licensed. Veteran-led. Mission-ready instruction.</p>
        </div>
      </section>

      <AudienceTabs active={audience} />

      <section className="container mx-auto px-4 py-12">
        {allCourses.length === 0 ? (
          <div className="text-center py-20">
            <p className="tactical-heading text-xl text-[#9ca3af]">COURSES COMING SOON</p>
            <p className="text-[#9ca3af] text-sm mt-2">Contact us to inquire about specialized training.</p>
            <Link href="/contact" className="tactical-btn-primary inline-block mt-6 text-sm">
              CONTACT US
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {allCourses.map((course) => (
              <div key={course.id} className="tactical-surface group overflow-hidden">
                <div className="relative h-48 bg-[#262626] overflow-hidden">
                  {course.imageUrl ? (
                    <Image
                      src={course.imageUrl}
                      alt={course.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="tactical-heading text-[#9ca3af] text-xs">NO IMAGE</span>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h2 className="tactical-heading text-base text-white mb-1">{course.name.toUpperCase()}</h2>
                  {course.tagline && (
                    <p className="text-[#9ca3af] text-sm mb-3 line-clamp-2">{course.tagline}</p>
                  )}
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm">
                      {course.durationHours && (
                        <span className="text-[#9ca3af]">{course.durationHours}hr</span>
                      )}
                      {course.price && (
                        <span className="ml-2 text-white font-semibold">
                          ${Number(course.price).toFixed(0)}
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/courses/${course.slug}`}
                      className="tactical-btn-primary text-xs py-2 px-4"
                    >
                      BOOK NOW
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
docker compose exec nextjs npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Verify page loads with audience filter**

```bash
curl -s "http://localhost:3000/courses?audience=open_enrollment" | grep -c "TRAINING COURSES"
```

Expected: `1`

- [ ] **Step 6: Commit**

```bash
git add app/courses/page.tsx components/courses/audience-tabs.tsx
git commit -m "feat: courses catalog with 3-tab audience filter and dark card grid"
```

---

### Task 9: Course detail page redesign

**Files:**
- Modify: `app/courses/[slug]/page.tsx`

- [ ] **Step 1: Read existing `app/courses/[slug]/page.tsx`**

```bash
cat /home/chicagojoe/PyCharmProjects/selfhosted/websites/acdefense-website/app/courses/[slug]/page.tsx
```

Note what imports and data-fetching patterns currently exist. The new page replaces only the JSX — keep the DB query intact if it already fetches `course` and `schedules`.

- [ ] **Step 2: Replace `app/courses/[slug]/page.tsx`**

```typescript
// app/courses/[slug]/page.tsx
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { courses, courseSchedules } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function CourseDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const [course] = await db.select().from(courses).where(eq(courses.slug, params.slug));
  if (!course) notFound();

  const schedules = await db
    .select()
    .from(courseSchedules)
    .where(eq(courseSchedules.courseId, course.id))
    .orderBy(courseSchedules.startDate);

  const nextSchedule = schedules.find((s) => s.status === "open");

  return (
    <main className="bg-[#0a0a0a] text-white min-h-screen">
      {/* Hero */}
      <section className="relative h-64 md:h-96 overflow-hidden">
        <div className="absolute inset-0 bg-[#141414]">
          {course.imageUrl && (
            <Image
              src={course.imageUrl}
              alt={course.name}
              fill
              className="object-cover opacity-40"
              unoptimized
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
        </div>
        <div className="relative z-10 container mx-auto px-4 h-full flex flex-col justify-end pb-8">
          <nav className="text-[#9ca3af] text-xs mb-3 flex gap-1 items-center">
            <Link href="/" className="hover:text-white">HOME</Link>
            <span>/</span>
            <Link href="/courses" className="hover:text-white">COURSES</Link>
            <span>/</span>
            <span className="text-white">{course.name.toUpperCase()}</span>
          </nav>
          <h1 className="tactical-heading text-3xl md:text-5xl text-white">
            {course.name.toUpperCase()}
          </h1>
        </div>
      </section>

      {/* Content + Sidebar */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main content */}
          <div className="lg:col-span-2">
            {course.tagline && (
              <p className="tactical-heading text-lg text-[#9ca3af] mb-6">{course.tagline}</p>
            )}
            {course.description && (
              <p className="text-white/80 leading-relaxed whitespace-pre-line">{course.description}</p>
            )}
            {course.prerequisites && (
              <div className="mt-8 tactical-surface p-5">
                <h3 className="tactical-heading text-sm text-white mb-2">PREREQUISITES</h3>
                <p className="text-[#9ca3af] text-sm">{course.prerequisites}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="tactical-surface p-6 h-fit space-y-4">
            {course.price && (
              <div className="flex justify-between items-center border-b border-[#262626] pb-4">
                <span className="tactical-heading text-xs text-[#9ca3af]">PRICE</span>
                <span className="tactical-heading text-2xl text-white">${Number(course.price).toFixed(0)}</span>
              </div>
            )}
            {course.durationHours && (
              <div className="flex justify-between items-center border-b border-[#262626] pb-4">
                <span className="tactical-heading text-xs text-[#9ca3af]">DURATION</span>
                <span className="text-white text-sm">{course.durationHours} hours</span>
              </div>
            )}
            {nextSchedule && (
              <div className="flex justify-between items-center border-b border-[#262626] pb-4">
                <span className="tactical-heading text-xs text-[#9ca3af]">NEXT DATE</span>
                <span className="text-white text-sm">
                  {new Date(nextSchedule.startDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
            {nextSchedule && (
              <div className="flex justify-between items-center pb-2">
                <span className="tactical-heading text-xs text-[#9ca3af]">SEATS</span>
                <span className="text-white text-sm">{nextSchedule.availableSeats} available</span>
              </div>
            )}
            <Link
              href={`/register?courseId=${course.id}`}
              className="tactical-btn-primary w-full text-center block text-sm mt-4"
            >
              BOOK NOW
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
docker compose exec nextjs npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add "app/courses/[slug]/page.tsx"
git commit -m "feat: course detail page with Ridgeline-style hero and booking sidebar"
```

---

## Phase 5: New Pages

### Task 10: Contact page + API route

**Files:**
- Create: `app/api/contact/route.ts`
- Create: `components/contact/contact-form.tsx`
- Create: `app/contact/page.tsx`

- [ ] **Step 1: Create `app/api/contact/route.ts`**

```typescript
// app/api/contact/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contactSubmissions } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { firstName, lastName, email, message } = body as {
    firstName: string;
    lastName: string;
    email: string;
    message: string;
  };

  if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }
  if (!email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  await db.insert(contactSubmissions).values({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.toLowerCase().trim(),
    message: message.trim(),
  });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Create `components/contact/contact-form.tsx`**

```typescript
// components/contact/contact-form.tsx
"use client";

import { useState } from "react";

type Fields = { firstName: string; lastName: string; email: string; message: string };

export function ContactForm() {
  const [form, setForm] = useState<Fields>({ firstName: "", lastName: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  function set(field: keyof Fields) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setStatus("success");
      setForm({ firstName: "", lastName: "", email: "", message: "" });
    } else {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="text-center py-12">
        <p className="tactical-heading text-2xl text-white">MESSAGE SENT.</p>
        <p className="text-[#9ca3af] text-sm mt-2">We&apos;ll get back to you shortly.</p>
      </div>
    );
  }

  const inputClass =
    "w-full bg-[#0a0a0a] border border-[#262626] text-white px-4 py-3 text-sm placeholder:text-[#9ca3af] focus:outline-none focus:border-[#B22222]";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input name="firstName" value={form.firstName} onChange={set("firstName")} placeholder="FIRST NAME" required className={inputClass} />
        <input name="lastName" value={form.lastName} onChange={set("lastName")} placeholder="LAST NAME" required className={inputClass} />
      </div>
      <input name="email" type="email" value={form.email} onChange={set("email")} placeholder="EMAIL ADDRESS" required className={inputClass} />
      <textarea name="message" value={form.message} onChange={set("message")} placeholder="YOUR MESSAGE" rows={5} required className={`${inputClass} resize-none`} />
      {status === "error" && <p className="text-[#B22222] text-xs">Something went wrong. Please try again.</p>}
      <button type="submit" disabled={status === "loading"} className="tactical-btn-primary w-full text-sm">
        {status === "loading" ? "SENDING..." : "SEND MESSAGE"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Create `app/contact/page.tsx`**

```typescript
// app/contact/page.tsx
import { ContactForm } from "@/components/contact/contact-form";

const socialLinks = [
  { label: "Instagram", href: "https://www.instagram.com/acdefenseco/" },
  { label: "Facebook", href: "https://www.facebook.com/ACDefenseCo" },
  { label: "YouTube", href: "https://www.youtube.com/@ACDefenseCo" },
  { label: "WhatsApp", href: "https://wa.me/13126209330" },
];

export default function ContactPage() {
  return (
    <main className="bg-[#0a0a0a] text-white min-h-screen">
      <section className="bg-[#141414] border-b border-[#262626] py-12">
        <div className="container mx-auto px-4">
          <h1 className="tactical-heading text-4xl text-white">CONTACT US</h1>
          <p className="text-[#9ca3af] mt-2">Ready to defend what matters most?</p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 max-w-2xl">
        <ContactForm />

        <div className="mt-12 pt-8 border-t border-[#262626]">
          <p className="tactical-heading text-xs text-[#9ca3af] mb-4">CONNECT WITH US</p>
          <div className="flex flex-wrap gap-5">
            {socialLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="tactical-heading text-sm text-white/70 hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
docker compose exec nextjs npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Test contact API**

```bash
curl -s -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"t@example.com","message":"Hello"}'
```

Expected: `{"success":true}`

- [ ] **Step 6: Commit**

```bash
git add app/api/contact/route.ts components/contact/contact-form.tsx app/contact/page.tsx
git commit -m "feat: contact page with form submission API and social links"
```

---

### Task 11: Legal Services page

**Files:**
- Create: `app/legal-services/page.tsx`

- [ ] **Step 1: Create `app/legal-services/page.tsx`**

```typescript
// app/legal-services/page.tsx
import Link from "next/link";
import { db } from "@/lib/db";
import { services, pageContent } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

async function getIntro(): Promise<string> {
  const [row] = await db
    .select()
    .from(pageContent)
    .where(and(eq(pageContent.page, "legal"), eq(pageContent.key, "intro")));
  return row?.value ?? "";
}

export default async function LegalServicesPage() {
  const allServices = await db
    .select()
    .from(services)
    .where(eq(services.isActive, true))
    .orderBy(asc(services.sortOrder));

  const intro = await getIntro();

  return (
    <main className="bg-[#0a0a0a] text-white min-h-screen">
      <section className="bg-[#141414] border-b border-[#262626] py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="tactical-heading text-4xl text-white mb-4">LEGAL SERVICES</h1>
          {intro && <p className="text-[#9ca3af] leading-relaxed">{intro}</p>}
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 max-w-3xl">
        <div className="space-y-1">
          {allServices.map((service) => (
            <div
              key={service.id}
              className="tactical-surface p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="flex-1">
                <h2 className="tactical-heading text-lg text-white mb-2">{service.name.toUpperCase()}</h2>
                {service.description && (
                  <p className="text-[#9ca3af] text-sm max-w-lg mb-3">{service.description}</p>
                )}
                <div className="flex gap-4 text-xs text-[#9ca3af]">
                  {service.durationMinutes && (
                    <span>
                      {service.durationMinutes < 60
                        ? `${service.durationMinutes} min`
                        : `${service.durationMinutes / 60} hr`}
                    </span>
                  )}
                  {service.price && (
                    <span className="text-white font-semibold text-sm">
                      ${Number(service.price).toFixed(0)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0">
                <Link
                  href={service.bookingUrl ?? "/contact"}
                  className="tactical-btn-primary text-sm"
                >
                  BOOK NOW
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
docker compose exec nextjs npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Verify page loads and shows 3 services**

```bash
curl -s http://localhost:3000/legal-services | grep -c "BOOK NOW"
```

Expected: `3`

- [ ] **Step 4: Commit**

```bash
git add app/legal-services/page.tsx
git commit -m "feat: legal services page with professional service rows from DB"
```

---

### Task 12: Security placeholder + VETS2 page + redirects

**Files:**
- Create: `app/security/page.tsx`
- Create: `app/vets2/page.tsx`
- Create: `app/about/page.tsx`
- Create: `app/instructors/page.tsx`

- [ ] **Step 1: Create `app/security/page.tsx`**

```typescript
// app/security/page.tsx
import Link from "next/link";

export default function SecurityPage() {
  return (
    <main className="bg-[#0a0a0a] text-white min-h-screen flex flex-col">
      <section className="bg-[#141414] border-b border-[#262626] py-12">
        <div className="container mx-auto px-4">
          <h1 className="tactical-heading text-4xl text-white">SECURITY & LOGISTICS</h1>
        </div>
      </section>
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24">
        <p className="tactical-heading text-2xl text-[#9ca3af] mb-4">
          PROFESSIONAL SECURITY SOLUTIONS
        </p>
        <p className="text-[#9ca3af] text-sm max-w-md mb-10 leading-relaxed">
          Comprehensive security and logistics services for private, corporate, and event applications.
          Program details coming soon.
        </p>
        <Link href="/contact" className="tactical-btn-primary text-sm">
          CONTACT US FOR DETAILS
        </Link>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Create `app/vets2/page.tsx`**

```typescript
// app/vets2/page.tsx
import Image from "next/image";

export default function Vets2Page() {
  return (
    <main className="bg-[#0a0a0a] text-white min-h-screen">
      <section className="container mx-auto px-4 py-20 max-w-2xl text-center flex flex-col items-center">
        <div className="relative w-72 h-36 mb-8">
          <Image
            src="https://static.wixstatic.com/media/126043_9fd283f0957e4b8f9bb828024b776fdc~mv2.png/v1/fill/w_1024,h_525,al_c,q_90,enc_avif,quality_auto/126043_9fd283f0957e4b8f9bb828024b776fdc~mv2.png"
            alt="VETS2 Foundation"
            fill
            className="object-contain"
            unoptimized
          />
        </div>

        <h1 className="tactical-heading text-5xl text-white mb-6">VETS²</h1>

        <p className="text-white/80 leading-relaxed mb-10 text-lg">
          VETS² (Veterans Education &amp; Training in Security Services) is a veteran owned and veteran
          operated nonprofit organization dedicated to training and preparing United States military
          veterans for careers in the security and protective service fields. The organization provides
          instructional programs, hands-on training, mentorship, and job placement assistance to support
          veterans transitioning into civilian employment.
        </p>

        <a
          href="https://donorbox.org/veterans-education-and-training-fund"
          target="_blank"
          rel="noopener noreferrer"
          className="tactical-btn-primary text-sm"
        >
          DONATE TODAY
        </a>
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Create redirect pages**

```typescript
// app/about/page.tsx
import { redirect } from "next/navigation";
export default function AboutRedirect() {
  redirect("/team");
}
```

```typescript
// app/instructors/page.tsx
import { redirect } from "next/navigation";
export default function InstructorsRedirect() {
  redirect("/team");
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
docker compose exec nextjs npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add app/security/page.tsx app/vets2/page.tsx app/about/page.tsx app/instructors/page.tsx
git commit -m "feat: security placeholder, vets2 minimal page, redirects from /about and /instructors to /team"
```

---

### Task 13: The Team page

**Files:**
- Create: `app/team/page.tsx`

- [ ] **Step 1: Confirm instructorProfiles column names**

```bash
docker compose exec postgres psql -U postgres -d acdefense -c "\d instructor_profiles"
```

Confirm: `id`, `name`, `title`, `bio`, `photo_url` (→ `photoUrl` in Drizzle), `certifications`, `created_at`. If any differ, adjust the page below.

- [ ] **Step 2: Create `app/team/page.tsx`**

```typescript
// app/team/page.tsx
import Image from "next/image";
import { db } from "@/lib/db";
import { instructorProfiles, clients, pageContent } from "@/lib/db/schema";
import { eq, asc, and } from "drizzle-orm";

async function getContent(page: string, key: string): Promise<string> {
  const [row] = await db
    .select()
    .from(pageContent)
    .where(and(eq(pageContent.page, page), eq(pageContent.key, key)));
  return row?.value ?? "";
}

export default async function TeamPage() {
  const instructors = await db
    .select()
    .from(instructorProfiles)
    .orderBy(asc(instructorProfiles.id));

  const partnerClients = await db
    .select()
    .from(clients)
    .where(eq(clients.isActive, true))
    .orderBy(asc(clients.sortOrder));

  const aboutText = await getContent("team", "about");
  const storyText = await getContent("team", "story");

  return (
    <main className="bg-[#0a0a0a] text-white min-h-screen">
      {/* Hero */}
      <section className="bg-[#141414] border-b border-[#262626] py-16">
        <div className="container mx-auto px-4">
          <h1 className="tactical-heading text-4xl md:text-5xl text-white mb-2">THE TEAM</h1>
          <p className="tactical-heading text-base text-[#B22222]">PROTECT WHATS S.A.C.R.E.D.</p>
        </div>
      </section>

      {/* About Us */}
      {aboutText && (
        <section className="container mx-auto px-4 py-12 max-w-3xl">
          <h2 className="tactical-heading text-2xl text-white mb-4">ABOUT US</h2>
          <p className="text-white/80 leading-relaxed">{aboutText}</p>
        </section>
      )}

      {/* Our Story */}
      {storyText && (
        <section className="bg-[#141414] border-y border-[#262626] py-12">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="tactical-heading text-2xl text-white mb-4">OUR STORY</h2>
            <div className="text-white/80 leading-relaxed whitespace-pre-line">{storyText}</div>
          </div>
        </section>
      )}

      {/* Meet The Team */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="tactical-heading text-3xl text-white mb-12">MEET THE TEAM</h2>
        <div className="space-y-16">
          {instructors.map((instructor, idx) => (
            <div
              key={instructor.id}
              className={`flex flex-col lg:flex-row gap-8 ${idx % 2 === 1 ? "lg:flex-row-reverse" : ""}`}
            >
              {/* Photo */}
              <div className="relative w-full lg:w-72 h-72 flex-shrink-0 bg-[#141414]">
                {instructor.photoUrl ? (
                  <Image
                    src={instructor.photoUrl}
                    alt={instructor.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="tactical-heading text-[#9ca3af] text-xs">NO PHOTO</span>
                  </div>
                )}
              </div>

              {/* Bio */}
              <div className="flex-1">
                <h3 className="tactical-heading text-2xl text-white mb-1">
                  {instructor.name.toUpperCase()}
                </h3>
                {instructor.title && (
                  <p className="tactical-heading text-sm text-[#B22222] mb-4">
                    {instructor.title.toUpperCase()}
                  </p>
                )}
                {instructor.bio && (
                  <p className="text-white/80 leading-relaxed mb-5">{instructor.bio}</p>
                )}
                {instructor.certifications && (
                  <ul className="space-y-1">
                    {instructor.certifications
                      .split("\n")
                      .filter(Boolean)
                      .map((cred) => (
                        <li key={cred} className="text-[#9ca3af] text-sm">• {cred.trim()}</li>
                      ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Client Logos */}
      {partnerClients.length > 0 && (
        <section className="bg-[#141414] border-t border-[#262626] py-12">
          <div className="container mx-auto px-4">
            <h2 className="tactical-heading text-xl text-[#9ca3af] text-center mb-8">OUR CLIENTS</h2>
            <div className="flex flex-wrap items-center justify-center gap-10">
              {partnerClients.map((client) => (
                <a
                  key={client.id}
                  href={client.websiteUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-60 hover:opacity-100 transition-opacity"
                >
                  <Image
                    src={client.logoUrl}
                    alt={client.name}
                    width={100}
                    height={100}
                    className="object-contain"
                    unoptimized
                  />
                </a>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
docker compose exec nextjs npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Verify page loads**

```bash
curl -s http://localhost:3000/team | grep -c "THE TEAM"
```

Expected: `1` or more.

- [ ] **Step 5: Commit**

```bash
git add app/team/page.tsx
git commit -m "feat: team page with alternating instructor rows, Our Story, and client logo strip"
```

---

## Phase 6: Restyle Existing Pages

### Task 14: Shop page dark grid reskin

**Files:**
- Modify: `app/shop/page.tsx`

- [ ] **Step 1: Read the existing shop page**

```bash
cat /home/chicagojoe/PyCharmProjects/selfhosted/websites/acdefense-website/app/shop/page.tsx
```

Note: what variable holds the products array, what fields each product has (`name`, `slug`, `price`, `imageUrl`).

- [ ] **Step 2: Replace the JSX return in `app/shop/page.tsx`**

Keep all existing imports and the DB query unchanged. Replace only the `return (...)` block. Adjust `products` variable name and field names if they differ from what you saw in Step 1:

```typescript
  return (
    <main className="bg-[#0a0a0a] text-white min-h-screen">
      <section className="bg-[#141414] border-b border-[#262626] py-12">
        <div className="container mx-auto px-4">
          <h1 className="tactical-heading text-4xl text-white">SHOP</h1>
          <p className="text-[#9ca3af] mt-2">Tactical gear. Professional grade.</p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        {products.length === 0 ? (
          <p className="text-center text-[#9ca3af] py-20 tactical-heading">NO PRODUCTS YET.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <Link key={product.id} href={`/shop/${product.slug}`}>
                <div className="tactical-surface group overflow-hidden cursor-pointer">
                  <div className="relative h-48 bg-[#262626] overflow-hidden">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="tactical-heading text-[#9ca3af] text-xs">NO IMAGE</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h2 className="tactical-heading text-sm text-white mb-2">
                      {product.name.toUpperCase()}
                    </h2>
                    <p className="text-white font-semibold text-sm">
                      ${Number(product.price).toFixed(2)}
                    </p>
                    <button className="tactical-btn-primary w-full text-xs mt-3 py-2 px-4">
                      VIEW PRODUCT
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
```

Add `import Image from "next/image";` and `import Link from "next/link";` at the top if not already present.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
docker compose exec nextjs npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add app/shop/page.tsx
git commit -m "feat: shop page dark card grid reskin"
```

---

### Task 15: Blog page dark card grid reskin

**Files:**
- Modify: `app/blog/page.tsx`

- [ ] **Step 1: Read `app/blog/page.tsx` for the existing data-fetch structure**

The existing blog page already has: `export const dynamic = 'force-dynamic'`, fetches `blogPosts` with `isNotNull(blogPosts.publishedAt)`, variable is `posts`, each post has `id`, `title`, `slug`, `content`, `publishedAt`. Excerpt derived as `post.content.replace(/<[^>]*>/g, '').substring(0, 150) + '...'`.

- [ ] **Step 2: Replace `app/blog/page.tsx`**

```typescript
// app/blog/page.tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";
import { desc, isNotNull } from "drizzle-orm";

export default async function BlogPage() {
  const posts = await db
    .select()
    .from(blogPosts)
    .where(isNotNull(blogPosts.publishedAt))
    .orderBy(desc(blogPosts.publishedAt));

  return (
    <main className="bg-[#0a0a0a] text-white min-h-screen">
      <section className="bg-[#141414] border-b border-[#262626] py-12">
        <div className="container mx-auto px-4">
          <h1 className="tactical-heading text-4xl text-white">INTEL</h1>
          <p className="text-[#9ca3af] mt-2">Training insights. Tactical knowledge. Mission updates.</p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        {posts.length === 0 ? (
          <p className="text-center text-[#9ca3af] py-20 tactical-heading">
            NO POSTS YET. CHECK BACK SOON.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => {
              const excerpt = post.content
                ? post.content.replace(/<[^>]*>/g, "").substring(0, 150) + "..."
                : "";
              return (
                <Link key={post.id} href={`/blog/${post.slug}`}>
                  <div className="tactical-surface group overflow-hidden cursor-pointer h-full flex flex-col">
                    <div className="relative h-48 bg-[#262626] overflow-hidden">
                      {(post as { imageUrl?: string }).imageUrl ? (
                        <Image
                          src={(post as { imageUrl?: string }).imageUrl!}
                          alt={post.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full bg-[#262626]" />
                      )}
                      <span className="absolute top-3 left-3 tactical-heading text-xs bg-[#B22222] text-white px-2 py-1">
                        INTEL
                      </span>
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <h2 className="tactical-heading text-base text-white mb-2 flex-1 line-clamp-2">
                        {post.title.toUpperCase()}
                      </h2>
                      {excerpt && (
                        <p className="text-[#9ca3af] text-sm mb-3 line-clamp-2">{excerpt}</p>
                      )}
                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-[#262626]">
                        <span className="text-[#9ca3af] text-xs">
                          {post.publishedAt
                            ? new Date(post.publishedAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : ""}
                        </span>
                        <span className="tactical-heading text-xs text-[#B22222]">READ MORE →</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
```

Note: The `imageUrl` cast `(post as { imageUrl?: string })` handles cases where the blogPosts schema may or may not have that column. Check `\d blog_posts` and remove the cast if the column exists in the schema type.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
docker compose exec nextjs npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add app/blog/page.tsx
git commit -m "feat: blog page dark card grid reskin"
```

---

## Phase 7: Admin Extensions

### Task 16: Admin API routes for new tables

**Files:**
- Create: `app/api/admin/services/route.ts`
- Create: `app/api/admin/clients/route.ts`
- Create: `app/api/admin/page-content/route.ts`
- Create: `app/api/admin/subscribers/route.ts`
- Create: `app/api/admin/contact-submissions/route.ts`

Auth pattern used in all routes below (copied from existing `app/api/admin/courses/route.ts`):

```typescript
import { auth } from "@/auth";
// ...
const session = await auth();
if (!session || session.user.role !== "admin") {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

All admin routes return `{ data: [...], total: N }` for React-Admin compatibility.

- [ ] **Step 1: Create `app/api/admin/services/route.ts`**

```typescript
// app/api/admin/services/route.ts
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { services } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const all = await db.select().from(services).orderBy(services.sortOrder);
  return NextResponse.json({ data: all, total: all.length });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const [created] = await db.insert(services).values(body).returning();
  return NextResponse.json({ data: created }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { id, ...data } = body;
  const [updated] = await db.update(services).set(data).where(eq(services.id, Number(id))).returning();
  return NextResponse.json({ data: updated });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await req.json();
  await db.delete(services).where(eq(services.id, Number(id)));
  return NextResponse.json({ data: { id } });
}
```

- [ ] **Step 2: Create `app/api/admin/clients/route.ts`**

```typescript
// app/api/admin/clients/route.ts
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const all = await db.select().from(clients).orderBy(clients.sortOrder);
  return NextResponse.json({ data: all, total: all.length });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const [created] = await db.insert(clients).values(body).returning();
  return NextResponse.json({ data: created }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { id, ...data } = body;
  const [updated] = await db.update(clients).set(data).where(eq(clients.id, Number(id))).returning();
  return NextResponse.json({ data: updated });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await req.json();
  await db.delete(clients).where(eq(clients.id, Number(id)));
  return NextResponse.json({ data: { id } });
}
```

- [ ] **Step 3: Create `app/api/admin/page-content/route.ts`**

```typescript
// app/api/admin/page-content/route.ts
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { pageContent } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const all = await db.select().from(pageContent);
  return NextResponse.json({ data: all, total: all.length });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { id, value } = body;
  const [updated] = await db
    .update(pageContent)
    .set({ value, updatedAt: new Date() })
    .where(eq(pageContent.id, Number(id)))
    .returning();
  return NextResponse.json({ data: updated });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const [created] = await db.insert(pageContent).values(body).returning();
  return NextResponse.json({ data: created }, { status: 201 });
}
```

- [ ] **Step 4: Create `app/api/admin/subscribers/route.ts`**

```typescript
// app/api/admin/subscribers/route.ts
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { newsletterSubscriptions } from "@/lib/db/schema";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const all = await db.select().from(newsletterSubscriptions).orderBy(newsletterSubscriptions.subscribedAt);

  const { searchParams } = new URL(req.url);
  if (searchParams.get("format") === "csv") {
    const csv = [
      "id,email,firstName,subscribedAt,source,webhookSent",
      ...all.map(
        (r) =>
          `${r.id},${r.email},${r.firstName ?? ""},${r.subscribedAt.toISOString()},${r.source},${r.webhookSent}`
      ),
    ].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="subscribers-${Date.now()}.csv"`,
      },
    });
  }

  return NextResponse.json({ data: all, total: all.length });
}
```

- [ ] **Step 5: Create `app/api/admin/contact-submissions/route.ts`**

```typescript
// app/api/admin/contact-submissions/route.ts
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { contactSubmissions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const all = await db.select().from(contactSubmissions).orderBy(contactSubmissions.createdAt);
  return NextResponse.json({ data: all, total: all.length });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, isRead } = await req.json();
  const [updated] = await db
    .update(contactSubmissions)
    .set({ isRead })
    .where(eq(contactSubmissions.id, Number(id)))
    .returning();
  return NextResponse.json({ data: updated });
}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
docker compose exec nextjs npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add app/api/admin/services/route.ts app/api/admin/clients/route.ts app/api/admin/page-content/route.ts app/api/admin/subscribers/route.ts app/api/admin/contact-submissions/route.ts
git commit -m "feat: admin API routes for services, clients, page-content, subscribers, contact-submissions"
```

---

### Task 17: React-Admin resource components + AdminApp registration

**Files:**
- Create: `app/admin/services.tsx`
- Create: `app/admin/clients.tsx`
- Create: `app/admin/page-content.tsx`
- Create: `app/admin/subscribers.tsx`
- Create: `app/admin/contact-submissions.tsx`
- Modify: `app/admin/AdminApp.tsx`
- Modify: `app/admin/courses.tsx`

- [ ] **Step 1: Read existing AdminApp.tsx to find Resource registration pattern**

```bash
head -60 /home/chicagojoe/PyCharmProjects/selfhosted/websites/acdefense-website/app/admin/AdminApp.tsx
```

Note how existing resources are registered (`<Resource name="..." list={...} />`). Use the same pattern below.

- [ ] **Step 2: Create `app/admin/services.tsx`**

```typescript
// app/admin/services.tsx
import {
  List, Datagrid, TextField, NumberField, BooleanField,
  Edit, SimpleForm, TextInput, NumberInput, BooleanInput,
  Create,
} from "react-admin";

export const ServiceList = () => (
  <List>
    <Datagrid rowClick="edit">
      <TextField source="id" />
      <TextField source="name" />
      <NumberField source="price" options={{ style: "currency", currency: "USD" }} />
      <NumberField source="durationMinutes" label="Duration (min)" />
      <BooleanField source="isActive" />
      <NumberField source="sortOrder" />
    </Datagrid>
  </List>
);

const ServiceForm = () => (
  <SimpleForm>
    <TextInput source="name" fullWidth />
    <TextInput source="slug" fullWidth />
    <TextInput source="description" multiline fullWidth />
    <NumberInput source="durationMinutes" label="Duration (minutes)" />
    <NumberInput source="price" />
    <TextInput source="imageUrl" label="Image URL" fullWidth />
    <TextInput source="bookingUrl" label="Booking URL" fullWidth />
    <BooleanInput source="isActive" />
    <NumberInput source="sortOrder" />
  </SimpleForm>
);

export const ServiceEdit = () => <Edit><ServiceForm /></Edit>;
export const ServiceCreate = () => <Create><ServiceForm /></Create>;
```

- [ ] **Step 3: Create `app/admin/clients.tsx`**

```typescript
// app/admin/clients.tsx
import {
  List, Datagrid, TextField, BooleanField, NumberField,
  Edit, SimpleForm, TextInput, BooleanInput, NumberInput,
  Create,
} from "react-admin";

export const ClientList = () => (
  <List>
    <Datagrid rowClick="edit">
      <TextField source="id" />
      <TextField source="name" />
      <TextField source="websiteUrl" label="Website" />
      <BooleanField source="isActive" />
      <NumberField source="sortOrder" />
    </Datagrid>
  </List>
);

const ClientForm = () => (
  <SimpleForm>
    <TextInput source="name" fullWidth />
    <TextInput source="logoUrl" label="Logo URL" fullWidth />
    <TextInput source="websiteUrl" label="Website URL" fullWidth />
    <BooleanInput source="isActive" />
    <NumberInput source="sortOrder" />
  </SimpleForm>
);

export const ClientEdit = () => <Edit><ClientForm /></Edit>;
export const ClientCreate = () => <Create><ClientForm /></Create>;
```

- [ ] **Step 4: Create `app/admin/page-content.tsx`**

```typescript
// app/admin/page-content.tsx
import {
  List, Datagrid, TextField,
  Edit, SimpleForm, TextInput,
} from "react-admin";

export const PageContentList = () => (
  <List>
    <Datagrid rowClick="edit">
      <TextField source="id" />
      <TextField source="page" />
      <TextField source="key" />
      <TextField source="value" />
    </Datagrid>
  </List>
);

export const PageContentEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="page" disabled />
      <TextInput source="key" disabled />
      <TextInput source="value" multiline fullWidth rows={6} />
    </SimpleForm>
  </Edit>
);
```

- [ ] **Step 5: Create `app/admin/subscribers.tsx`**

```typescript
// app/admin/subscribers.tsx
import { List, Datagrid, TextField, DateField, BooleanField } from "react-admin";

export const SubscriberList = () => (
  <List>
    <Datagrid>
      <TextField source="id" />
      <TextField source="email" />
      <TextField source="firstName" />
      <DateField source="subscribedAt" showTime />
      <TextField source="source" />
      <BooleanField source="webhookSent" />
    </Datagrid>
  </List>
);
```

- [ ] **Step 6: Create `app/admin/contact-submissions.tsx`**

```typescript
// app/admin/contact-submissions.tsx
import {
  List, Datagrid, TextField, DateField, BooleanField,
  Edit, SimpleForm, BooleanInput,
} from "react-admin";

export const ContactSubmissionList = () => (
  <List sort={{ field: "createdAt", order: "DESC" }}>
    <Datagrid rowClick="edit">
      <TextField source="id" />
      <TextField source="firstName" />
      <TextField source="lastName" />
      <TextField source="email" />
      <TextField source="message" />
      <BooleanField source="isRead" />
      <DateField source="createdAt" showTime />
    </Datagrid>
  </List>
);

export const ContactSubmissionEdit = () => (
  <Edit>
    <SimpleForm>
      <TextField source="firstName" />
      <TextField source="lastName" />
      <TextField source="email" />
      <TextField source="message" />
      <BooleanInput source="isRead" />
    </SimpleForm>
  </Edit>
);
```

- [ ] **Step 7: Register new resources in `app/admin/AdminApp.tsx`**

Add imports at the top:

```typescript
import { ServiceList, ServiceEdit, ServiceCreate } from "./services";
import { ClientList, ClientEdit, ClientCreate } from "./clients";
import { PageContentList, PageContentEdit } from "./page-content";
import { SubscriberList } from "./subscribers";
import { ContactSubmissionList, ContactSubmissionEdit } from "./contact-submissions";
```

Inside the `<Admin>` component, after the last existing `<Resource>`:

```typescript
<Resource name="services" list={ServiceList} edit={ServiceEdit} create={ServiceCreate} />
<Resource name="clients" list={ClientList} edit={ClientEdit} create={ClientCreate} />
<Resource name="page-content" list={PageContentList} edit={PageContentEdit} />
<Resource name="subscribers" list={SubscriberList} />
<Resource name="contact-submissions" list={ContactSubmissionList} edit={ContactSubmissionEdit} />
```

- [ ] **Step 8: Add audience + courseCategory fields to `app/admin/courses.tsx`**

Read the existing file first:

```bash
head -60 /home/chicagojoe/PyCharmProjects/selfhosted/websites/acdefense-website/app/admin/courses.tsx
```

Add `SelectInput` import if not present:

```typescript
import { SelectInput } from "react-admin";
```

Add these two fields to both the Edit and Create `SimpleForm` blocks (before the closing `</SimpleForm>`):

```typescript
<SelectInput
  source="audience"
  choices={[
    { id: "open_enrollment", name: "Open Enrollment" },
    { id: "law_enforcement", name: "Law Enforcement" },
    { id: "military", name: "Military" },
  ]}
/>
<SelectInput
  source="courseCategory"
  label="Course Category"
  choices={[
    { id: "ccl_renewal", name: "CCL & Renewal" },
    { id: "defensive_firearms", name: "Defensive Firearms" },
    { id: "fcc_advanced", name: "FCC Requal & Advanced" },
    { id: "other", name: "Other" },
  ]}
/>
```

- [ ] **Step 9: Verify TypeScript compiles**

```bash
docker compose exec nextjs npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 10: Commit**

```bash
git add app/admin/services.tsx app/admin/clients.tsx app/admin/page-content.tsx app/admin/subscribers.tsx app/admin/contact-submissions.tsx app/admin/AdminApp.tsx app/admin/courses.tsx
git commit -m "feat: admin panels for services, clients, page-content, subscribers, contact-submissions; audience+category on courses"
```

---

## Phase 8: Final Verification

### Task 18: Smoke test all pages + env var

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Add NEWSLETTER_WEBHOOK_URL to .env.example**

```bash
echo "" >> /home/chicagojoe/PyCharmProjects/selfhosted/websites/acdefense-website/.env.example
echo "# Newsletter webhook (optional — Mailchimp, ConvertKit, etc.)" >> /home/chicagojoe/PyCharmProjects/selfhosted/websites/acdefense-website/.env.example
echo "NEWSLETTER_WEBHOOK_URL=" >> /home/chicagojoe/PyCharmProjects/selfhosted/websites/acdefense-website/.env.example
```

- [ ] **Step 2: Full TypeScript check**

```bash
docker compose exec nextjs npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Smoke test every public page**

```bash
for path in "/" "/courses" "/courses?audience=law_enforcement" "/courses?audience=military" "/legal-services" "/security" "/vets2" "/team" "/shop" "/blog" "/contact"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$path")
  echo "$status  $path"
done
```

Expected: All return `200`.

- [ ] **Step 4: Smoke test redirects**

```bash
curl -s -o /dev/null -w "%{http_code} → %{redirect_url}\n" http://localhost:3000/about
curl -s -o /dev/null -w "%{http_code} → %{redirect_url}\n" http://localhost:3000/instructors
```

Expected: `307 → http://localhost:3000/team` (or `308`).

- [ ] **Step 5: Verify admin panel loads with new sections**

Navigate to `http://localhost:3000/admin`. Log in as `admin@acdefenseco.net`. Confirm left sidebar shows: **Services, Clients, Page Content, Subscribers, Contact Submissions**.

- [ ] **Step 6: Final commit**

```bash
git add .env.example
git commit -m "chore: add NEWSLETTER_WEBHOOK_URL env var — redesign complete"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All 10 public pages covered (home, courses, course-detail, legal-services, security, vets2, team, shop, blog, contact). All 5 new DB tables implemented. All 5 admin panels created. Audience 3-tab filter on courses. Redirects for /about and /instructors.
- [x] **No placeholders:** No TBD, no "implement later", no "handle edge cases" without code.
- [x] **Type consistency:** `instructorProfiles.photoUrl` used throughout (not `imageUrl`). `instructorProfiles.certifications` split by `\n` for credential bullets. `audienceEnum` / `courseCategoryEnum` consistent in schema and page queries.
- [x] **Auth pattern:** Consistent `auth()` + role check in all 5 admin routes.
- [x] **React-Admin format:** All admin GET routes return `{ data: [...], total: N }`.
- [x] **No blog imageUrl assumption:** Cast used with note to verify and remove cast if column exists.
