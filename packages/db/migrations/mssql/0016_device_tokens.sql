-- Phase 3: Mobile pager device tokens (Expo / FCM / APNs)

IF OBJECT_ID('dbo.Device_Tokens', 'U') IS NULL
CREATE TABLE dbo.Device_Tokens (
  id           VARCHAR(36)   NOT NULL PRIMARY KEY,
  user_id      VARCHAR(36)   NOT NULL REFERENCES Users(id),
  tenant_id    VARCHAR(36)   NOT NULL REFERENCES Tenants(id),
  platform     VARCHAR(20)   NOT NULL,
  token        NVARCHAR(512) NOT NULL,
  device_label NVARCHAR(120) NULL,
  created_at   DATETIME2(3)  NOT NULL,
  updated_at   DATETIME2(3)  NOT NULL,
  revoked_at   DATETIME2(3)  NULL
);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_device_tokens_user' AND object_id = OBJECT_ID('dbo.Device_Tokens'))
  CREATE INDEX idx_device_tokens_user ON dbo.Device_Tokens (user_id);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'uq_device_tokens_active' AND object_id = OBJECT_ID('dbo.Device_Tokens'))
  CREATE UNIQUE INDEX uq_device_tokens_active ON dbo.Device_Tokens (token) WHERE revoked_at IS NULL;
