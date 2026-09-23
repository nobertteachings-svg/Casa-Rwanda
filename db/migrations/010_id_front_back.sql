-- Two-sided CNI capture + persist ID number on users

ALTER TABLE landlord_id_verifications
  ALTER COLUMN media_reference TYPE TEXT;

ALTER TABLE landlord_id_verifications
  ADD COLUMN IF NOT EXISTS media_reference_back TEXT;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS id_number VARCHAR(60);
