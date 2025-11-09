# Quick Fix Guide

## Issues Identified

1. ✅ **Email confirmation blocking sign-in** 
2. ✅ **Wrong redirect URL (localhost vs mail.fisica.cat)**
3. ✅ **Forward email not being saved**

## Solutions

### 1. Disable Email Confirmation in Supabase

**Steps:**
1. Go to: https://app.supabase.com/project/rmkncwxvplanscfaimmd/auth/providers
2. Scroll to "Email" provider
3. Toggle OFF "Confirm email"
4. Click Save

**Why:** You want users to be able to sign in immediately without email confirmation.

---

### 2. Fix Redirect URLs

**Steps:**
1. Go to: https://app.supabase.com/project/rmkncwxvplanscfaimmd/auth/url-configuration
2. Set **Site URL** to: `https://mail.fisica.cat`
3. Add to **Redirect URLs**:
   - `https://mail.fisica.cat/**`
   - `http://localhost:3000/**` (for local development)
4. Click Save

**Why:** This ensures email confirmations (if you enable them later) redirect to the correct domain.

---

### 3. Fix forward_to Not Being Saved

**Steps:**
1. Go to: https://app.supabase.com/project/rmkncwxvplanscfaimmd/sql/new
2. Copy the contents of `database-fix-forward-to.sql`
3. Paste and run the SQL
4. You should see: "Success. No rows returned"

**SQL to run:**
```sql
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
```

**Why:** The original trigger wasn't extracting `forward_to` from signup metadata.

---

### 4. Clean Up Existing Users (Optional)

If you created test users that are broken, delete them:

**Steps:**
1. Go to: https://app.supabase.com/project/rmkncwxvplanscfaimmd/auth/users
2. Find your test user(s)
3. Click the three dots → Delete user
4. Confirm deletion

**Why:** Start fresh with a working signup flow.

---

## Testing After Fixes

### Test 1: Sign Up
1. Go to https://mail.fisica.cat/sign-up
2. Choose alias: `test`
3. Password: `test1234`
4. Forward to: `your.email@gmail.com` (optional)
5. Click Sign Up
6. Should redirect to inbox immediately (no email confirmation)

### Test 2: Verify Forward Email Saved
1. Go to Supabase: https://app.supabase.com/project/rmkncwxvplanscfaimmd/editor
2. Click on `profiles` table
3. Find your user
4. Check that `forward_to` column has your email (not NULL)

### Test 3: Sign In
1. Sign out
2. Go to https://mail.fisica.cat/sign-in
3. Email: `test@fisica.cat`
4. Password: `test1234`
5. Click Sign In
6. Should sign in successfully

### Test 4: Settings Page
1. While signed in, go to Settings
2. You should see:
   - Alias: test
   - Email: test@fisica.cat
   - Forward To: (with your email if you entered one)
3. Try changing the forward email
4. Save and verify it updates

---

## Summary Checklist

- [ ] Disabled email confirmation in Supabase Auth settings
- [ ] Set Site URL to `https://mail.fisica.cat`
- [ ] Added redirect URLs
- [ ] Ran SQL fix for `forward_to` trigger
- [ ] Deleted old test users (optional)
- [ ] Created new user successfully
- [ ] Verified `forward_to` is saved in database
- [ ] Sign in works without errors
- [ ] Settings page shows correct info

---

## Current Status

**Environment Variables:** ✅ All set correctly in `.env.local`
- Supabase URL, keys
- SMTP2GO API key
- Cloudflare credentials

**Database:** ⚠️ Needs the trigger fix above

**App Code:** ✅ All correct and ready

**Supabase Settings:** ⚠️ Needs:
- Disable email confirmation
- Fix redirect URLs

---

## After Everything Works

Once you can sign up and sign in successfully:

1. **Make yourself admin:**
   ```sql
   UPDATE profiles 
   SET role = 'admin' 
   WHERE alias = 'your-alias';
   ```

2. **Test email receiving:**
   - Send an email to `your-alias@fisica.cat`
   - Check inbox
   - Should appear within seconds

3. **Test email sending:**
   - Go to Compose
   - Send to another email
   - Check it arrives (from your-alias@fisica.cat)

4. **Test forwarding:**
   - Send email to your fisica.cat address
   - Should arrive in inbox AND forward to external email

---

## Still Having Issues?

### Sign-in still fails
- Check browser console for errors
- Verify you're using the correct email format: `alias@fisica.cat`
- Make sure password is correct
- Check Supabase Auth logs

### Forward email still NULL
- Check you ran the trigger fix SQL
- Verify in SQL editor:
  ```sql
  SELECT * FROM profiles;
  ```
- Look at `forward_to` column

### Confirmation email redirect wrong
- Clear browser cache
- Check Site URL in Supabase settings
- Make sure you saved the changes

---

**Need more help?** Check the browser console (F12) and Supabase logs for specific error messages.
