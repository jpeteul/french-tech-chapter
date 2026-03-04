-- Member Analytics
-- Track basic activity metrics for members

-- Add activity tracking columns to members table
ALTER TABLE members ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
ALTER TABLE members ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- Create index for efficient queries on last_seen_at
CREATE INDEX IF NOT EXISTS idx_members_last_seen_at ON members(last_seen_at DESC NULLS LAST);

-- Update RLS policy to allow members to update their own activity
-- (The existing update policy should cover this, but let's be explicit)

-- Create a function to update member activity (called from auth callback)
CREATE OR REPLACE FUNCTION update_member_activity(member_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE members
  SET
    last_seen_at = NOW(),
    login_count = COALESCE(login_count, 0) + 1
  WHERE id = member_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_member_activity(UUID) TO authenticated;

-- View for admin analytics (aggregated stats)
CREATE OR REPLACE VIEW admin_member_stats AS
SELECT
  m.id,
  m.name,
  m.email,
  m.company,
  m.last_seen_at,
  m.login_count,
  m.created_at as member_since,
  COALESCE(ic.investors_added, 0) as investors_added,
  COALESCE(ir_sent.requests_sent, 0) as intro_requests_sent,
  COALESCE(ir_received.requests_received, 0) as intro_requests_received
FROM members m
LEFT JOIN (
  SELECT member_id, COUNT(*) as investors_added
  FROM investor_contacts
  GROUP BY member_id
) ic ON ic.member_id = m.id
LEFT JOIN (
  SELECT requester_id, COUNT(*) as requests_sent
  FROM intro_requests
  GROUP BY requester_id
) ir_sent ON ir_sent.requester_id = m.id
LEFT JOIN (
  SELECT contact_id, COUNT(*) as requests_received
  FROM intro_requests
  GROUP BY contact_id
) ir_received ON ir_received.contact_id = m.id
WHERE m.status = 'active';

-- Summary stats view
CREATE OR REPLACE VIEW admin_summary_stats AS
SELECT
  (SELECT COUNT(*) FROM members WHERE status = 'active') as total_members,
  (SELECT COUNT(*) FROM members WHERE status = 'active' AND last_seen_at > NOW() - INTERVAL '7 days') as active_7d,
  (SELECT COUNT(*) FROM members WHERE status = 'active' AND last_seen_at > NOW() - INTERVAL '30 days') as active_30d,
  (SELECT COUNT(*) FROM investors) as total_investors,
  (SELECT COUNT(*) FROM investor_contacts) as total_contacts,
  (SELECT COUNT(*) FROM intro_requests) as total_intro_requests,
  (SELECT COUNT(*) FROM intro_requests WHERE status = 'accepted') as accepted_intros,
  (SELECT COUNT(*) FROM intro_requests WHERE created_at > NOW() - INTERVAL '30 days') as intros_last_30d;

-- RLS for the views (admin only)
-- Note: Views inherit RLS from underlying tables, but we want admin-only access
-- We'll handle this in the API by checking for admin role
