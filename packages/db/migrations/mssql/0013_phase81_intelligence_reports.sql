-- Phase 8.1: auto-index tickets, report job delivery recipients

IF COL_LENGTH('dbo.Tenant_Intelligence_Config', 'feature_auto_index_tickets') IS NULL
  ALTER TABLE dbo.Tenant_Intelligence_Config
    ADD feature_auto_index_tickets BIT NOT NULL DEFAULT 0;

IF COL_LENGTH('analytics.ReportJobs', 'delivery_recipients') IS NULL
  ALTER TABLE analytics.ReportJobs
    ADD delivery_recipients NVARCHAR(MAX) NULL;
