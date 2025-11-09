-- ============================================
-- FIX: Simplify RLS policies (no recursion, no auth.users access)
-- ============================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read own emails" ON emails;
DROP POLICY IF EXISTS "Users can insert own emails" ON emails;
DROP POLICY IF EXISTS "Users can update own emails" ON emails;
DROP POLICY IF EXISTS "Admins can read all emails" ON emails;
DROP POLICY IF EXISTS "Admins can insert any emails" ON emails;

-- Profiles policies (simple, no admin special case)
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Emails policies (simple, no admin special case)
CREATE POLICY "Users can read own emails"
  ON emails FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own emails"
  ON emails FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own emails"
  ON emails FOR UPDATE
  USING (user_id = auth.uid());

-- Note: Admins can still access everything through the Supabase dashboard
-- For webhook access, we use service role key which bypasses RLS entirely

-- Verify policies
SELECT 'Fixed! Simplified policies (no recursion)' as status;

SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('profiles', 'emails')
ORDER BY tablename, policyname;
