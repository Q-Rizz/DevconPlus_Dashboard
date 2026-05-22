-- ─── milestones ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS milestones (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid REFERENCES projects(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  target_date date NOT NULL,
  status      text NOT NULL DEFAULT 'Not Started'
    CHECK (status IN ('Not Started', 'In Progress', 'At Risk', 'Achieved', 'Missed')),
  achieved_at timestamptz,
  announced   boolean NOT NULL DEFAULT false,
  created_by  uuid REFERENCES contributors(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS milestones_project_id_idx  ON milestones(project_id);
CREATE INDEX IF NOT EXISTS milestones_status_idx      ON milestones(status);
CREATE INDEX IF NOT EXISTS milestones_target_date_idx ON milestones(target_date);

CREATE OR REPLACE FUNCTION update_milestone_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER milestones_updated_at
  BEFORE UPDATE ON milestones
  FOR EACH ROW EXECUTE FUNCTION update_milestone_updated_at();

-- ─── milestone_progress ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS milestone_progress (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id     uuid NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  logged_by        uuid REFERENCES contributors(id),
  progress_note    text NOT NULL,
  progress_percent integer NOT NULL DEFAULT 0
    CHECK (progress_percent BETWEEN 0 AND 100),
  blockers         text,
  logged_date      date NOT NULL DEFAULT CURRENT_DATE,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS milestone_progress_milestone_id_idx ON milestone_progress(milestone_id);
CREATE INDEX IF NOT EXISTS milestone_progress_logged_date_idx  ON milestone_progress(logged_date);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE milestones         ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_progress ENABLE ROW LEVEL SECURITY;

-- milestones: contributors can read all; authenticated users can insert/update
CREATE POLICY "milestones_select" ON milestones
  FOR SELECT USING (is_contributor());

CREATE POLICY "milestones_insert" ON milestones
  FOR INSERT WITH CHECK (is_contributor());

CREATE POLICY "milestones_update" ON milestones
  FOR UPDATE USING (is_contributor());

-- milestone_progress: same pattern
CREATE POLICY "milestone_progress_select" ON milestone_progress
  FOR SELECT USING (is_contributor());

CREATE POLICY "milestone_progress_insert" ON milestone_progress
  FOR INSERT WITH CHECK (is_contributor());

-- Service role bypass (for Edge Functions and API routes using service role)
CREATE POLICY "milestones_service_role" ON milestones
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "milestone_progress_service_role" ON milestone_progress
  FOR ALL USING (auth.role() = 'service_role');
