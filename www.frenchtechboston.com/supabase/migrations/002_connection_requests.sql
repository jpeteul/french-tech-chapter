-- Connection Requests Table
-- Allows members to request introductions to other members

CREATE TABLE connection_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  message TEXT, -- Optional message from requester
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  response_message TEXT, -- Message from receiver when accepting (e.g., "Email me at...")
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,

  -- Prevent duplicate requests
  UNIQUE(requester_id, receiver_id)
);

-- Indexes for efficient queries
CREATE INDEX idx_connection_requests_requester ON connection_requests(requester_id);
CREATE INDEX idx_connection_requests_receiver ON connection_requests(receiver_id);
CREATE INDEX idx_connection_requests_status ON connection_requests(status);

-- Row Level Security
ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY;

-- Members can view their own requests (sent or received)
CREATE POLICY "Members can view own connection requests"
  ON connection_requests FOR SELECT
  USING (
    requester_id IN (SELECT id FROM members WHERE user_id = auth.uid())
    OR receiver_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

-- Members can create requests
CREATE POLICY "Members can create connection requests"
  ON connection_requests FOR INSERT
  WITH CHECK (
    requester_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

-- Only receiver can update (accept/decline)
CREATE POLICY "Receivers can respond to connection requests"
  ON connection_requests FOR UPDATE
  USING (
    receiver_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );
