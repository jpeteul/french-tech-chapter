-- Enhance newsletter_subscribers table with additional fields
ALTER TABLE newsletter_subscribers
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'homepage';

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribed ON newsletter_subscribers(subscribed_at);

-- Update RLS policy to allow inserts from anyone (for public signup)
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON newsletter_subscribers;
CREATE POLICY "Anyone can subscribe to newsletter" ON newsletter_subscribers
  FOR INSERT WITH CHECK (true);

-- Admins can view and manage all subscribers
DROP POLICY IF EXISTS "Admins can manage newsletter subscribers" ON newsletter_subscribers;
CREATE POLICY "Admins can manage newsletter subscribers" ON newsletter_subscribers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE user_id = auth.uid() AND member_role = 'admin'
    )
  );
