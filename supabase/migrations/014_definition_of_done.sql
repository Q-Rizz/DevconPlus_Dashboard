-- Add Definition of Done field to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS definition_of_done text;
