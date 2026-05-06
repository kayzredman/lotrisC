-- Analytics schema for Lotris reporting layer (Sprint 11-12)
-- PostgreSQL (analytics DB — read-heavy; written by ETL worker)

CREATE TABLE IF NOT EXISTS analytics_ticket_daily (
  id              VARCHAR(36)       PRIMARY KEY,
  tenant_id       VARCHAR(36)       NOT NULL,
  date            DATE              NOT NULL,
  total_created   INTEGER           NOT NULL DEFAULT 0,
  total_resolved  INTEGER           NOT NULL DEFAULT 0,
  total_escalated INTEGER           NOT NULL DEFAULT 0,
  total_open      INTEGER           NOT NULL DEFAULT 0,
  sla_breach_count INTEGER          NOT NULL DEFAULT 0,
  avg_resolution_hours DECIMAL(10,2),
  updated_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  CONSTRAINT IX_AtD_TenantDate UNIQUE (tenant_id, date)
);

CREATE TABLE IF NOT EXISTS analytics_engineer_perf (
  id                    VARCHAR(36)  PRIMARY KEY,
  tenant_id             VARCHAR(36)  NOT NULL,
  engineer_id           VARCHAR(36)  NOT NULL,
  week_key              VARCHAR(10)  NOT NULL,
  tickets_resolved      INTEGER      NOT NULL DEFAULT 0,
  tasks_completed       INTEGER      NOT NULL DEFAULT 0,
  sla_breaches          INTEGER      NOT NULL DEFAULT 0,
  avg_resolution_hours  DECIMAL(10,2),
  kpi_score             DECIMAL(6,2),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT IX_AEP_EngineerWeek UNIQUE (tenant_id, engineer_id, week_key)
);

CREATE TABLE IF NOT EXISTS analytics_kpi_summary (
  id            VARCHAR(36)  PRIMARY KEY,
  tenant_id     VARCHAR(36)  NOT NULL,
  engineer_id   VARCHAR(36)  NOT NULL,
  period_key    VARCHAR(20)  NOT NULL,
  overall_score DECIMAL(6,2) NOT NULL,
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT IX_AKS_EngineerPeriod UNIQUE (tenant_id, engineer_id, period_key)
);

CREATE TABLE IF NOT EXISTS analytics_sla_daily (
  id                  VARCHAR(36)  PRIMARY KEY,
  tenant_id           VARCHAR(36)  NOT NULL,
  date                DATE         NOT NULL,
  total_tickets       INTEGER      NOT NULL DEFAULT 0,
  pickup_breaches     INTEGER      NOT NULL DEFAULT 0,
  resolution_breaches INTEGER      NOT NULL DEFAULT 0,
  compliance_pct      DECIMAL(6,2),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT IX_ASD_TenantDate UNIQUE (tenant_id, date)
);

CREATE TABLE IF NOT EXISTS report_jobs (
  id            VARCHAR(36)   PRIMARY KEY,
  tenant_id     VARCHAR(36)   NOT NULL,
  report_type   VARCHAR(40)   NOT NULL,
  format        VARCHAR(10)   NOT NULL DEFAULT 'PDF',
  status        VARCHAR(20)   NOT NULL DEFAULT 'QUEUED',
  file_path     TEXT,
  requested_by  VARCHAR(36)   NOT NULL,
  date_from     VARCHAR(20),
  date_to       VARCHAR(20),
  team_id       VARCHAR(36),
  error_msg     TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS IX_ReportJobs_Tenant ON report_jobs (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS report_schedules (
  id           VARCHAR(36)  PRIMARY KEY,
  tenant_id    VARCHAR(36)  NOT NULL,
  report_type  VARCHAR(40)  NOT NULL,
  format       VARCHAR(10)  NOT NULL DEFAULT 'PDF',
  frequency    VARCHAR(20)  NOT NULL,
  recipients   TEXT         NOT NULL,
  team_id      VARCHAR(36),
  is_active    VARCHAR(5)   NOT NULL DEFAULT 'true',
  created_by   VARCHAR(36)  NOT NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS IX_ReportSchedules_Tenant ON report_schedules (tenant_id);
