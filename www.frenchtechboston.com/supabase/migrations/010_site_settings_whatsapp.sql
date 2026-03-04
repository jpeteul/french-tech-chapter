-- Site Settings table for storing configuration values
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES members(id)
);

-- Enable RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read site settings (keeps WhatsApp link private)
CREATE POLICY "Admins can read site settings" ON site_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE user_id = auth.uid() AND member_role = 'admin'
    )
  );

-- Allow authenticated members to read specific non-sensitive settings
CREATE POLICY "Members can read whatsapp url" ON site_settings
  FOR SELECT USING (
    key = 'whatsapp_community_url' AND
    EXISTS (
      SELECT 1 FROM members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Only admins can update site settings
CREATE POLICY "Admins can manage site settings" ON site_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE user_id = auth.uid() AND member_role = 'admin'
    )
  );

-- Seed with initial WhatsApp community URL
INSERT INTO site_settings (key, value, description)
VALUES (
  'whatsapp_community_url',
  'https://chat.whatsapp.com/BJ3aJIGQLlr1hrGPKcQr7z',
  'WhatsApp Community invite link shown to authenticated members'
)
ON CONFLICT (key) DO NOTHING;

-- Add whatsapp_prompt_dismissed to members table
ALTER TABLE members ADD COLUMN IF NOT EXISTS whatsapp_prompt_dismissed BOOLEAN DEFAULT false;
