-- Phase 8: multi-provider AI credentials (Claude, Cursor, ChatGPT, Copilot, OpenAI)

IF COL_LENGTH('dbo.Tenant_Intelligence_Config', 'ai_username') IS NULL
BEGIN
  ALTER TABLE dbo.Tenant_Intelligence_Config ADD ai_username NVARCHAR(320) NULL;
END

IF COL_LENGTH('dbo.Tenant_Intelligence_Config', 'ai_connected_at') IS NULL
BEGIN
  ALTER TABLE dbo.Tenant_Intelligence_Config ADD ai_connected_at DATETIME2(3) NULL;
END

IF COL_LENGTH('dbo.Tenant_Intelligence_Config', 'ai_connected_by_id') IS NULL
BEGIN
  ALTER TABLE dbo.Tenant_Intelligence_Config ADD ai_connected_by_id VARCHAR(36) NULL REFERENCES Users(id);
END
