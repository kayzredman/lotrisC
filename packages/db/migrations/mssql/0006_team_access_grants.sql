-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0006: Team Access Grants
-- Allows Admin/Superadmin to grant a Team Lead cross-team ticket visibility.
-- ─────────────────────────────────────────────────────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TeamAccessGrants')
BEGIN
  CREATE TABLE TeamAccessGrants (
    id               VARCHAR(36)   NOT NULL PRIMARY KEY,
    tenant_id        VARCHAR(36)   NOT NULL REFERENCES Tenants(id),
    grantee_user_id  VARCHAR(36)   NOT NULL REFERENCES Users(id),
    target_team_id   VARCHAR(36)   NOT NULL REFERENCES Teams(id),
    granted_by       VARCHAR(36)   NOT NULL REFERENCES Users(id),
    created_at       DATETIME2(3)  NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT uq_tag_grantee_team UNIQUE (grantee_user_id, target_team_id)
  );

  CREATE INDEX idx_tag_tenant      ON TeamAccessGrants (tenant_id);
  CREATE INDEX idx_tag_grantee     ON TeamAccessGrants (grantee_user_id);
  CREATE INDEX idx_tag_target_team ON TeamAccessGrants (target_team_id);
END
GO
