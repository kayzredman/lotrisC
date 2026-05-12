-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0007: Ticket Intake
-- Adds requester info, source tracking, and related-ticket linkage to Tickets.
-- Creates CategoryRouting table for category → team mapping per tenant.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Tickets: requester_email ─────────────────────────────────────────────────
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Tickets') AND name = 'requester_email'
)
BEGIN
  ALTER TABLE Tickets ADD requester_email VARCHAR(255) NULL;
END
GO

-- ─── Tickets: requester_name ──────────────────────────────────────────────────
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Tickets') AND name = 'requester_name'
)
BEGIN
  ALTER TABLE Tickets ADD requester_name NVARCHAR(255) NULL;
END
GO

-- ─── Tickets: source ──────────────────────────────────────────────────────────
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Tickets') AND name = 'source'
)
BEGIN
  ALTER TABLE Tickets ADD
    source VARCHAR(20) NOT NULL
      CONSTRAINT df_ticket_source DEFAULT 'INTERNAL'
      CONSTRAINT chk_ticket_source CHECK (source IN ('INTERNAL', 'EMAIL', 'SELF_SERVICE', 'API'));
END
GO

-- ─── Tickets: related_ticket_id ───────────────────────────────────────────────
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Tickets') AND name = 'related_ticket_id'
)
BEGIN
  ALTER TABLE Tickets ADD related_ticket_id VARCHAR(36) NULL
    REFERENCES Tickets(id);
END
GO

-- ─── CategoryRouting table ────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'CategoryRouting')
BEGIN
  CREATE TABLE CategoryRouting (
    id               VARCHAR(36)   NOT NULL PRIMARY KEY,
    tenant_id        VARCHAR(36)   NOT NULL REFERENCES Tenants(id),
    category         VARCHAR(100)  NOT NULL,
    team_id          VARCHAR(36)   NOT NULL REFERENCES Teams(id),
    default_priority INT           NOT NULL DEFAULT 3,
    created_at       DATETIME2(3)  NOT NULL DEFAULT GETUTCDATE(),
    updated_at       DATETIME2(3)  NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT uq_cr_tenant_category UNIQUE (tenant_id, category)
  );

  CREATE INDEX idx_cr_tenant ON CategoryRouting (tenant_id);
END
GO
