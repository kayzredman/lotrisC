-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0002: KPI Trend Snapshots
-- PostgreSQL analytics DB only. Written by kpi-trend BullMQ worker every 30min.
-- Stores the computed trajectory point per engineer per KPI per period.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kpi_trend_snapshots (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL,
  engineer_id     UUID        NOT NULL,
  kpi_def_id      UUID        NOT NULL,
  period_key      VARCHAR(20) NOT NULL,        -- e.g. '2026-Q2'
  snapshot_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actual_to_date  NUMERIC(10, 4),
  projected_eop   NUMERIC(10, 4),             -- projected end-of-period score
  target          NUMERIC(10, 4),
  warning_level   VARCHAR(10) NOT NULL DEFAULT 'NONE'
                  CHECK (warning_level IN ('NONE', 'AMBER', 'RED'))
);

CREATE INDEX IF NOT EXISTS idx_kpi_trend_lookup
  ON kpi_trend_snapshots (tenant_id, engineer_id, kpi_def_id, period_key);

CREATE INDEX IF NOT EXISTS idx_kpi_trend_warning
  ON kpi_trend_snapshots (tenant_id, period_key, warning_level)
  WHERE warning_level IN ('AMBER', 'RED');
