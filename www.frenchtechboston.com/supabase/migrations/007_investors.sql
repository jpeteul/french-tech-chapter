-- Investor Directory Schema
-- Allows members to share investor contacts and request introductions

-- =============================================================================
-- ENUMS
-- =============================================================================

-- Investment stage focus
CREATE TYPE investor_stage AS ENUM (
  'pre-seed',
  'seed',
  'series-a',
  'series-b',
  'series-c',
  'growth',
  'late-stage'
);

-- Investment sector focus
CREATE TYPE investor_sector AS ENUM (
  'ai-ml',
  'fintech',
  'healthtech',
  'biotech',
  'saas',
  'consumer',
  'hardware',
  'climate',
  'cybersecurity',
  'edtech',
  'proptech',
  'deeptech',
  'other'
);

-- Geographic focus
CREATE TYPE investor_geo AS ENUM (
  'us-northeast',
  'us-west',
  'us-southeast',
  'us-midwest',
  'europe',
  'france',
  'uk',
  'asia',
  'global'
);

-- =============================================================================
-- TABLES
-- =============================================================================

-- Investors table
CREATE TABLE investors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  firm TEXT,
  website TEXT,
  stage_focus investor_stage[] DEFAULT '{}',
  sector_focus investor_sector[] DEFAULT '{}',
  geo_focus investor_geo[] DEFAULT '{}',
  check_size_min INTEGER, -- USD
  check_size_max INTEGER, -- USD
  notes TEXT, -- Public notes visible to all members
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES members(id) ON DELETE SET NULL
);

-- Investor contacts (join table: which members know which investors)
CREATE TABLE investor_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  relationship_note TEXT, -- Private: only visible to the owning member
  added_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(investor_id, member_id)
);

-- Introduction requests
CREATE TABLE intro_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  message TEXT NOT NULL, -- Why the requester believes they're a fit
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,

  -- Prevent duplicate requests for same investor to same contact
  UNIQUE(investor_id, requester_id, contact_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Investors: search by name and firm (using btree for prefix matching)
CREATE INDEX idx_investors_name ON investors(lower(name));
CREATE INDEX idx_investors_firm ON investors(lower(firm));
CREATE INDEX idx_investors_created_by ON investors(created_by);

-- Investor contacts: lookup by investor or member
CREATE INDEX idx_investor_contacts_investor ON investor_contacts(investor_id);
CREATE INDEX idx_investor_contacts_member ON investor_contacts(member_id);

-- Intro requests: lookup by parties involved
CREATE INDEX idx_intro_requests_investor ON intro_requests(investor_id);
CREATE INDEX idx_intro_requests_requester ON intro_requests(requester_id);
CREATE INDEX idx_intro_requests_contact ON intro_requests(contact_id);
CREATE INDEX idx_intro_requests_status ON intro_requests(status);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE intro_requests ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Investors policies
-- -----------------------------------------------------------------------------

-- All authenticated members can view investors
CREATE POLICY "Members can view investors"
  ON investors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Any member can add an investor
CREATE POLICY "Members can add investors"
  ON investors FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Only creator can update (or admin)
CREATE POLICY "Creator can update investor"
  ON investors FOR UPDATE
  USING (
    created_by IN (SELECT id FROM members WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM members
      WHERE user_id = auth.uid() AND member_role = 'admin'
    )
  );

-- Admins can delete
CREATE POLICY "Admins can delete investors"
  ON investors FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE user_id = auth.uid() AND member_role = 'admin'
    )
  );

-- -----------------------------------------------------------------------------
-- Investor contacts policies
-- -----------------------------------------------------------------------------

-- All members can see who knows an investor (but relationship_note is masked)
CREATE POLICY "Members can view investor contacts"
  ON investor_contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Members can add themselves as a contact
CREATE POLICY "Members can add themselves as contact"
  ON investor_contacts FOR INSERT
  WITH CHECK (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

-- Members can update their own contact entries (e.g., relationship_note)
CREATE POLICY "Members can update own contact entries"
  ON investor_contacts FOR UPDATE
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

-- Members can remove themselves as a contact
CREATE POLICY "Members can remove themselves as contact"
  ON investor_contacts FOR DELETE
  USING (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

-- -----------------------------------------------------------------------------
-- Intro requests policies
-- -----------------------------------------------------------------------------

-- Requester and contact can view their own requests
CREATE POLICY "Parties can view intro requests"
  ON intro_requests FOR SELECT
  USING (
    requester_id IN (SELECT id FROM members WHERE user_id = auth.uid())
    OR contact_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

-- Members can create intro requests (as requester)
CREATE POLICY "Members can create intro requests"
  ON intro_requests FOR INSERT
  WITH CHECK (
    requester_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

-- Only contact can update status (accept/decline)
CREATE POLICY "Contact can respond to intro requests"
  ON intro_requests FOR UPDATE
  USING (
    contact_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

-- =============================================================================
-- VIEW: Mask relationship_note for non-owners
-- =============================================================================

CREATE OR REPLACE VIEW investor_contacts_public AS
SELECT
  ic.id,
  ic.investor_id,
  ic.member_id,
  ic.added_at,
  -- Only show relationship_note to the owning member
  CASE
    WHEN ic.member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
    THEN ic.relationship_note
    ELSE NULL
  END AS relationship_note
FROM investor_contacts ic;

-- Grant access to the view
GRANT SELECT ON investor_contacts_public TO authenticated;

-- =============================================================================
-- HELPER FUNCTION: Search investors with fuzzy matching
-- =============================================================================

CREATE OR REPLACE FUNCTION search_investors(
  search_term TEXT DEFAULT NULL,
  stage_filter investor_stage[] DEFAULT NULL,
  sector_filter investor_sector[] DEFAULT NULL,
  geo_filter investor_geo[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  firm TEXT,
  website TEXT,
  stage_focus investor_stage[],
  sector_focus investor_sector[],
  geo_focus investor_geo[],
  check_size_min INTEGER,
  check_size_max INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ,
  created_by UUID,
  contact_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.name,
    i.firm,
    i.website,
    i.stage_focus,
    i.sector_focus,
    i.geo_focus,
    i.check_size_min,
    i.check_size_max,
    i.notes,
    i.created_at,
    i.created_by,
    COUNT(ic.id) AS contact_count
  FROM investors i
  LEFT JOIN investor_contacts ic ON ic.investor_id = i.id
  WHERE
    -- Text search (name or firm)
    (search_term IS NULL OR search_term = '' OR
      i.name ILIKE '%' || search_term || '%' OR
      i.firm ILIKE '%' || search_term || '%')
    -- Stage filter (any overlap)
    AND (stage_filter IS NULL OR i.stage_focus && stage_filter)
    -- Sector filter (any overlap)
    AND (sector_filter IS NULL OR i.sector_focus && sector_filter)
    -- Geo filter (any overlap)
    AND (geo_filter IS NULL OR i.geo_focus && geo_filter)
  GROUP BY i.id
  ORDER BY contact_count DESC, i.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION search_investors TO authenticated;
