-- Phase 8.2: RCA multi-stage approvals

IF OBJECT_ID('dbo.RCA_Approvals', 'U') IS NULL
CREATE TABLE dbo.RCA_Approvals (
  id             VARCHAR(36)   NOT NULL PRIMARY KEY,
  tenant_id      VARCHAR(36)   NOT NULL REFERENCES Tenants(id),
  rca_id         VARCHAR(36)   NOT NULL REFERENCES RCA_Records(id),
  approver_role  VARCHAR(30)   NOT NULL,
  approver_id    VARCHAR(36)   NOT NULL REFERENCES Users(id),
  decision       VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
  comments       NVARCHAR(1000) NULL,
  decided_at     DATETIME2(3)  NULL,
  created_at     DATETIME2(3)  NOT NULL,
  CONSTRAINT uq_rca_approval_role UNIQUE (rca_id, approver_role)
);
CREATE INDEX idx_rca_approvals_rca ON dbo.RCA_Approvals (rca_id);
