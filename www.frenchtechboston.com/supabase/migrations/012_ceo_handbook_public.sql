-- Make CEO Handbook publicly available without email gate
UPDATE resources
SET
  is_gated = false,
  is_published = true,
  file_url = '/downloads/ceo-handbook.pdf',
  updated_at = NOW()
WHERE slug = 'ceo-handbook';
