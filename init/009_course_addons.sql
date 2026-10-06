-- Billable course add-ons a customer can select during booking.
-- Per-course catalog (course_addons) + snapshotted selections (booking_addons).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'addon_pricing_type') THEN
    CREATE TYPE addon_pricing_type AS ENUM ('flat', 'quantity');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS course_addons (
  id            SERIAL PRIMARY KEY,
  course_id     INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  price         NUMERIC(10,2) NOT NULL,
  pricing_type  addon_pricing_type NOT NULL DEFAULT 'flat',
  max_quantity  INTEGER NOT NULL DEFAULT 10,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS course_addons_course_id_idx ON course_addons(course_id);

-- name/price snapshotted so catalog edits never rewrite historical charges.
-- addon_id is nullable + ON DELETE SET NULL: deleting a catalog entry must not
-- destroy the record of what a customer paid for.
CREATE TABLE IF NOT EXISTS booking_addons (
  id               SERIAL PRIMARY KEY,
  booking_id       INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  addon_id         INTEGER REFERENCES course_addons(id) ON DELETE SET NULL,
  name_at_booking  TEXT NOT NULL,
  price_at_booking NUMERIC(10,2) NOT NULL,
  quantity         INTEGER NOT NULL DEFAULT 1,
  created_at       TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS booking_addons_booking_id_idx ON booking_addons(booking_id);
