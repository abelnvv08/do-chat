-- Add missing columns to demo_tasks for the task assignment system
-- All columns are added with IF NOT EXISTS so this is safe to re-run

ALTER TABLE demo_tasks ADD COLUMN IF NOT EXISTS task_status    TEXT;
ALTER TABLE demo_tasks ADD COLUMN IF NOT EXISTS assigned_to    UUID;
ALTER TABLE demo_tasks ADD COLUMN IF NOT EXISTS assigned_by    UUID;
ALTER TABLE demo_tasks ADD COLUMN IF NOT EXISTS assigned_by_name  TEXT;
ALTER TABLE demo_tasks ADD COLUMN IF NOT EXISTS assigned_by_emoji TEXT;
ALTER TABLE demo_tasks ADD COLUMN IF NOT EXISTS assigned_to_name  TEXT;
ALTER TABLE demo_tasks ADD COLUMN IF NOT EXISTS evidence_url   TEXT;
ALTER TABLE demo_tasks ADD COLUMN IF NOT EXISTS evidence_name  TEXT;
ALTER TABLE demo_tasks ADD COLUMN IF NOT EXISTS completed_at   TIMESTAMPTZ;

-- Backfill: existing rows without task_status that are NOT invite-style → mark as personal
UPDATE demo_tasks
SET task_status = 'personal'
WHERE task_status IS NULL
  AND assigned_to IS NULL
  AND (source_room IS NULL OR source_room NOT LIKE 'invite|%');

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_demo_tasks_assigned_to  ON demo_tasks(assigned_to)  WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_demo_tasks_assigned_by  ON demo_tasks(assigned_by)  WHERE assigned_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_demo_tasks_user_status  ON demo_tasks(user_id, task_status);
