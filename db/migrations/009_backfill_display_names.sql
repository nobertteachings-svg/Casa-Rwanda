-- Backfill display_name from verified ID records for existing users

UPDATE users
SET display_name = id_full_name,
    updated_at = NOW()
WHERE (display_name IS NULL OR TRIM(display_name) = '')
  AND id_full_name IS NOT NULL
  AND TRIM(id_full_name) != '';

UPDATE users u
SET display_name = v.full_name,
    updated_at = NOW()
FROM (
  SELECT DISTINCT ON (landlord_phone) landlord_phone, full_name
  FROM landlord_id_verifications
  WHERE status = 'approved'
    AND full_name IS NOT NULL
    AND TRIM(full_name) != ''
  ORDER BY landlord_phone, created_at DESC
) v
WHERE u.phone = v.landlord_phone
  AND (u.display_name IS NULL OR TRIM(u.display_name) = '');
