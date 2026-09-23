-- Rename Cameroon currency leftovers to Nigeria (NGN)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'unlocks' AND column_name = 'agent_commission_fcfa'
  ) THEN
    ALTER TABLE unlocks RENAME COLUMN agent_commission_fcfa TO agent_commission_ngn;
  END IF;
END $$;

UPDATE platform_settings
SET key = 'unlock_fee_ngn',
    updated_at = NOW()
WHERE key = 'unlock_fee_fcfa';

INSERT INTO platform_settings (key, value, updated_at)
SELECT 'unlock_fee_ngn', '5000'::jsonb, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM platform_settings WHERE key = 'unlock_fee_ngn'
);

-- Nigeria payment rails (legacy mtn_momo / orange_money enum values remain unused)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'payment_method' AND e.enumlabel = 'paystack'
  ) THEN
    ALTER TYPE payment_method ADD VALUE 'paystack';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'payment_method' AND e.enumlabel = 'flutterwave'
  ) THEN
    ALTER TYPE payment_method ADD VALUE 'flutterwave';
  END IF;
END $$;
