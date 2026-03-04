-- Resources table for managing guides, articles, files, and links
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📄',
  type TEXT NOT NULL CHECK (type IN ('guide', 'article', 'link', 'file', 'member_page')),
  is_gated BOOLEAN DEFAULT false,
  is_members_only BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  content TEXT,
  file_url TEXT,
  link_url TEXT,
  slug TEXT UNIQUE,
  display_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for ordering and filtering
CREATE INDEX idx_resources_published ON resources(is_published, display_order);
CREATE INDEX idx_resources_slug ON resources(slug) WHERE slug IS NOT NULL;

-- Enable RLS
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- Public can view published resources
CREATE POLICY "Public can view published resources"
  ON resources FOR SELECT
  USING (is_published = true);

-- Service role can manage all resources
CREATE POLICY "Service role can manage resources"
  ON resources FOR ALL
  USING (true)
  WITH CHECK (true);

-- Insert initial resources based on current hardcoded data
INSERT INTO resources (title, description, icon, type, is_gated, is_featured, slug, display_order) VALUES
  ('CEO Handbook: French Founders in the US', 'A comprehensive guide covering everything from visa requirements to building your US team, fundraising, and understanding American business culture.', '📘', 'file', true, true, 'ceo-handbook', 1),
  ('Boston Tech Ecosystem Map', 'Overview of the key players, accelerators, VCs, and communities in the Boston tech scene.', '🗺️', 'guide', false, false, 'boston-ecosystem', 2),
  ('US Fundraising Playbook', 'Learn the differences between French and US fundraising, including term sheets, due diligence, and negotiations.', '💰', 'guide', true, false, 'fundraising-playbook', 3),
  ('Immigration Resources', 'Links to immigration attorneys, visa types overview, and member experiences with the process.', '🛂', 'guide', false, false, 'immigration', 4),
  ('Investor Directory', 'Access our community-built database of investors who support cross-Atlantic startups.', '💼', 'member_page', false, true, null, 5);

-- Update the investor directory to link to members area
UPDATE resources SET link_url = '/members/investors', is_members_only = true WHERE title = 'Investor Directory';
