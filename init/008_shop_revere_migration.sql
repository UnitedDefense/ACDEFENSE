-- Migrate shop checkout from Stripe to Revere Payments Three-Step Redirect.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS revere_transaction_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'failed'
    AND enumtypid = 'order_status'::regtype
  ) THEN
    ALTER TYPE order_status ADD VALUE 'failed' AFTER 'completed';
  END IF;
END $$;
