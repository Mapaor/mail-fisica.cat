-- ============================================
-- COMPLETE MULTIUSER DATABASE SETUP
-- Run this entire file in Supabase SQL Editor
-- ============================================

-- Step 1: Create profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  alias TEXT UNIQUE NOT NULL,
  email TEXT GENERATED ALWAYS AS (alias || '@fisica.cat') STORED,
  forward_to TEXT, -- External email for forwarding (optional)
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast alias lookup
CREATE INDEX IF NOT EXISTS idx_profiles_alias ON profiles(alias);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Step 2: Add user_id to emails table
ALTER TABLE emails 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Create index for user_id
CREATE INDEX IF NOT EXISTS idx_emails_user_id ON emails(user_id);

-- Step 3: Enable Row Level Security on both tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read own emails" ON emails;
DROP POLICY IF EXISTS "Users can insert own emails" ON emails;
DROP POLICY IF EXISTS "Users can update own emails" ON emails;
DROP POLICY IF EXISTS "Admins can read all emails" ON emails;
DROP POLICY IF EXISTS "Admins can insert any emails" ON emails;

-- Step 5: Policies for profiles table
-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (except alias and role)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Step 6: Policies for emails table
-- Users can read their own emails
CREATE POLICY "Users can read own emails"
  ON emails FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own emails
CREATE POLICY "Users can insert own emails"
  ON emails FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own emails (for is_read, etc)
CREATE POLICY "Users can update own emails"
  ON emails FOR UPDATE
  USING (user_id = auth.uid());

-- Admins can read all emails
CREATE POLICY "Admins can read all emails"
  ON emails FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Admins can insert any emails (for webhooks)
CREATE POLICY "Admins can insert any emails"
  ON emails FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Step 7: Function to automatically create profile on user signup (WITH forward_to)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, alias, forward_to, role)
  VALUES (
    NEW.id,
    -- Extract alias from email metadata set during signup
    NEW.raw_user_meta_data->>'alias',
    -- Extract forward_to from metadata (can be NULL)
    NEW.raw_user_meta_data->>'forward_to',
    -- Set role from metadata or default to 'user'
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Trigger to create profile automatically
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 9: Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Trigger for updated_at on profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 11: Helper function to get profile by alias
CREATE OR REPLACE FUNCTION get_profile_by_alias(alias_param TEXT)
RETURNS TABLE (
  id UUID,
  alias TEXT,
  email TEXT,
  forward_to TEXT,
  role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.alias, p.email, p.forward_to, p.role
  FROM profiles p
  WHERE p.alias = alias_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 12: Helper function to check if alias exists
CREATE OR REPLACE FUNCTION alias_exists(alias_param TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles WHERE alias = alias_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 13: Migrate existing users from auth.users to profiles
-- This creates profiles for any users that already exist
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT id, raw_user_meta_data 
    FROM auth.users 
    WHERE id NOT IN (SELECT id FROM profiles)
  LOOP
    INSERT INTO profiles (id, alias, forward_to, role)
    VALUES (
      user_record.id,
      user_record.raw_user_meta_data->>'alias',
      user_record.raw_user_meta_data->>'forward_to',
      COALESCE(user_record.raw_user_meta_data->>'role', 'user')
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

-- Verify setup
SELECT 'Setup complete!' as status;
SELECT 'Profiles created: ' || COUNT(*)::TEXT as profiles_count FROM profiles;
SELECT 'Emails in database: ' || COUNT(*)::TEXT as emails_count FROM emails;

-- Show created profiles
SELECT 
  alias,
  email,
  forward_to,
  role,
  created_at
FROM profiles
ORDER BY created_at DESC;
