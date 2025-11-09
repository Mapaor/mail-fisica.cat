# 📨 ForwardEmail Webhook Setup Guide

## Your Webhook Endpoint

```
https://mail.fisica.cat/api/webhooks/incomingMail
```

✅ **Status**: The endpoint is correctly configured and ready to receive POST requests.

❌ **Why GET returns 405**: This is NORMAL! The endpoint only accepts POST requests (when ForwardEmail sends emails). Accessing it in a browser (GET request) will show "405 Method Not Allowed".

---

## 📊 How to Monitor Webhooks

### Option 1: Webhook Monitor Page (Easiest)
1. Go to your dashboard: **https://mail.fisica.cat/dashboard/monitor**
2. This page shows all recent webhook deliveries
3. Click "Refresh" to see new emails

### Option 2: Direct API Check
Visit this URL in your browser:
```
https://mail.fisica.cat/api/webhooks/incomingMail?limit=10
```
This will return JSON with the last 10 webhook deliveries.

### Option 3: Check Vercel Logs
1. Go to your Vercel Dashboard
2. Select your `mail-fisica.cat` project
3. Click on "Functions" or "Logs"
4. Look for requests to `/api/webhooks/incomingMail`
5. You'll see detailed console logs with 📨, 📧, ✅, or ❌ emojis

---

## 🗄️ Database Schema

### Complete SQL for Supabase

Run this in your Supabase SQL Editor:

\`\`\`sql
-- Create the emails table
CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic email fields
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT,
  html_body TEXT,
  
  -- Timestamps
  received_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Status fields
  is_read BOOLEAN DEFAULT FALSE,
  type TEXT CHECK (type IN ('incoming', 'outgoing')) NOT NULL,
  
  -- Additional data
  message_id TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_emails_created_at ON emails(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_type ON emails(type);
CREATE INDEX IF NOT EXISTS idx_emails_is_read ON emails(is_read);
CREATE INDEX IF NOT EXISTS idx_emails_from ON emails(from_email);
CREATE INDEX IF NOT EXISTS idx_emails_to ON emails(to_email);
\`\`\`

### If You Need to Start Fresh

\`\`\`sql
-- Delete all existing rows
TRUNCATE TABLE emails;

-- Or drop the table completely (WARNING: Deletes everything!)
DROP TABLE IF EXISTS emails CASCADE;

-- Then run the CREATE TABLE statement above
\`\`\`

---

## ⚙️ ForwardEmail Configuration

### Step 1: DNS Records
Make sure you have these DNS records for `fisica.cat`:

| Type | Name | Value |
|------|------|-------|
| MX | @ | mx1.forwardemail.net (priority 10) |
| MX | @ | mx2.forwardemail.net (priority 20) |
| TXT | @ | forward-email=... (your verification code) |

### Step 2: Alias Configuration
In ForwardEmail dashboard:

1. **Alias**: `alias@fisica.cat`
2. **Forward to**: Enable "Webhook"
3. **Webhook URL**: `https://mail.fisica.cat/api/webhooks/incomingMail`
4. **Method**: POST
5. **Content-Type**: application/json

### Step 3: Test the Integration

#### Send a Test Email:
```bash
# Option 1: Use your personal email
# Send an email to: alias@fisica.cat

# Option 2: Use curl (if ForwardEmail provides a test feature)
curl -X POST https://mail.fisica.cat/api/webhooks/incomingMail \
  -H "Content-Type: application/json" \
  -d '{
    "from": "test@example.com",
    "to": "alias@fisica.cat",
    "subject": "Test Email",
    "text": "This is a test email body",
    "html": "<p>This is a test email body</p>"
  }'
```

#### Check Results:
1. Visit: https://mail.fisica.cat/dashboard/monitor
2. Or check: https://mail.fisica.cat/dashboard/inbox
3. Or query: https://mail.fisica.cat/api/webhooks/incomingMail?limit=5

---

## 🐛 Troubleshooting

### Problem: No emails appearing in inbox

**Solution 1**: Check webhook was received
- Go to https://mail.fisica.cat/dashboard/monitor
- Send a test email
- Refresh after 10 seconds
- If nothing appears, webhook is not reaching your server

**Solution 2**: Check Vercel logs
- Vercel Dashboard → Your Project → Logs
- Look for `/api/webhooks/incomingMail` requests
- Check for errors with ❌ emoji

**Solution 3**: Verify Supabase connection
- Check your `.env.local` in Vercel:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Make sure table exists (run SQL above)

### Problem: Webhook returns 400 error

**Check field names**: ForwardEmail might send different field names than expected.

The webhook accepts these variations:
- **From**: `from`, `envelope.from`, `sender`
- **To**: `to`, `envelope.to`, `recipient`
- **Subject**: `subject`
- **Body**: `text`, `body`, `plain`
- **HTML**: `html`, `html_body`

**Solution**: Check Vercel logs to see what ForwardEmail actually sends, then adjust if needed.

### Problem: 405 Method Not Allowed

✅ **This is normal!** The webhook only accepts POST requests. You can't visit it in a browser (which uses GET).

To test:
- Use the Monitor page: https://mail.fisica.cat/dashboard/monitor
- Or add `?limit=10` to see logs via GET

---

## 📱 Monitoring Best Practices

### Real-time Monitoring
1. Keep the Monitor page open while testing
2. Click refresh after sending test emails
3. Check Vercel logs for detailed debugging

### Production Monitoring
1. Set up Vercel log alerts for errors
2. Monitor the `/api/webhooks/incomingMail` endpoint
3. Check Supabase database directly if needed:
   ```sql
   SELECT * FROM emails 
   WHERE type = 'incoming' 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

### What Gets Logged
Every webhook POST logs:
- 📨 Raw request headers and body
- 📧 Parsed email data
- ✅ Success with email ID
- ❌ Any errors with details

---

## 🎯 Quick Checklist

- [ ] Database table created in Supabase
- [ ] Environment variables set in Vercel
- [ ] ForwardEmail DNS records configured
- [ ] Webhook URL set to: `https://mail.fisica.cat/api/webhooks/incomingMail`
- [ ] Test email sent to `alias@fisica.cat`
- [ ] Email appears in Monitor page
- [ ] Email appears in Inbox

---

## 📞 Need Help?

1. **Check Vercel Logs**: Most issues show up here with clear error messages
2. **Monitor Page**: https://mail.fisica.cat/dashboard/monitor
3. **Test API**: https://mail.fisica.cat/api/webhooks/incomingMail?limit=5
4. **Supabase Logs**: Check for database connection errors

The webhook includes extensive logging, so check Vercel logs first!
