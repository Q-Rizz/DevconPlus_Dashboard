-- Add priority to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'Medium'
  CHECK (priority IN ('Low', 'Medium', 'High', 'Critical'));

-- task_comments
CREATE TABLE IF NOT EXISTS task_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id  uuid REFERENCES contributors(id) ON DELETE SET NULL,
  body       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_comments_select" ON task_comments FOR SELECT USING (true);
CREATE POLICY "task_comments_insert" ON task_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "task_comments_delete" ON task_comments FOR DELETE USING (true);
