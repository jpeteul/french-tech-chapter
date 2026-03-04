-- News/Articles table
CREATE TABLE IF NOT EXISTS news (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT,
  category TEXT DEFAULT 'News',
  image_url TEXT,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  author_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Apply updated_at trigger
CREATE TRIGGER update_news_updated_at BEFORE UPDATE ON news
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_news_slug ON news(slug);
CREATE INDEX IF NOT EXISTS idx_news_published ON news(is_published, published_at);
CREATE INDEX IF NOT EXISTS idx_news_category ON news(category);

-- Enable RLS
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

-- Anyone can view published news
CREATE POLICY "Anyone can view published news" ON news
  FOR SELECT USING (is_published = true);

-- Admins can manage all news
CREATE POLICY "Admins can manage news" ON news
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE user_id = auth.uid() AND member_role = 'admin'
    )
  );

-- Seed some initial articles
INSERT INTO news (title, slug, excerpt, category, is_published, published_at) VALUES
  ('French Tech Boston Welcomes 50 New Members in 2025', 'new-members-2025', 'Our community continues to grow with founders and executives joining from across the Boston tech ecosystem.', 'Community', true, '2026-01-15'),
  ('Recap: Annual French Tech Connect Summit', 'french-tech-connect-recap', 'Over 200 French entrepreneurs gathered in Boston for our biggest event of the year.', 'Events', true, '2025-11-20'),
  ('Member Spotlight: Marie Dubois, Founder of TechFlow', 'member-spotlight-marie-dubois', 'How one French founder navigated the journey from Paris to Boston to raise a Series A.', 'Spotlight', true, '2025-10-05'),
  ('New Partnership with EY Boston', 'ey-partnership', 'We''re excited to announce EY as a sponsor, supporting French entrepreneurs with resources and expertise.', 'Partnership', true, '2025-09-12')
ON CONFLICT (slug) DO NOTHING;
