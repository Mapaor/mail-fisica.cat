-- ============================================
-- DIAGNOSTIC: Check current database state
-- Run this to see what's wrong
-- ============================================

-- Check if profiles table exists and has data
SELECT 'Profiles table:' as check_name;
SELECT * FROM profiles;

-- Check auth.users
SELECT 'Auth users:' as check_name;
SELECT id, email, raw_user_meta_data FROM auth.users;

-- Check if user_id column exists in emails
SELECT 'Emails table structure:' as check_name;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'emails'
ORDER BY ordinal_position;

-- Check RLS policies on profiles
SELECT 'Profiles RLS policies:' as check_name;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';

-- Check RLS policies on emails  
SELECT 'Emails RLS policies:' as check_name;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'emails';

-- Check if RLS is enabled
SELECT 'RLS status:' as check_name;
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'emails');

-- Check for any existing emails with NULL user_id
SELECT 'Emails without user_id:' as check_name;
SELECT COUNT(*) as count_null_user_id
FROM emails
WHERE user_id IS NULL;
