-- Run through npm run migrate:access. Existing administrators retain full access.
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions text[] NOT NULL DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 0;
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'staff';

-- Email lookup is case-insensitive, so prevent ambiguous accounts.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique ON users (lower(email));

CREATE TABLE IF NOT EXISTS user_access_audit (
  id bigserial PRIMARY KEY,
  actor_id integer NOT NULL,
  target_id integer NOT NULL,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin' AND is_active) THEN
    RAISE EXCEPTION 'At least one active admin must exist before enabling user access';
  END IF;
END $$;
