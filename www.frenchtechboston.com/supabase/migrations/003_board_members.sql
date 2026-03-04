-- Board Members table
CREATE TABLE IF NOT EXISTS board_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  title TEXT,
  company TEXT,
  linkedin TEXT,
  image_url TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Apply updated_at trigger
CREATE TRIGGER update_board_members_updated_at BEFORE UPDATE ON board_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index for ordering
CREATE INDEX IF NOT EXISTS idx_board_members_order ON board_members(display_order);

-- Enable RLS
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;

-- Anyone can view active board members
CREATE POLICY "Anyone can view active board members" ON board_members
  FOR SELECT USING (is_active = true);

-- Admins can manage board members
CREATE POLICY "Admins can manage board members" ON board_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE user_id = auth.uid() AND member_role = 'admin'
    )
  );

-- Seed initial board members from constants
INSERT INTO board_members (name, title, company, linkedin, image_url, display_order) VALUES
  ('Audrey Philippot Dahan', 'Managing Director SaaS', 'Dimagi', 'audreyphilippot', '/images/board/audrey-philippot.jpg', 1),
  ('Joseph Peteul', 'Founder', 'Cap8', 'joseph-peteul', '/images/board/joseph-peteul.jpg', 2),
  ('Zena Sfeir Gehchan', 'VP Marketing', '', 'zenasfeir', '/images/board/zena-sfeir.jpg', 3),
  ('Francois Silvain', 'Founder & CEO', 'NewEcom.AI', 'fsilvain', '/images/board/francois-silvain.jpg', 4),
  ('Julien L. Pham', 'Founder GP', '3CC Third Culture Capital', 'julienpham', '/images/board/julien-pham.jpg', 5),
  ('Philippe Rival', '', '', 'philipperival', '/images/board/philippe-rival.jpg', 6),
  ('Justine Soudier', '', '', 'justine-soudier', '/images/board/justine-soudier.jpg', 7),
  ('Sebastien Mannai', '', '', 'sebastien-mannai', '/images/board/sebastien-mannai.jpg', 8)
ON CONFLICT DO NOTHING;
