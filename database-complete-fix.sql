-- ============================================
-- COMPLETE FIX: Setup profiles and fix all issues
-- Run this entire file in Supabase SQL Editor
-- ============================================

-- Step 1: Temporarily disable RLS to fix data
ALTER TABLE emails DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Create profiles for existing users
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT id, email, raw_user_meta_data 
    FROM auth.users 
  LOOP
    INSERT INTO profiles (id, alias, forward_to, role)
    VALUES (
      user_record.id,
      COALESCE(
        user_record.raw_user_meta_data->>'alias',
        split_part(user_record.email, '@', 1)
      ),
      user_record.raw_user_meta_data->>'forward_to',
      COALESCE(user_record.raw_user_meta_data->>'role', 'user')
    )
    ON CONFLICT (id) DO UPDATE SET
      forward_to = EXCLUDED.forward_to,
      role = EXCLUDED.role;
  END LOOP;
END $$;

-- Step 3: Assign all existing emails to the admin user (or delete them if you want a fresh start)
-- Option A: Assign to admin user
UPDATE emails 
SET user_id = (SELECT id FROM profiles WHERE alias = 'admin' LIMIT 1)
WHERE user_id IS NULL;

-- Option B: Delete old emails (uncomment if you prefer)
-- DELETE FROM emails WHERE user_id IS NULL;

-- Step 4: Make admin an admin
UPDATE profiles SET role = 'admin' WHERE alias = 'admin';

-- Step 5: Drop all existing policies (to avoid conflicts)
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read own emails" ON emails;
DROP POLICY IF EXISTS "Users can insert own emails" ON emails;
DROP POLICY IF EXISTS "Users can update own emails" ON emails;
DROP POLICY IF EXISTS "Admins can read all emails" ON emails;
DROP POLICY IF EXISTS "Admins can insert any emails" ON emails;

-- Step 6: Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

-- Step 7: Create clean policies for profiles
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Step 8: Create clean policies for emails
CREATE POLICY "Users can read own emails"
  ON emails FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own emails"
  ON emails FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own emails"
  ON emails FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all emails"
  ON emails FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert any emails"
  ON emails FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Step 9: Update trigger to include forward_to
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, alias, forward_to, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'alias',
    NEW.raw_user_meta_data->>'forward_to',
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Verify everything
SELECT 'Setup complete!' as status;

SELECT 'Profiles:' as section;
SELECT alias, email, forward_to, role FROM profiles;

SELECT 'Emails without user_id:' as section;
SELECT COUNT(*) FROM emails WHERE user_id IS NULL;

SELECT 'Your user_id:' as section;
SELECT id, alias, email, role 
FROM profiles 
WHERE alias IN ('admin', 'marti');
