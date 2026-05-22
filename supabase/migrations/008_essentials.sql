-- ─── essential_sections ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS essential_sections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  icon        text,
  position    integer NOT NULL DEFAULT 0,
  created_by  uuid REFERENCES contributors(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS essential_sections_project_id_idx ON essential_sections(project_id);
CREATE INDEX IF NOT EXISTS essential_sections_position_idx   ON essential_sections(project_id, position);

-- ─── essential_entries ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS essential_entries (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id       uuid NOT NULL REFERENCES essential_sections(id) ON DELETE CASCADE,
  project_id       uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  label            text NOT NULL,
  data_type        text NOT NULL
    CHECK (data_type IN ('text', 'link', 'code', 'file', 'email', 'credential')),
  value_text       text,
  value_file_url   text,
  value_file_name  text,
  is_sensitive     boolean NOT NULL DEFAULT false,
  position         integer NOT NULL DEFAULT 0,
  note             text,
  created_by       uuid REFERENCES contributors(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS essential_entries_section_id_idx  ON essential_entries(section_id);
CREATE INDEX IF NOT EXISTS essential_entries_project_id_idx  ON essential_entries(project_id);
CREATE INDEX IF NOT EXISTS essential_entries_position_idx    ON essential_entries(section_id, position);

CREATE OR REPLACE FUNCTION update_essential_entry_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER essential_entries_updated_at
  BEFORE UPDATE ON essential_entries
  FOR EACH ROW EXECUTE FUNCTION update_essential_entry_updated_at();

-- ─── Storage bucket: essentials-files ────────────────────────────────────────
-- Run via Supabase dashboard or Storage API if not using migration:
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'essentials-files', 'essentials-files', false, 20971520,
--   ARRAY['application/pdf','image/png','image/jpeg','image/gif','image/webp',
--         'text/plain','text/markdown','application/zip',
--         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
--         'application/msword']
-- )
-- ON CONFLICT DO NOTHING;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE essential_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE essential_entries  ENABLE ROW LEVEL SECURITY;

-- essential_sections: all contributors can read; PM role creates/updates/deletes
-- (Enforcement of PM-only writes is done at the API layer; RLS allows any contributor)
CREATE POLICY "essential_sections_select" ON essential_sections
  FOR SELECT USING (is_contributor());

CREATE POLICY "essential_sections_insert" ON essential_sections
  FOR INSERT WITH CHECK (is_contributor());

CREATE POLICY "essential_sections_update" ON essential_sections
  FOR UPDATE USING (is_contributor());

CREATE POLICY "essential_sections_delete" ON essential_sections
  FOR DELETE USING (is_contributor());

-- essential_entries: same pattern
CREATE POLICY "essential_entries_select" ON essential_entries
  FOR SELECT USING (is_contributor());

CREATE POLICY "essential_entries_insert" ON essential_entries
  FOR INSERT WITH CHECK (is_contributor());

CREATE POLICY "essential_entries_update" ON essential_entries
  FOR UPDATE USING (is_contributor());

CREATE POLICY "essential_entries_delete" ON essential_entries
  FOR DELETE USING (is_contributor());

-- Service role bypass
CREATE POLICY "essential_sections_service_role" ON essential_sections
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "essential_entries_service_role" ON essential_entries
  FOR ALL USING (auth.role() = 'service_role');
