-- Remove agent marketplace leftovers (Casa Nigeria connects landlords & tenants directly)

DROP TABLE IF EXISTS agent_landlords;

ALTER TABLE users DROP COLUMN IF EXISTS is_agent;

ALTER TABLE unlocks DROP COLUMN IF EXISTS agent_phone;
ALTER TABLE unlocks DROP COLUMN IF EXISTS agent_commission_ngn;
ALTER TABLE unlocks DROP COLUMN IF EXISTS agent_commission_fcfa;
