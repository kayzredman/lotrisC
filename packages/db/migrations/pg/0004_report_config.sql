-- Sprint 19: Tenant-level report configuration
-- Idempotent: CREATE TABLE IF NOT EXISTS

CREATE TABLE IF NOT EXISTS report_config (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                VARCHAR(36) UNIQUE NOT NULL,
  brand_name               VARCHAR(120),
  default_timezone         VARCHAR(60),
  attachment_size_limit_mb INT,
  retention_days           INT,
  default_recipients       TEXT,        -- JSON array of email strings
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
