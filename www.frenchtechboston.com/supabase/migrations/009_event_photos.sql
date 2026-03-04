-- Event Photos table for gallery management
CREATE TABLE IF NOT EXISTS event_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename TEXT NOT NULL,
  url TEXT NOT NULL,
  alt_text TEXT,
  is_wide BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE event_photos ENABLE ROW LEVEL SECURITY;

-- Anyone can view event photos
CREATE POLICY "Anyone can view event photos" ON event_photos
  FOR SELECT USING (true);

-- Admins can manage event photos
CREATE POLICY "Admins can manage event photos" ON event_photos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE user_id = auth.uid() AND member_role = 'admin'
    )
  );

-- Create storage bucket for event photos (run this in Supabase dashboard if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('event-photos', 'event-photos', true);
