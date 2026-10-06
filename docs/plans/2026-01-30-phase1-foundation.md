# ACDefenseCo Website - Phase 1: Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up Next.js 14 project with TypeScript, Docker Compose, Drizzle ORM, NextAuth, and Tailwind CSS + shadcn/ui

**Architecture:** Server-first Next.js App Router with React Server Components, PostgreSQL via Docker for local dev (Turso in production), type-safe database access with Drizzle ORM, secure authentication with NextAuth v5

**Tech Stack:** Next.js 14, TypeScript, Docker Compose, PostgreSQL 16, Drizzle ORM, NextAuth v5, Tailwind CSS, shadcn/ui, Zod validation

---

## Task 1: Initialize Next.js Project with TypeScript

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.js`
- Create: `.gitignore`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`

**Step 1: Initialize Next.js project**

Run: `cd ~/.config/superpowers/worktrees/acdefense-website/feature/initial-setup && npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"`

Answer prompts:
- Would you like to use ESLint? Yes
- Would you like to use Turbopack? No
- Would you like to customize import alias? No

Expected: Project initialized with TypeScript, Tailwind, App Router

**Step 2: Verify project structure**

Run: `ls -la`

Expected output should include:
```
app/
public/
package.json
tsconfig.json
tailwind.config.ts
next.config.js
.gitignore
```

**Step 3: Install dependencies**

Run: `npm install`

Expected: Dependencies installed successfully

**Step 4: Test dev server**

Run: `npm run dev`

Expected: Server starts on http://localhost:3000

Stop server with Ctrl+C

**Step 5: Commit**

```bash
git add .
git commit -m "feat: initialize Next.js 14 project with TypeScript and Tailwind

- Next.js 14 with App Router
- TypeScript configuration
- Tailwind CSS setup
- ESLint configuration

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Set Up Docker Compose

**Files:**
- Create: `docker-compose.yml`
- Create: `Dockerfile`
- Create: `.dockerignore`
- Create: `.env.example`
- Create: `.env.local`

**Step 1: Create docker-compose.yml**

Create: `docker-compose.yml`

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    container_name: acdefense-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: acdefense
      POSTGRES_PASSWORD: dev_password_change_in_prod
      POSTGRES_DB: acdefense
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U acdefense"]
      interval: 10s
      timeout: 5s
      retries: 5

  nextjs:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: acdefense-nextjs
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://acdefense:dev_password_change_in_prod@postgres:5432/acdefense
      - NEXTAUTH_URL=http://localhost:3000
      - NODE_ENV=development
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      postgres:
        condition: service_healthy
    command: npm run dev

volumes:
  postgres_data:
```

**Step 2: Create Dockerfile**

Create: `Dockerfile`

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy project files
COPY . .

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]
```

**Step 3: Create .dockerignore**

Create: `.dockerignore`

```
node_modules
.next
.git
.gitignore
README.md
.env.local
.env*.local
npm-debug.log*
yarn-debug.log*
yarn-error.log*
```

**Step 4: Create environment files**

Create: `.env.example`

```
# Database
DATABASE_URL=postgresql://acdefense:dev_password_change_in_prod@postgres:5432/acdefense

# NextAuth
NEXTAUTH_SECRET=change_this_to_random_string_in_production
NEXTAUTH_URL=http://localhost:3000

# Stripe (test keys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# ConstantContact
CC_API_KEY=your_api_key_here
CC_ACCESS_TOKEN=your_access_token_here
```

Copy to `.env.local`: `cp .env.example .env.local`

**Step 5: Test Docker Compose**

Run: `docker-compose up -d postgres`

Expected: PostgreSQL container starts successfully

Verify: `docker-compose ps`

Expected output:
```
NAME                  STATUS
acdefense-postgres    Up (healthy)
```

**Step 6: Commit**

```bash
git add docker-compose.yml Dockerfile .dockerignore .env.example
git commit -m "feat: add Docker Compose configuration

- PostgreSQL 16 container
- Next.js development container
- Health checks and volume persistence
- Environment variable templates

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Install and Configure Drizzle ORM

**Files:**
- Create: `drizzle.config.ts`
- Create: `src/lib/db/index.ts`
- Create: `src/lib/db/schema.ts`
- Modify: `package.json`

**Step 1: Install Drizzle dependencies**

Run: `npm install drizzle-orm postgres`

Run: `npm install -D drizzle-kit @types/pg`

Expected: Packages installed successfully

**Step 2: Create Drizzle config**

Create: `drizzle.config.ts`

```typescript
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

**Step 3: Create database client**

Create directory: `mkdir -p src/lib/db`

Create: `src/lib/db/index.ts`

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL!;

// Disable prefetch as it's not supported in Postgres.js + Drizzle
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client);
```

**Step 4: Create initial schema**

Create: `src/lib/db/schema.ts`

```typescript
import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  decimal,
  jsonb,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";

// Enums
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "completed",
  "cancelled",
  "refunded",
]);
export const scheduleStatusEnum = pgEnum("schedule_status", [
  "open",
  "full",
  "cancelled",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "completed",
  "failed",
  "refunded",
]);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  name: text("name"),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// OAuth accounts table
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  expiresAt: integer("expires_at"),
  tokenType: text("token_type"),
  scope: text("scope"),
  idToken: text("id_token"),
  sessionState: text("session_state"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Sessions table
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  sessionToken: text("session_token").notNull().unique(),
  expires: timestamp("expires").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Product categories
export const productCategories = pgTable("product_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Products
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  images: jsonb("images").$type<string[]>().default([]),
  inventoryCount: integer("inventory_count").default(0).notNull(),
  categoryId: integer("category_id").references(() => productCategories.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Cart items
export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  productId: integer("product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  quantity: integer("quantity").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Orders
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: orderStatusEnum("status").default("pending").notNull(),
  stripePaymentId: text("stripe_payment_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Order items
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .references(() => orders.id, { onDelete: "cascade" })
    .notNull(),
  productId: integer("product_id")
    .references(() => products.id)
    .notNull(),
  quantity: integer("quantity").notNull(),
  priceAtPurchase: decimal("price_at_purchase", {
    precision: 10,
    scale: 2,
  }).notNull(),
});

// Courses
export const courses = pgTable("courses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  tagline: text("tagline"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  durationHours: integer("duration_hours").notNull(),
  maxCapacity: integer("max_capacity").notNull(),
  prerequisites: text("prerequisites"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Course schedules
export const courseSchedules = pgTable("course_schedules", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id")
    .references(() => courses.id, { onDelete: "cascade" })
    .notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  availableSeats: integer("available_seats").notNull(),
  status: scheduleStatusEnum("status").default("open").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Bookings
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  scheduleId: integer("schedule_id")
    .references(() => courseSchedules.id)
    .notNull(),
  paymentStatus: paymentStatusEnum("payment_status")
    .default("pending")
    .notNull(),
  stripePaymentId: text("stripe_payment_id"),
  constantcontactContactId: text("constantcontact_contact_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Booking status history
export const bookingStatusHistory = pgTable("booking_status_history", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .references(() => bookings.id, { onDelete: "cascade" })
    .notNull(),
  status: paymentStatusEnum("status").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Blog posts
export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  content: text("content"),
  author: text("author"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Instructor profiles
export const instructorProfiles = pgTable("instructor_profiles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  bio: text("bio"),
  photoUrl: text("photo_url"),
  certifications: text("certifications"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**Step 5: Add database scripts to package.json**

Modify: `package.json` - add to `scripts` section:

```json
"db:generate": "drizzle-kit generate:pg",
"db:push": "drizzle-kit push:pg",
"db:studio": "drizzle-kit studio"
```

**Step 6: Generate and push migration**

Run: `npm run db:generate`

Expected: Migration files generated in `drizzle/` directory

Run: `npm run db:push`

Expected: Schema pushed to PostgreSQL database

**Step 7: Commit**

```bash
git add src/lib/db/ drizzle.config.ts package.json package-lock.json
git commit -m "feat: add Drizzle ORM with complete database schema

- Configure Drizzle with PostgreSQL
- Define all tables: users, products, orders, courses, bookings
- Add enums for status fields
- Database migration scripts

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Configure Tailwind CSS and Install shadcn/ui

**Files:**
- Modify: `tailwind.config.ts`
- Create: `src/lib/utils.ts`
- Create: `components.json`
- Modify: `app/globals.css`

**Step 1: Install shadcn/ui dependencies**

Run: `npx shadcn-ui@latest init`

Answer prompts:
- Which style would you like to use? Default
- Which color would you like to use as base color? Slate
- Would you like to use CSS variables for colors? Yes

Expected: shadcn/ui initialized with components.json

**Step 2: Update Tailwind config for dark theme**

Modify: `tailwind.config.ts`

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Custom tactical colors
        tactical: {
          dark: "#0f172a",
          slate: "#1e293b",
          orange: "#ff6b35",
          red: "#dc2626",
          green: "#4ade80",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

**Step 3: Update globals.css with tactical theme**

Modify: `app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}

/* Tactical theme overrides */
body {
  @apply dark:bg-tactical-dark;
}
```

**Step 4: Install initial shadcn/ui components**

Run: `npx shadcn-ui@latest add button card input label`

Expected: Components added to `components/ui/`

**Step 5: Test Tailwind and shadcn/ui**

Modify: `app/page.tsx`

```typescript
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-tactical-dark">
      <Card className="p-8">
        <h1 className="text-4xl font-bold text-tactical-orange mb-4">
          ACDefenseCo
        </h1>
        <p className="text-lg text-muted-foreground mb-6">
          PROTECT WHAT'S S.A.C.R.E.D.
        </p>
        <Button className="bg-tactical-red hover:bg-tactical-orange">
          View Courses
        </Button>
      </Card>
    </main>
  );
}
```

Run: `npm run dev`

Visit: http://localhost:3000

Expected: Dark themed page with tactical colors, button, and card

**Step 6: Commit**

```bash
git add tailwind.config.ts app/globals.css components/ components.json src/lib/utils.ts app/page.tsx
git commit -m "feat: configure Tailwind CSS with tactical theme and shadcn/ui

- Initialize shadcn/ui with slate base color
- Add custom tactical color palette
- Install button, card, input, label components
- Apply dark tactical theme to homepage

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Set Up NextAuth v5

**Files:**
- Create: `src/lib/auth/config.ts`
- Create: `src/lib/auth/index.ts`
- Create: `src/lib/auth/adapter.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `middleware.ts`

**Step 1: Install NextAuth and dependencies**

Run: `npm install next-auth@beta bcryptjs zod`

Run: `npm install -D @types/bcryptjs`

Expected: Packages installed

**Step 2: Generate NextAuth secret**

Run: `openssl rand -base64 32`

Copy output and add to `.env.local`:

```
NEXTAUTH_SECRET=<paste_generated_secret_here>
```

**Step 3: Create auth adapter**

Create: `src/lib/auth/adapter.ts`

```typescript
import { Adapter, AdapterAccount, AdapterSession, AdapterUser } from "next-auth/adapters";
import { db } from "@/lib/db";
import { users, accounts, sessions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export function DrizzleAdapter(): Adapter {
  return {
    async createUser(user: Omit<AdapterUser, "id">) {
      const [newUser] = await db
        .insert(users)
        .values({
          email: user.email,
          name: user.name,
          // passwordHash will be set separately for credentials
        })
        .returning();

      return {
        id: newUser.id.toString(),
        email: newUser.email,
        emailVerified: null,
        name: newUser.name,
      };
    },

    async getUser(id: string) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(id)));

      if (!user) return null;

      return {
        id: user.id.toString(),
        email: user.email,
        emailVerified: null,
        name: user.name,
      };
    },

    async getUserByEmail(email: string) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

      if (!user) return null;

      return {
        id: user.id.toString(),
        email: user.email,
        emailVerified: null,
        name: user.name,
      };
    },

    async getUserByAccount({ providerAccountId, provider }) {
      const [account] = await db
        .select()
        .from(accounts)
        .where(
          and(
            eq(accounts.provider, provider),
            eq(accounts.providerAccountId, providerAccountId)
          )
        );

      if (!account) return null;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, account.userId));

      if (!user) return null;

      return {
        id: user.id.toString(),
        email: user.email,
        emailVerified: null,
        name: user.name,
      };
    },

    async updateUser(user: Partial<AdapterUser> & Pick<AdapterUser, "id">) {
      const [updatedUser] = await db
        .update(users)
        .set({
          name: user.name,
          email: user.email,
        })
        .where(eq(users.id, parseInt(user.id)))
        .returning();

      return {
        id: updatedUser.id.toString(),
        email: updatedUser.email,
        emailVerified: null,
        name: updatedUser.name,
      };
    },

    async deleteUser(userId: string) {
      await db.delete(users).where(eq(users.id, parseInt(userId)));
    },

    async linkAccount(account: AdapterAccount) {
      await db.insert(accounts).values({
        userId: parseInt(account.userId),
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        refreshToken: account.refresh_token,
        accessToken: account.access_token,
        expiresAt: account.expires_at,
        tokenType: account.token_type,
        scope: account.scope,
        idToken: account.id_token,
        sessionState: account.session_state,
      });
    },

    async unlinkAccount({ providerAccountId, provider }) {
      await db
        .delete(accounts)
        .where(
          and(
            eq(accounts.provider, provider),
            eq(accounts.providerAccountId, providerAccountId)
          )
        );
    },

    async createSession(session: {
      sessionToken: string;
      userId: string;
      expires: Date;
    }) {
      const [newSession] = await db
        .insert(sessions)
        .values({
          sessionToken: session.sessionToken,
          userId: parseInt(session.userId),
          expires: session.expires,
        })
        .returning();

      return {
        sessionToken: newSession.sessionToken,
        userId: newSession.userId.toString(),
        expires: newSession.expires,
      };
    },

    async getSessionAndUser(sessionToken: string) {
      const [sessionAndUser] = await db
        .select()
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(eq(sessions.sessionToken, sessionToken));

      if (!sessionAndUser) return null;

      return {
        session: {
          sessionToken: sessionAndUser.sessions.sessionToken,
          userId: sessionAndUser.sessions.userId.toString(),
          expires: sessionAndUser.sessions.expires,
        },
        user: {
          id: sessionAndUser.users.id.toString(),
          email: sessionAndUser.users.email,
          emailVerified: null,
          name: sessionAndUser.users.name,
        },
      };
    },

    async updateSession(
      session: Partial<AdapterSession> & Pick<AdapterSession, "sessionToken">
    ) {
      const [updatedSession] = await db
        .update(sessions)
        .set({
          expires: session.expires,
        })
        .where(eq(sessions.sessionToken, session.sessionToken))
        .returning();

      return {
        sessionToken: updatedSession.sessionToken,
        userId: updatedSession.userId.toString(),
        expires: updatedSession.expires,
      };
    },

    async deleteSession(sessionToken: string) {
      await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
    },
  };
}
```

**Step 4: Create auth configuration**

Create: `src/lib/auth/config.ts`

```typescript
import type { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { DrizzleAdapter } from "./adapter";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const authConfig: NextAuthConfig = {
  adapter: DrizzleAdapter(),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const validatedFields = loginSchema.safeParse(credentials);

        if (!validatedFields.success) {
          return null;
        }

        const { email, password } = validatedFields.data;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email));

        if (!user || !user.passwordHash) {
          return null;
        }

        const passwordsMatch = await bcrypt.compare(password, user.passwordHash);

        if (!passwordsMatch) {
          return null;
        }

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};
```

**Step 5: Create auth exports**

Create: `src/lib/auth/index.ts`

```typescript
import NextAuth from "next-auth";
import { authConfig } from "./config";

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
```

**Step 6: Create API route**

Create directories: `mkdir -p app/api/auth/\[...nextauth\]`

Create: `app/api/auth/[...nextauth]/route.ts`

```typescript
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

**Step 7: Create middleware for protected routes**

Create: `middleware.ts`

```typescript
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnAdminRoute = req.nextUrl.pathname.startsWith("/admin");
  const isOnAccountRoute = req.nextUrl.pathname.startsWith("/account");

  if (isOnAdminRoute || isOnAccountRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    if (isOnAdminRoute && req.auth?.user?.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

**Step 8: Commit**

```bash
git add src/lib/auth/ app/api/auth/ middleware.ts package.json package-lock.json
git commit -m "feat: implement NextAuth v5 with credentials provider

- Custom Drizzle adapter for database integration
- Credentials provider with bcrypt password hashing
- JWT sessions with role-based access control
- Middleware for protected routes (admin, account)
- API routes for authentication

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Create Basic Layout Structure

**Files:**
- Create: `app/(marketing)/layout.tsx`
- Create: `app/(auth)/layout.tsx`
- Create: `components/layout/header.tsx`
- Create: `components/layout/footer.tsx`
- Create: `components/layout/nav.tsx`
- Modify: `app/layout.tsx`

**Step 1: Update root layout**

Modify: `app/layout.tsx`

```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ACDefenseCo - PROTECT WHAT'S S.A.C.R.E.D.",
  description:
    "Chicago-based defense consultant & security school. Concealed carry training, self-defense courses, and tactical gear.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

**Step 2: Create navigation component**

Create directories: `mkdir -p components/layout`

Create: `components/layout/nav.tsx`

```typescript
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Nav() {
  return (
    <nav className="flex items-center space-x-6">
      <Link
        href="/"
        className="text-sm font-medium text-foreground hover:text-tactical-orange transition-colors"
      >
        Home
      </Link>
      <Link
        href="/courses"
        className="text-sm font-medium text-foreground hover:text-tactical-orange transition-colors"
      >
        Courses
      </Link>
      <Link
        href="/shop"
        className="text-sm font-medium text-foreground hover:text-tactical-orange transition-colors"
      >
        Shop
      </Link>
      <Link
        href="/about"
        className="text-sm font-medium text-foreground hover:text-tactical-orange transition-colors"
      >
        About
      </Link>
    </nav>
  );
}
```

**Step 3: Create header component**

Create: `components/layout/header.tsx`

```typescript
import Link from "next/link";
import { Nav } from "./nav";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-tactical-slate/95 backdrop-blur supports-[backdrop-filter]:bg-tactical-slate/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-2xl font-bold text-tactical-orange">
            ACDefenseCo
          </span>
        </Link>

        <Nav />

        <div className="flex items-center space-x-4">
          <Button variant="ghost" asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button className="bg-tactical-red hover:bg-tactical-orange" asChild>
            <Link href="/register">Get Started</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
```

**Step 4: Create footer component**

Create: `components/layout/footer.tsx`

```typescript
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-tactical-slate">
      <div className="container py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <h3 className="text-lg font-bold text-tactical-orange mb-4">
              ACDefenseCo
            </h3>
            <p className="text-sm text-muted-foreground">
              PROTECT WHAT'S S.A.C.R.E.D.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Chicago, IL
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-4">Courses</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/courses" className="hover:text-tactical-orange">
                  All Courses
                </Link>
              </li>
              <li>
                <Link
                  href="/courses/concealed-carry"
                  className="hover:text-tactical-orange"
                >
                  Concealed Carry
                </Link>
              </li>
              <li>
                <Link
                  href="/courses/combat-pistol"
                  className="hover:text-tactical-orange"
                >
                  Combat Pistol
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-4">Shop</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/shop" className="hover:text-tactical-orange">
                  All Products
                </Link>
              </li>
              <li>
                <Link
                  href="/shop/gear"
                  className="hover:text-tactical-orange"
                >
                  Tactical Gear
                </Link>
              </li>
              <li>
                <Link
                  href="/shop/accessories"
                  className="hover:text-tactical-orange"
                >
                  Accessories
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/about" className="hover:text-tactical-orange">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-tactical-orange">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-border/40 pt-8 text-center text-sm text-muted-foreground">
          <p>
            © {new Date().getFullYear()} American Civil Defense Company. All
            rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
```

**Step 5: Create marketing layout**

Create directories: `mkdir -p app/\(marketing\)`

Create: `app/(marketing)/layout.tsx`

```typescript
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
```

**Step 6: Create auth layout**

Create directories: `mkdir -p app/\(auth\)`

Create: `app/(auth)/layout.tsx`

```typescript
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-tactical-dark">
      {children}
    </div>
  );
}
```

**Step 7: Move homepage to marketing group**

Run: `mkdir -p app/\(marketing\) && mv app/page.tsx app/\(marketing\)/page.tsx`

**Step 8: Test layouts**

Run: `npm run dev`

Visit: http://localhost:3000

Expected: Homepage with header, footer, and navigation

**Step 9: Commit**

```bash
git add app/layout.tsx app/\(marketing\)/ app/\(auth\)/ components/layout/
git commit -m "feat: create layout structure with header and footer

- Marketing layout with header and footer
- Auth layout for login/register pages
- Navigation component with tactical styling
- Responsive header with logo and CTAs
- Footer with course/shop links

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Add Database Seed Script

**Files:**
- Create: `src/lib/db/seed.ts`
- Modify: `package.json`

**Step 1: Create seed script**

Create: `src/lib/db/seed.ts`

```typescript
import { db } from "./index";
import {
  users,
  productCategories,
  products,
  courses,
  instructorProfiles,
} from "./schema";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const [adminUser] = await db
    .insert(users)
    .values({
      email: "admin@acdefense.com",
      passwordHash: adminPasswordHash,
      name: "Admin User",
      role: "admin",
    })
    .returning();
  console.log("✅ Created admin user");

  // Create regular user
  const userPasswordHash = await bcrypt.hash("user123", 10);
  const [regularUser] = await db
    .insert(users)
    .values({
      email: "user@example.com",
      passwordHash: userPasswordHash,
      name: "John Doe",
      role: "user",
    })
    .returning();
  console.log("✅ Created regular user");

  // Create product categories
  const categories = await db
    .insert(productCategories)
    .values([
      {
        name: "Tactical Gear",
        slug: "tactical-gear",
        description: "Professional tactical equipment and gear",
      },
      {
        name: "Ammunition",
        slug: "ammunition",
        description: "Training and defensive ammunition",
      },
      {
        name: "Accessories",
        slug: "accessories",
        description: "Firearm accessories and equipment",
      },
      {
        name: "Training Equipment",
        slug: "training-equipment",
        description: "Equipment for training and practice",
      },
    ])
    .returning();
  console.log("✅ Created product categories");

  // Create sample products
  await db.insert(products).values([
    {
      name: "5.11 Tactical Vest",
      slug: "511-tactical-vest",
      description: "Professional-grade tactical vest with MOLLE system",
      price: "149.99",
      inventoryCount: 25,
      categoryId: categories[0].id,
      images: ["/products/tactical-vest.jpg"],
    },
    {
      name: "9mm Training Rounds (50ct)",
      slug: "9mm-training-rounds-50ct",
      description: "High-quality 9mm training ammunition",
      price: "29.99",
      inventoryCount: 100,
      categoryId: categories[1].id,
      images: ["/products/9mm-ammo.jpg"],
    },
    {
      name: "Holster - IWB Concealed Carry",
      slug: "holster-iwb-concealed-carry",
      description: "Comfortable inside-waistband holster",
      price: "49.99",
      inventoryCount: 50,
      categoryId: categories[2].id,
      images: ["/products/iwb-holster.jpg"],
    },
    {
      name: "Shooting Range Bag",
      slug: "shooting-range-bag",
      description: "Durable range bag with multiple compartments",
      price: "79.99",
      inventoryCount: 30,
      categoryId: categories[3].id,
      images: ["/products/range-bag.jpg"],
    },
  ]);
  console.log("✅ Created sample products");

  // Create courses
  await db.insert(courses).values([
    {
      name: "Concealed Carry License Certification",
      slug: "concealed-carry-license-certification",
      description:
        "Complete Illinois CCL certification course. Certified to carry in Illinois and 38 other states.",
      tagline: "Certified to carry a Firearm in Illinois and 38 Other States",
      price: "275.00",
      durationHours: 16,
      maxCapacity: 20,
      imageUrl: "/courses/ccl-cert.jpg",
    },
    {
      name: "Concealed Carry License Renewal",
      slug: "concealed-carry-license-renewal",
      description: "Refresh your skills and remain legally compliant with your CCL renewal.",
      tagline: "Refresh your skills, remain legally complaint",
      price: "125.00",
      durationHours: 3,
      maxCapacity: 20,
      imageUrl: "/courses/ccl-renewal.jpg",
    },
    {
      name: "First Shot Advantage",
      slug: "first-shot-advantage",
      description:
        "Master the decisive first shot. In a fight for your life, the first shot isn't just important—it's decisive.",
      tagline:
        "Because in a fight for your life, the first shot isn't just important—it's decisive.",
      price: "175.00",
      durationHours: 4,
      maxCapacity: 15,
      imageUrl: "/courses/first-shot.jpg",
    },
    {
      name: "Combat Pistol",
      slug: "combat-pistol",
      description:
        "From carry permit to combat-ready. Advanced pistol techniques for real-world scenarios.",
      tagline: "From Carry Permit to Combat-Ready",
      price: "199.00",
      durationHours: 6,
      maxCapacity: 12,
      imageUrl: "/courses/combat-pistol.jpg",
    },
    {
      name: "Mass Shooter Medical",
      slug: "mass-shooter-medical",
      description:
        "Train to fight. Train to save. Be ready for both. Critical medical response training.",
      tagline: "Train to Fight. Train to Save. Be Ready for Both.",
      price: "199.00",
      durationHours: 8,
      maxCapacity: 15,
      imageUrl: "/courses/mass-shooter-medical.jpg",
    },
  ]);
  console.log("✅ Created courses");

  // Create instructor profiles
  await db.insert(instructorProfiles).values([
    {
      name: "Instructor Team",
      bio: "Multigenerational family of MIL & LEO professionals dedicated to training American citizens in self-defense and protection.",
      photoUrl: "/team/instructor-team.jpg",
      certifications: "NRA Certified, USCCA Certified, Illinois State Licensed",
    },
  ]);
  console.log("✅ Created instructor profiles");

  console.log("✨ Database seeded successfully!");
}

seed()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
```

**Step 2: Add seed script to package.json**

Modify: `package.json` - add to `scripts`:

```json
"db:seed": "tsx src/lib/db/seed.ts"
```

**Step 3: Install tsx for running TypeScript**

Run: `npm install -D tsx`

Expected: Package installed

**Step 4: Run seed script**

Run: `npm run db:seed`

Expected output:
```
🌱 Seeding database...
✅ Created admin user
✅ Created regular user
✅ Created product categories
✅ Created sample products
✅ Created courses
✅ Created instructor profiles
✨ Database seeded successfully!
```

**Step 5: Verify seed data**

Run: `npm run db:studio`

Expected: Drizzle Studio opens at http://localhost:4983

Verify: Users, products, categories, and courses exist

**Step 6: Commit**

```bash
git add src/lib/db/seed.ts package.json package-lock.json
git commit -m "feat: add database seed script with sample data

- Admin and regular user accounts
- Product categories (Tactical Gear, Ammunition, etc.)
- Sample products with inventory
- 5 core courses from ACDefense catalog
- Instructor profile

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Update Docker Compose and Documentation

**Files:**
- Create: `README.md`
- Create: `docs/development.md`
- Modify: `docker-compose.yml`

**Step 1: Create comprehensive README**

Modify: `README.md`

```markdown
# ACDefenseCo Website

Modern, full-stack e-commerce and booking platform for American Civil Defense Company.

## Features

- 🛒 **E-commerce Shop** - Tactical gear, ammunition, and accessories
- 📅 **Class Booking System** - Real-time availability and scheduling
- 💳 **Stripe Integration** - Secure payment processing
- 📧 **ConstantContact** - Automated email marketing
- 🔐 **NextAuth** - Secure authentication with role-based access
- 🎨 **Tactical Theme** - Dark, military-inspired design

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL (dev) / Turso (prod)
- **ORM:** Drizzle
- **Auth:** NextAuth v5
- **Styling:** Tailwind CSS + shadcn/ui
- **Payments:** Stripe
- **Email:** ConstantContact API

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd acdefense-website
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

4. Start Docker services:
```bash
docker-compose up -d
```

5. Push database schema:
```bash
npm run db:push
```

6. Seed database:
```bash
npm run db:seed
```

7. Start development server:
```bash
npm run dev
```

8. Open [http://localhost:3000](http://localhost:3000)

## Development

### Database Commands

- `npm run db:generate` - Generate migrations
- `npm run db:push` - Push schema to database
- `npm run db:studio` - Open Drizzle Studio
- `npm run db:seed` - Seed sample data

### Test Accounts

After seeding:

- **Admin:** admin@acdefense.com / admin123
- **User:** user@example.com / user123

### Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart services
docker-compose restart
```

## Project Structure

```
acdefense-website/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Auth routes (login, register)
│   ├── (marketing)/         # Marketing routes (home, courses, shop)
│   ├── account/             # User account pages
│   ├── admin/               # Admin dashboard
│   └── api/                 # API routes
├── components/              # React components
│   ├── layout/              # Layout components
│   └── ui/                  # shadcn/ui components
├── src/
│   └── lib/
│       ├── auth/            # NextAuth configuration
│       └── db/              # Database schema and client
├── docs/                    # Documentation
└── docker-compose.yml       # Docker configuration
```

## Deployment

See [docs/deployment.md](docs/deployment.md) for production deployment instructions.

## License

Proprietary - American Civil Defense Company
```

**Step 2: Create development documentation**

Create: `docs/development.md`

```markdown
# Development Guide

## Phase 1: Foundation ✅

- [x] Next.js 14 with TypeScript
- [x] Docker Compose setup
- [x] Drizzle ORM with PostgreSQL
- [x] NextAuth v5 authentication
- [x] Tailwind CSS + shadcn/ui
- [x] Basic layouts (marketing, auth)
- [x] Database seed script

## Phase 2: E-commerce (Next)

- [ ] Product catalog pages
- [ ] Shopping cart functionality
- [ ] Stripe Checkout integration
- [ ] Order management
- [ ] Admin product management

## Phase 3: Booking System

- [ ] Course detail pages
- [ ] Calendar availability widget
- [ ] Booking flow
- [ ] Stripe booking payments
- [ ] ConstantContact integration

## Phase 4: Deployment

- [ ] Turso database setup
- [ ] Cloudflare Pages deployment
- [ ] Domain configuration
- [ ] Production testing

## Database Schema

See [2026-01-30-acdefense-website-design.md](plans/2026-01-30-acdefense-website-design.md) for complete schema documentation.

## API Routes

### Auth
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signout` - Sign out
- `GET /api/auth/session` - Get session

### Stripe (Coming in Phase 2)
- `POST /api/checkout` - Create checkout session
- `POST /api/stripe/webhook` - Handle webhooks

### ConstantContact (Coming in Phase 3)
- `POST /api/constantcontact/sync` - Sync contact

## Environment Variables

Required for development:

```bash
# Database
DATABASE_URL=postgresql://acdefense:dev_password@postgres:5432/acdefense

# NextAuth
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000

# Stripe (get from Stripe Dashboard)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ConstantContact (get from ConstantContact App)
CC_API_KEY=...
CC_ACCESS_TOKEN=...
```

## Testing

### Manual Testing Checklist (Phase 1)

- [x] Docker services start successfully
- [x] Database migrations apply
- [x] Seed data populates correctly
- [x] Homepage renders with tactical theme
- [x] Header and footer display correctly
- [x] Navigation links work
- [ ] Login flow (TODO: create login page)
- [ ] Registration flow (TODO: create register page)

### Automated Testing (Coming Soon)

- Unit tests with Jest
- Integration tests with Playwright
- E2E purchase flow tests
- E2E booking flow tests

## Troubleshooting

### Docker Issues

**PostgreSQL won't start:**
```bash
docker-compose down -v
docker-compose up -d
```

**Port 5432 already in use:**
```bash
# Find and stop conflicting process
lsof -i :5432
kill -9 <PID>
```

### Database Issues

**Schema out of sync:**
```bash
npm run db:push
```

**Need fresh data:**
```bash
docker-compose down -v
docker-compose up -d
npm run db:push
npm run db:seed
```

### Next.js Issues

**Module not found:**
```bash
rm -rf .next node_modules
npm install
npm run dev
```

## Code Style

- Use TypeScript strict mode
- Follow Airbnb style guide
- Use Prettier for formatting
- Server Components by default
- Client Components only when needed

## Git Workflow

1. Create feature branch from `main`
2. Make changes with descriptive commits
3. Test locally with Docker
4. Create PR with description
5. Merge after review
```

**Step 3: Add Docker healthcheck and restart policies**

Modify: `docker-compose.yml` - already includes these, verify they're present:
- PostgreSQL healthcheck
- restart: unless-stopped
- depends_on with condition

**Step 4: Test complete Docker setup**

Run: `docker-compose down -v && docker-compose up -d`

Expected: All services start successfully

Run: `docker-compose ps`

Expected: Both containers running and healthy

**Step 5: Commit**

```bash
git add README.md docs/development.md
git commit -m "docs: add comprehensive README and development guide

- README with setup instructions
- Development guide with phase tracking
- Troubleshooting section
- Database schema reference
- Test account credentials

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Summary

**Phase 1: Foundation Complete! 🎉**

You now have:
- ✅ Next.js 14 with TypeScript and App Router
- ✅ Docker Compose with PostgreSQL
- ✅ Drizzle ORM with complete schema
- ✅ NextAuth v5 authentication
- ✅ Tailwind CSS + shadcn/ui with tactical theme
- ✅ Marketing and auth layouts
- ✅ Seeded database with sample data
- ✅ Comprehensive documentation

**Test Accounts:**
- Admin: admin@acdefense.com / admin123
- User: user@example.com / user123

**Next Steps:**
Proceed to Phase 2 (E-commerce) when ready. See implementation plan at:
`docs/plans/2026-01-30-phase2-ecommerce.md`

**Local Development:**
```bash
docker-compose up -d
npm run dev
# Open http://localhost:3000
```
