-- Add image_url column to resources table
ALTER TABLE resources ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Update Boston Ecosystem guide with the map image
UPDATE resources
SET image_url = '/images/Boston Tech Map.png'
WHERE slug = 'boston-ecosystem';
