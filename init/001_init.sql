-- =========================
-- EXTENSIONS
-- =========================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- ENUM TYPES (idempotent)
-- =========================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE audience AS ENUM ('open_enrollment', 'law_enforcement', 'military');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE course_category AS ENUM ('ccl_renewal', 'defensive_firearms', 'fcc_advanced', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('pending', 'completed', 'cancelled', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE schedule_status AS ENUM ('open', 'full', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =========================
-- CORE TABLES (no FK deps)
-- =========================
CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT,
  name            TEXT,
  role            user_role DEFAULT 'user' NOT NULL,
  google_calendar_sync BOOLEAN DEFAULT true,
  created_at      TIMESTAMP DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS product_categories (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMP DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  description     TEXT,
  price           NUMERIC(10,2) NOT NULL,
  images          JSONB DEFAULT '[]'::jsonb,
  inventory_count INTEGER DEFAULT 0 NOT NULL,
  category_id     INTEGER REFERENCES product_categories(id),
  created_at      TIMESTAMP DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS courses (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  description     TEXT,
  tagline         TEXT,
  price           NUMERIC(10,2) NOT NULL,
  duration_hours  INTEGER NOT NULL,
  max_capacity    INTEGER NOT NULL,
  prerequisites   TEXT,
  image_url       TEXT,
  audience        audience DEFAULT 'open_enrollment' NOT NULL,
  course_category course_category DEFAULT 'other' NOT NULL,
  created_at      TIMESTAMP DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS page_content (
  id         SERIAL PRIMARY KEY,
  page       TEXT NOT NULL,
  key        TEXT NOT NULL,
  value      TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL,
  UNIQUE(page, key)
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id           SERIAL PRIMARY KEY,
  title        TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  content      TEXT,
  author       TEXT,
  published_at TIMESTAMP,
  created_at   TIMESTAMP DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS instructor_profiles (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  title          TEXT,
  bio            TEXT,
  photo_url      TEXT,
  certifications TEXT,
  created_at     TIMESTAMP DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS services (
  id               SERIAL PRIMARY KEY,
  name             TEXT NOT NULL,
  slug             TEXT NOT NULL UNIQUE,
  description      TEXT,
  duration_minutes INTEGER,
  price            NUMERIC(10,2),
  image_url        TEXT,
  booking_url      TEXT,
  is_active        BOOLEAN DEFAULT true NOT NULL,
  sort_order       INTEGER DEFAULT 0 NOT NULL,
  created_at       TIMESTAMP DEFAULT now() NOT NULL,
  updated_at       TIMESTAMP DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS clients (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  logo_url    TEXT NOT NULL,
  website_url TEXT,
  sort_order  INTEGER DEFAULT 0 NOT NULL,
  is_active   BOOLEAN DEFAULT true NOT NULL
);

CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  first_name    TEXT,
  subscribed_at TIMESTAMP DEFAULT now() NOT NULL,
  webhook_sent  BOOLEAN DEFAULT false NOT NULL,
  source        TEXT DEFAULT 'homepage' NOT NULL
);

CREATE TABLE IF NOT EXISTS contact_submissions (
  id         SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name  TEXT NOT NULL,
  email      TEXT NOT NULL,
  message    TEXT NOT NULL,
  is_read    BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP DEFAULT now() NOT NULL
);

-- =========================
-- AUTH / SESSION TABLES
-- =========================
CREATE TABLE IF NOT EXISTS accounts (
  id                  SERIAL PRIMARY KEY,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider            TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token       TEXT,
  access_token        TEXT,
  expires_at          INTEGER,
  token_type          TEXT,
  scope               TEXT,
  id_token            TEXT,
  session_state       TEXT,
  created_at          TIMESTAMP DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires       TIMESTAMP NOT NULL,
  created_at    TIMESTAMP DEFAULT now() NOT NULL
);

-- =========================
-- COMMERCE TABLES
-- =========================
CREATE TABLE IF NOT EXISTS cart_items (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity   INTEGER DEFAULT 1 NOT NULL,
  created_at TIMESTAMP DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES users(id),
  total             NUMERIC(10,2) NOT NULL,
  status            order_status DEFAULT 'pending' NOT NULL,
  stripe_payment_id TEXT,
  created_at        TIMESTAMP DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id                SERIAL PRIMARY KEY,
  order_id          INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id        INTEGER NOT NULL REFERENCES products(id),
  quantity          INTEGER NOT NULL,
  price_at_purchase NUMERIC(10,2) NOT NULL
);

-- =========================
-- COURSES / BOOKING TABLES
-- =========================
CREATE TABLE IF NOT EXISTS course_schedules (
  id              SERIAL PRIMARY KEY,
  course_id       INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  start_date      TIMESTAMP NOT NULL,
  end_date        TIMESTAMP NOT NULL,
  available_seats INTEGER NOT NULL,
  status          schedule_status DEFAULT 'open' NOT NULL,
  created_at      TIMESTAMP DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id                          SERIAL PRIMARY KEY,
  user_id                     INTEGER NOT NULL REFERENCES users(id),
  schedule_id                 INTEGER NOT NULL REFERENCES course_schedules(id),
  payment_status              payment_status DEFAULT 'pending' NOT NULL,
  stripe_payment_id           TEXT,
  constantcontact_contact_id  TEXT,
  google_calendar_event_id    TEXT,
  created_at                  TIMESTAMP DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS booking_status_history (
  id         SERIAL PRIMARY KEY,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  status     payment_status NOT NULL,
  timestamp  TIMESTAMP DEFAULT now() NOT NULL
);
