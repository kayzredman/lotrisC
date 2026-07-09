-- Phase 4/5: Mobile refresh tokens

IF OBJECT_ID('dbo.Refresh_Tokens', 'U') IS NULL
CREATE TABLE dbo.Refresh_Tokens (
  id                   VARCHAR(36)   NOT NULL PRIMARY KEY,
  user_id              VARCHAR(36)   NOT NULL REFERENCES Users(id),
  tenant_id            VARCHAR(36)   NOT NULL REFERENCES Tenants(id),
  token_hash           VARCHAR(128)  NOT NULL,
  expires_at           DATETIME2(3)  NOT NULL,
  created_at           DATETIME2(3)  NOT NULL,
  last_used_at         DATETIME2(3)  NULL,
  revoked_at           DATETIME2(3)  NULL,
  replaced_by_token_id VARCHAR(36)   NULL
);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'uq_refresh_tokens_hash' AND object_id = OBJECT_ID('dbo.Refresh_Tokens'))
  CREATE UNIQUE INDEX uq_refresh_tokens_hash ON dbo.Refresh_Tokens (token_hash);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_refresh_tokens_user' AND object_id = OBJECT_ID('dbo.Refresh_Tokens'))
  CREATE INDEX idx_refresh_tokens_user ON dbo.Refresh_Tokens (user_id, revoked_at, expires_at);
