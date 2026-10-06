-- 012: public-site redesign (2026-10). Additive and idempotent — safe to re-run.
--
-- Apply to an existing DB with psql in autocommit mode (the default for
-- `psql < file` and docker-entrypoint-initdb.d). The ALTER TYPE ... ADD VALUE
-- below must commit before the UPDATE that uses the new value, so do NOT wrap
-- this file in a single transaction (no `psql -1`).

-- 1. Professional Security audience ------------------------------------------
-- The site now has exactly three audiences: open_enrollment (civilian),
-- law_enforcement, security. 'military' stays in the enum (Postgres can't drop
-- enum values cleanly) but is no longer offered anywhere.
ALTER TYPE audience ADD VALUE IF NOT EXISTS 'security';

-- IDFPR FCC (armed-guard) courses belong to the Security path, not LE.
UPDATE courses SET audience = 'security'
WHERE course_category = 'fcc_advanced' AND audience = 'law_enforcement';

-- 2. Private-group / agency training requests --------------------------------
-- Reuses waitlist_entries (same admin list, same status workflow). Existing
-- rows are all 'waitlist' (request a date / notify me / sold-out date).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'waitlist_request_type') THEN
    CREATE TYPE waitlist_request_type AS ENUM ('waitlist', 'private_group', 'agency');
  END IF;
END $$;

ALTER TABLE waitlist_entries
  ADD COLUMN IF NOT EXISTS request_type    waitlist_request_type NOT NULL DEFAULT 'waitlist',
  ADD COLUMN IF NOT EXISTS organization    TEXT,
  ADD COLUMN IF NOT EXISTS contact_title   TEXT,
  ADD COLUMN IF NOT EXISTS preferred_dates TEXT,
  ADD COLUMN IF NOT EXISTS location        TEXT;

-- Replace 011's duplicate guard with one that includes request_type, so an
-- agency request from someone who also asked to be notified about a course
-- isn't rejected as "already on this waitlist". Same NULLS NOT DISTINCT +
-- pending-only semantics as before (see 011_waitlist.sql).
DROP INDEX IF EXISTS uq_waitlist_entry;
CREATE UNIQUE INDEX IF NOT EXISTS uq_waitlist_request
  ON waitlist_entries (email, request_type, course_id, schedule_id) NULLS NOT DISTINCT
  WHERE status = 'pending';

-- 3. Instructor credentials (public /credentials page) -------------------------
-- file_url points at a certificate scan uploaded through the admin panel. The
-- owner redacts license numbers / personal details BEFORE uploading — the site
-- displays exactly what is uploaded.
CREATE TABLE IF NOT EXISTS credentials (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  issuer        TEXT,
  holder_name   TEXT,
  description   TEXT,
  valid_through DATE,
  file_url      TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMP NOT NULL DEFAULT now()
);

-- Starter rows for the certifications the owner listed. Only seeded into an
-- empty table so re-running never duplicates or overwrites admin edits.
INSERT INTO credentials (title, issuer, sort_order)
SELECT v.title, v.issuer, v.sort_order
FROM (VALUES
  ('IDFPR Certified Firearms Instructor', 'Illinois Department of Financial and Professional Regulation', 10),
  ('NRA Certified Instructor', 'National Rifle Association', 20),
  ('USCCA Certified Instructor', 'U.S. Concealed Carry Association', 30),
  ('Law Enforcement Firearms Instructor', NULL, 40)
) AS v(title, issuer, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM credentials);

-- 4. Admin-editable copy for the redesigned pages ------------------------------
-- Code falls back to the same defaults when a row is missing; these rows just
-- make the text show up in Admin -> Site Content.
INSERT INTO page_content (page, key, value) VALUES
  ('home', 'hero_video', ''),
  ('home', 'civilian_image', ''),
  ('home', 'law_enforcement_image', ''),
  ('home', 'security_image', ''),
  ('civilian', 'intro', 'Concealed carry licensing, defensive pistol, medical and less-lethal courses for everyday citizens. Small classes, state-licensed instructors, and training built around real-world defense.'),
  ('law-enforcement', 'intro', 'Scenario-driven instruction delivered privately for your department — at our range or on-site. Tell us your headcount, objectives and timeline and we''ll build the course around your agency.'),
  ('security', 'intro', 'IDFPR-mandated Firearm Control Card training and annual requalification for armed security professionals, taught by IDFPR-certified firearms instructors.')
ON CONFLICT (page, key) DO NOTHING;

-- The home hero subheadline seeded in 003 mentions military, which the site no
-- longer offers. Only rewrite it if it still holds that exact seed text.
UPDATE page_content
SET value = 'Professional firearms and defensive training for civilians, law enforcement and armed security professionals. Build the skills to protect yourself and those who matter most.',
    updated_at = now()
WHERE page = 'home' AND key = 'hero_subheadline'
  AND value = 'Elite tactical training for civilians, law enforcement, and military. Build the skills to protect yourself and those who matter most.';

-- Scraper note left in 003; it shows up as an editable field in Admin -> Site
-- Content but is never rendered.
DELETE FROM page_content
WHERE page = 'security' AND key = 'security_page_note'
  AND value LIKE 'Security & Logistics page exists%';
