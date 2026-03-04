-- Migration: Federation Support
-- Description: Adds tables for cross-chapter investor directory sharing and intro requests

-- ============================================================================
-- FEDERATED INTRO REQUESTS (outgoing)
-- ============================================================================
-- Tracks intro requests that THIS chapter's members send to OTHER chapters

CREATE TABLE IF NOT EXISTS federated_intro_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who is requesting
  requester_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,

  -- Target chapter info
  target_chapter_slug TEXT NOT NULL,
  target_investor_id TEXT NOT NULL,
  target_contact_member_id TEXT NOT NULL,

  -- Request details
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'accepted', 'declined')),

  -- Remote tracking
  remote_request_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for looking up requests by requester
CREATE INDEX IF NOT EXISTS idx_federated_intro_requests_requester
  ON federated_intro_requests(requester_id);

-- Index for looking up by status
CREATE INDEX IF NOT EXISTS idx_federated_intro_requests_status
  ON federated_intro_requests(status);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_federated_intro_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER federated_intro_requests_updated_at
  BEFORE UPDATE ON federated_intro_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_federated_intro_requests_updated_at();

-- ============================================================================
-- INCOMING FEDERATION REQUESTS
-- ============================================================================
-- Tracks intro requests that come FROM other chapters TO this chapter's members

CREATE TABLE IF NOT EXISTS incoming_federation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Origin chapter info
  origin_chapter_slug TEXT NOT NULL,
  origin_chapter_name TEXT NOT NULL,
  origin_requester_name TEXT NOT NULL,
  origin_requester_company TEXT,
  origin_requester_member_id TEXT NOT NULL,

  -- Local references
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,

  -- Request details
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'accepted', 'declined')),

  -- Callback info
  webhook_url TEXT NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for looking up requests by contact (the member who will be notified)
CREATE INDEX IF NOT EXISTS idx_incoming_federation_requests_contact
  ON incoming_federation_requests(contact_id);

-- Index for looking up by investor
CREATE INDEX IF NOT EXISTS idx_incoming_federation_requests_investor
  ON incoming_federation_requests(investor_id);

-- Index for looking up by status
CREATE INDEX IF NOT EXISTS idx_incoming_federation_requests_status
  ON incoming_federation_requests(status);

-- Index for looking up by origin chapter
CREATE INDEX IF NOT EXISTS idx_incoming_federation_requests_origin
  ON incoming_federation_requests(origin_chapter_slug);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_incoming_federation_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER incoming_federation_requests_updated_at
  BEFORE UPDATE ON incoming_federation_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_incoming_federation_requests_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE federated_intro_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE incoming_federation_requests ENABLE ROW LEVEL SECURITY;

-- Federated Intro Requests Policies
-- Members can view their own outgoing requests
CREATE POLICY "Members can view own federated intro requests"
  ON federated_intro_requests
  FOR SELECT
  USING (
    requester_id IN (
      SELECT id FROM members WHERE user_id = auth.uid()
    )
  );

-- Members can create outgoing requests
CREATE POLICY "Members can create federated intro requests"
  ON federated_intro_requests
  FOR INSERT
  WITH CHECK (
    requester_id IN (
      SELECT id FROM members WHERE user_id = auth.uid()
    )
  );

-- Admins can view all federated requests
CREATE POLICY "Admins can view all federated intro requests"
  ON federated_intro_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE user_id = auth.uid() AND member_role = 'admin'
    )
  );

-- Service role can do everything (for API operations)
CREATE POLICY "Service role has full access to federated intro requests"
  ON federated_intro_requests
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Incoming Federation Requests Policies
-- Contacts can view requests sent to them
CREATE POLICY "Contacts can view incoming federation requests"
  ON incoming_federation_requests
  FOR SELECT
  USING (
    contact_id IN (
      SELECT id FROM members WHERE user_id = auth.uid()
    )
  );

-- Contacts can update requests sent to them (accept/decline)
CREATE POLICY "Contacts can update incoming federation requests"
  ON incoming_federation_requests
  FOR UPDATE
  USING (
    contact_id IN (
      SELECT id FROM members WHERE user_id = auth.uid()
    )
  );

-- Admins can view all incoming requests
CREATE POLICY "Admins can view all incoming federation requests"
  ON incoming_federation_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE user_id = auth.uid() AND member_role = 'admin'
    )
  );

-- Service role can do everything (for API operations)
CREATE POLICY "Service role has full access to incoming federation requests"
  ON incoming_federation_requests
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE federated_intro_requests IS
  'Tracks outgoing intro requests from this chapter to other French Tech chapters';

COMMENT ON TABLE incoming_federation_requests IS
  'Tracks incoming intro requests from other French Tech chapters to this chapter''s members';

COMMENT ON COLUMN federated_intro_requests.target_chapter_slug IS
  'URL-friendly identifier of the target chapter (e.g., sf, nyc)';

COMMENT ON COLUMN federated_intro_requests.remote_request_id IS
  'ID of the request as stored in the target chapter''s database';

COMMENT ON COLUMN incoming_federation_requests.webhook_url IS
  'Callback URL to notify the origin chapter when status changes';
