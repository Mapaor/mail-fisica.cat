# Setup Checklist for mail.fisica.cat

This document outlines all the steps needed to get the multi-user email system up and running.

## ✅ Already Completed

- [x] Multi-user database schema with RLS policies
- [x] Supabase authentication integration
- [x] Sign-in and sign-up pages with alias validation
- [x] Route protection middleware
- [x] Updated all API routes for multi-user support
- [x] Email forwarding API with Cloudflare DNS integration
- [x] Settings page for users to configure forwarding
- [x] Admin-only features (Monitor, Test pages)
- [x] Updated sidebar with user profile and role-based navigation

## 📋 Setup Steps Required

### 1. Database Configuration

**Action**: Run the SQL migration in Supabase

1. Go to your Supabase project: https://app.supabase.com
2. Navigate to SQL Editor
3. Copy the contents of `database-multiuser-setup.sql`
4. Execute the SQL
5. Verify tables were created:
   - profiles
   - emails (with new user_id column)

**Verification**:
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

### 2. Environment Variables

**Action**: Add the following to your `.env.local` file

```bash
# Supabase - Get from https://app.supabase.com/project/_/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Found in Project Settings > API > service_role key

# SMTP2GO - Get from https://app.smtp2go.com/settings/apikeys
SMTP2GO_API_KEY=api-xxxxx
SMTP2GO_SENDER_EMAIL=noreply@fisica.cat  # Default sender (overridden by user's alias)

# ForwardEmail - Optional webhook secret for security
FORWARD_EMAIL_WEBHOOK_SECRET=your-secret-here

# Cloudflare - Get from https://dash.cloudflare.com/profile/api-tokens
CLOUDFLARE_API_KEY=your-api-token
CLOUDFLARE_ZONE_ID=your-zone-id  # Found in domain overview
```

**How to get Supabase Service Role Key**:
1. Go to Project Settings > API
2. Scroll down to "Project API keys"
3. Copy the `service_role` key (⚠️ Keep this secret!)

**How to get Cloudflare credentials**:
1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Create token with permissions: Zone.DNS (Edit)
3. Copy the token
4. Get Zone ID from your domain's overview page

### 3. DNS Configuration

**Action**: Add DNS records to your domain registrar or Cloudflare

**ForwardEmail MX Records** (Required):
```
Type: MX
Priority: 10
Name: @
Value: mx1.forwardemail.net

Type: MX
Priority: 20
Name: @
Value: mx2.forwardemail.net
```

**ForwardEmail Webhook TXT Record** (Required):
```
Type: TXT
Name: @
Value: forward-email=alias:https://mail.fisica.cat/api/webhooks/incomingMail
```

⚠️ **Important**: The `alias:` prefix is REQUIRED. Without it, ForwardEmail won't send the full email content.

**Verification**: Use https://mxtoolbox.com to check MX records

### 4. Create First Admin User

**Option A: Via UI** (After app is running)
1. Go to http://localhost:3000
2. Sign up with your desired alias (e.g., "admin")
3. Then run this SQL in Supabase:

```sql
UPDATE profiles 
SET role = 'admin' 
WHERE alias = 'admin';
```

**Option B: Via SQL** (Before first login)
1. Sign up normally via the app
2. Run the SQL above to promote to admin

### 5. Test the System

**Test 1: Sign Up**
1. Go to http://localhost:3000
2. Click "Sign Up"
3. Choose an alias (e.g., "test")
4. Enter email and password
5. Should redirect to inbox

**Test 2: Receive Email**
1. Send an email to `test@fisica.cat`
2. Check Monitor page (if admin) to see webhook delivery
3. Check inbox - email should appear
4. Click email to read

**Test 3: Send Email**
1. Go to Compose page
2. Enter recipient, subject, body
3. Click Send
4. Check Sent page - email should appear
5. Recipient should receive email from `test@fisica.cat`

**Test 4: Email Forwarding**
1. Go to Settings page
2. Enter external email in "Forward To"
3. Save changes
4. Send email to your alias
5. Should appear in inbox AND forward to external email

**Test 5: Multi-user Isolation**
1. Sign up second user with different alias
2. Sign in as first user
3. Send email to first user
4. Sign in as second user
5. Should NOT see first user's email (RLS working)

## 🚀 Deployment Checklist

### Vercel Deployment

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Complete multi-user email system"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Framework Preset: Next.js
   - Root Directory: ./

3. **Add Environment Variables**
   - Copy all vars from `.env.local`
   - Paste into Vercel's Environment Variables section
   - Make sure to add for Production, Preview, and Development

4. **Deploy**
   - Click Deploy
   - Wait for build to complete
   - Note your production URL

5. **Update ForwardEmail Webhook**
   - Change DNS TXT record to use production URL:
   ```
   forward-email=alias:https://your-app.vercel.app/api/webhooks/incomingMail
   ```

### Post-Deployment

1. **Test production environment**
   - Visit your production URL
   - Sign up
   - Test email sending/receiving

2. **Monitor logs**
   - Check Vercel logs for errors
   - Check Supabase logs for database issues

## 🐛 Troubleshooting

### Issue: Emails not arriving

**Symptoms**: Send email to alias, nothing shows in inbox

**Checks**:
1. DNS records are correct and propagated
2. Webhook URL is accessible (try GET request)
3. Check Monitor page for webhook deliveries
4. Check Supabase logs for errors

**Solution**:
- Verify `alias:` prefix in TXT record
- Check webhook endpoint returns 200 OK
- Verify user exists with that alias

### Issue: Can't send emails

**Symptoms**: Click Send, nothing happens or error message

**Checks**:
1. Browser console for errors
2. Network tab for failed API calls
3. User profile exists in database

**Solution**:
- Verify SMTP2GO API key is valid
- Check user has profile with alias
- Ensure profile.email is generated correctly

### Issue: Forwarding not working

**Symptoms**: Email arrives in inbox but doesn't forward

**Checks**:
1. Cloudflare credentials are set
2. DNS TXT record exists
3. Settings page shows forwarding enabled

**Solution**:
- Wait 5-10 minutes for DNS propagation
- Check Cloudflare dashboard for TXT records
- Verify forward_to email is valid

### Issue: Can't sign up

**Symptoms**: Error on sign-up page

**Checks**:
1. Database migration ran successfully
2. `alias_exists()` function exists
3. Auth is enabled in Supabase

**Solution**:
- Re-run database migration
- Check Supabase Auth is enabled
- Verify email confirmations are disabled (if desired)

## 📊 Monitoring

### Admin Dashboard

As an admin, you can monitor:
- **Monitor page**: Recent webhook deliveries
- **Test page**: Send test webhooks
- **Supabase Dashboard**: Database queries, RLS policies

### Supabase Logs

Check for:
- Failed authentications
- RLS policy violations
- Database errors

### Vercel Logs

Check for:
- API route errors
- Webhook failures
- Performance issues

## 🔒 Security Notes

1. **Never commit `.env.local`** - Already in `.gitignore`
2. **Service Role Key** - Keep secret, only use server-side
3. **RLS Policies** - Automatically enforce data isolation
4. **Webhook Secret** - Optional but recommended for production
5. **Admin Role** - Only grant to trusted users

## 📝 Next Steps (Optional Enhancements)

Future features you might want to add:

- [ ] Email attachments support
- [ ] Search functionality
- [ ] Email labels/folders
- [ ] Email signatures
- [ ] Dark mode
- [ ] Mobile app
- [ ] Email templates
- [ ] Spam filtering
- [ ] Contact management
- [ ] Email analytics

## ✅ Final Checklist

Before going live:

- [ ] Database migration completed
- [ ] All environment variables set
- [ ] DNS records configured and propagated
- [ ] First admin user created
- [ ] All tests passing (sign up, receive, send, forward)
- [ ] Deployed to Vercel
- [ ] Production webhook URL updated in DNS
- [ ] Monitoring and logs working

## 🎉 You're Done!

Your multi-user email system is ready to use. Each user can:
- Sign up with their own alias
- Receive emails at `alias@fisica.cat`
- Send emails from `alias@fisica.cat`
- Optionally forward to external email
- Manage their settings

Admins can monitor the system and access all features.

---

**Need Help?**
- Check the main README.md for detailed documentation
- Review Supabase logs for database errors
- Check Vercel logs for API errors
- Test each component individually
