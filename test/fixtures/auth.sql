-- A stand-in for the parts of Supabase's `auth` schema the API touches (`admin grant | revoke | list`); Supabase owns
-- the real one, the local test database has none. Column names and types follow Supabase — sessions.refreshed_at is a
-- timestamp without time zone there too.
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY,
  email text,
  is_anonymous boolean NOT NULL DEFAULT false,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  banned_until timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS auth.identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_id text NOT NULL,
  identity_data jsonb NOT NULL DEFAULT '{}',
  email text,
  last_sign_in_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth.sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  refreshed_at timestamp,
  user_agent text,
  ip inet,
  aal text,
  not_after timestamptz
);
