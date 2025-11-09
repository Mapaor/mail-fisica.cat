-- Quick check: Are profiles created correctly?
SELECT 
  'Check 1: Profiles exist' as test,
  COUNT(*) as count,
  string_agg(alias, ', ') as aliases
FROM profiles;

-- Check 2: Do users have profiles?
SELECT 
  'Check 2: Auth users have profiles' as test,
  u.email,
  p.alias,
  p.forward_to,
  p.role
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id;

-- Check 3: Can we query with auth context? (simulate what API does)
SELECT 
  'Check 3: Your user details' as test,
  id,
  alias,
  email,
  forward_to,
  role
FROM profiles
WHERE alias = 'admin';

-- Check 4: Emails table ready?
SELECT 
  'Check 4: Emails table' as test,
  COUNT(*) as total_emails,
  COUNT(CASE WHEN user_id IS NULL THEN 1 END) as null_user_id,
  COUNT(CASE WHEN type = 'incoming' THEN 1 END) as incoming,
  COUNT(CASE WHEN type = 'outgoing' THEN 1 END) as outgoing
FROM emails;
