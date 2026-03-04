-- Add board_role column to board_members for titles like President, Treasurer, Clerk
ALTER TABLE board_members ADD COLUMN IF NOT EXISTS board_role TEXT;

-- Create team_members table for team (non-board) members
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  role TEXT,
  company TEXT,
  linkedin TEXT,
  image_url TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Apply updated_at trigger
CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index for ordering
CREATE INDEX IF NOT EXISTS idx_team_members_order ON team_members(display_order);

-- Enable RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Anyone can view active team members
CREATE POLICY "Anyone can view active team members" ON team_members
  FOR SELECT USING (is_active = true);

-- Service role can manage team members
CREATE POLICY "Service role can manage team members" ON team_members
  FOR ALL USING (true) WITH CHECK (true);
