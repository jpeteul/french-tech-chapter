-- Create storage bucket for board member photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('board-photos', 'board-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to board photos
CREATE POLICY "Public read access for board photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'board-photos');

-- Allow authenticated users to upload board photos (admins will handle this server-side)
CREATE POLICY "Authenticated users can upload board photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'board-photos');

-- Allow updates to board photos
CREATE POLICY "Allow update board photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'board-photos');

-- Allow delete board photos
CREATE POLICY "Allow delete board photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'board-photos');

-- Add upload_token column to board_members for self-service uploads
ALTER TABLE board_members ADD COLUMN IF NOT EXISTS upload_token UUID DEFAULT uuid_generate_v4();
ALTER TABLE board_members ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index on upload_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_board_members_upload_token ON board_members(upload_token);
