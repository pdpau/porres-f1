-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Porres F1 — App Users table                                   ║
-- ║  Run this in Supabase SQL Editor after the initial schema       ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- 3. App users: simple login (name + password hash)
CREATE TABLE IF NOT EXISTS app_users (
  name     TEXT PRIMARY KEY,
  pw_hash  TEXT NOT NULL,           -- bcrypt / pgcrypto hash
  role     TEXT NOT NULL DEFAULT 'user',  -- 'admin' or 'user'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert the three users (password = their own name, lowercased)
INSERT INTO app_users (name, pw_hash, role) VALUES
  ('Pau',    crypt('Pau',    gen_salt('bf')), 'admin'),
  ('Albert', crypt('Albert', gen_salt('bf')), 'user'),
  ('David',  crypt('David',  gen_salt('bf')), 'user')
ON CONFLICT (name) DO NOTHING;

-- RLS
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read app_users" ON app_users FOR SELECT USING (true);

-- ── Login function (called via supabase.rpc) ────────────────────
-- Returns the user row if password matches, empty set otherwise.
CREATE OR REPLACE FUNCTION login(p_name TEXT, p_password TEXT)
RETURNS TABLE(name TEXT, role TEXT) AS $$
  SELECT au.name, au.role
  FROM app_users au
  WHERE au.name = p_name
    AND au.pw_hash = crypt(p_password, au.pw_hash);
$$ LANGUAGE sql SECURITY DEFINER;
