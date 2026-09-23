-- Casa Rwanda: rename unlock fee setting key to RWF
UPDATE platform_settings
SET key = 'unlock_fee_rwf',
    value = COALESCE(value, '2000'::jsonb)
WHERE key IN ('unlock_fee_ugx', 'unlock_fee_kes', 'unlock_fee_ngn', 'unlock_fee_fcfa');

INSERT INTO platform_settings (key, value, updated_at)
SELECT 'unlock_fee_rwf', '2000'::jsonb, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM platform_settings WHERE key = 'unlock_fee_rwf'
);
