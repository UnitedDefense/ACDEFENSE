-- Public "request a class / join waitlist" enquiries.
-- One waitlist_entries table serves both user asks via two nullable FKs:
--   course_id NULL                 => general "request any class / private training" enquiry
--   course_id set, schedule_id NULL=> "notify me when dates are announced for this course"
--   course_id + schedule_id set    => "this specific sold-out date, add me to its waitlist"

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'waitlist_status') THEN
    CREATE TYPE waitlist_status AS ENUM ('pending', 'contacted', 'converted', 'cancelled');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS waitlist_entries (
  id            SERIAL PRIMARY KEY,
  course_id     INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  schedule_id   INTEGER REFERENCES course_schedules(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,
  party_size    INTEGER NOT NULL DEFAULT 1,
  message       TEXT,
  status        waitlist_status NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMP NOT NULL DEFAULT now(),
  notified_at   TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_waitlist_course ON waitlist_entries(course_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist_entries(status);

-- Duplicate guard across all three shapes above (NULLS NOT DISTINCT treats
-- NULL course_id/schedule_id as equal to NULL for uniqueness purposes, so a
-- repeat general enquiry or repeat per-course notify-me from the same email
-- still collides and can be caught as a 409 by the API layer).
--
-- Partial index (WHERE status = 'pending') so the uniqueness constraint only
-- binds active waitlist requests: once an entry moves to any non-pending
-- status (contacted, converted, or cancelled), the same email can re-request
-- the same course/schedule without being told "you're already on this
-- waitlist" forever.
CREATE UNIQUE INDEX IF NOT EXISTS uq_waitlist_entry
  ON waitlist_entries (email, course_id, schedule_id) NULLS NOT DISTINCT
  WHERE status = 'pending';
