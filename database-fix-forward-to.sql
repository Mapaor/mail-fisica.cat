-- Fix: Update the handle_new_user trigger to include forward_to
-- Run this in Supabase SQL Editor to fix the issue

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

-- That's it! Now new signups will save forward_to
