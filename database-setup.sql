-- ============================================
-- fisica.cat Email Database Schema
-- ============================================

-- First, drop the table if you want to start fresh (CAUTION: This deletes all data!)
-- DROP TABLE IF EXISTS emails CASCADE;

-- Create the emails table with all necessary columns
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
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Optional: for future use
  message_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_emails_created_at ON emails(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_type ON emails(type);
CREATE INDEX IF NOT EXISTS idx_emails_is_read ON emails(is_read);
CREATE INDEX IF NOT EXISTS idx_emails_from ON emails(from_email);
CREATE INDEX IF NOT EXISTS idx_emails_to ON emails(to_email);

-- If you need to clear existing data without dropping the table:
-- TRUNCATE TABLE emails;

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'emails'
ORDER BY ordinal_position;
