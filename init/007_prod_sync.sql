-- Production catch-up: columns added after 2026-05-16 droplet rebuild
-- Safe to re-run (IF NOT EXISTS / IF EXISTS guards throughout)

-- orders: guest checkout support (added 2026-05-19)
ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_email TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_name TEXT;

-- bookings: Revere Payments transaction tracking (added 2026-07-01)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS revere_transaction_id TEXT;
