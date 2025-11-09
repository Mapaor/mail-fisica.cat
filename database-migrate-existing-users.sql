-- ============================================
-- FIX: Migrate existing users and update trigger
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Update the trigger to include forward_to
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

-- Step 2: Migrate existing users from auth.users to profiles
-- This fills in the data for marti and admin
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT id, email, raw_user_meta_data 
    FROM auth.users 
    WHERE id NOT IN (SELECT id FROM profiles)
  LOOP
    -- Extract alias from email (before @)
    INSERT INTO profiles (id, alias, forward_to, role)
    VALUES (
      user_record.id,
      COALESCE(
        user_record.raw_user_meta_data->>'alias',
        split_part(user_record.email, '@', 1)  -- fallback: extract from email
      ),
      user_record.raw_user_meta_data->>'forward_to',
      COALESCE(user_record.raw_user_meta_data->>'role', 'user')
    )
    ON CONFLICT (id) DO UPDATE SET
      forward_to = EXCLUDED.forward_to,
      role = EXCLUDED.role;
  END LOOP;
END $$;

-- Step 3: Make admin user an admin
UPDATE profiles SET role = 'admin' WHERE alias = 'admin';

-- Step 4: Verify migration
SELECT 
  'Migration complete!' as status,
  alias,
  email,
  forward_to,
  role,
  created_at
FROM profiles
ORDER BY created_at;
