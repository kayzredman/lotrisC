-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0008: SLA Breach Prediction
-- Adds sla_warning_level column to Tickets for Phase 2 prediction engine.
-- Written by SLA predictor BullMQ job every 5 minutes; cleared on resolve/close.
-- ─────────────────────────────────────────────────────────────────────────────

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Tickets') AND name = 'sla_warning_level'
)
BEGIN
  ALTER TABLE Tickets
    ADD sla_warning_level NVARCHAR(10) NOT NULL
    CONSTRAINT DF_Tickets_SlaWarningLevel DEFAULT 'NONE'
    CONSTRAINT CK_Tickets_SlaWarningLevel CHECK (sla_warning_level IN ('NONE', 'AMBER', 'RED'));
END
GO

-- Index to efficiently fetch amber/red tickets per tenant (used by slaWarnings tRPC)
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('Tickets') AND name = 'idx_tickets_sla_warning'
)
BEGIN
  CREATE INDEX idx_tickets_sla_warning
    ON Tickets (tenant_id, sla_warning_level)
    WHERE sla_warning_level IN ('AMBER', 'RED');
END
GO
