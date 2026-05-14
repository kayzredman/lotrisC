-- Sprint 19: Add next_run_at and last_run_at to report_schedules
-- Idempotent: wrapped in DO blocks

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'report_schedules' AND column_name = 'next_run_at'
  ) THEN
    ALTER TABLE report_schedules ADD COLUMN next_run_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'report_schedules' AND column_name = 'last_run_at'
  ) THEN
    ALTER TABLE report_schedules ADD COLUMN last_run_at TIMESTAMPTZ;
  END IF;
END $$;

-- Index for efficient due-schedule lookups
CREATE INDEX IF NOT EXISTS idx_report_schedules_due
  ON report_schedules (tenant_id, next_run_at)
  WHERE is_active = 'true';
