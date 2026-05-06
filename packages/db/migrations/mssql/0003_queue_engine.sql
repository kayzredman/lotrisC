-- Migration: 0003_queue_engine.sql
-- Sprint 5-6: Queue Config table

CREATE TABLE [dbo].[Queue_Config] (
    [id]                          VARCHAR(36)      NOT NULL,
    [tenant_id]                   VARCHAR(36)      NOT NULL,
    [team_id]                     VARCHAR(36)      NULL,        -- NULL = tenant default
    [max_capacity_per_engineer]   INT              NOT NULL DEFAULT 10,
    [pickup_sla_minutes]          INT              NOT NULL DEFAULT 30,
    [resolution_sla_minutes]      INT              NOT NULL DEFAULT 240,
    [auto_assign_enabled]         BIT              NOT NULL DEFAULT 1,
    [created_at]                  DATETIME2(3)     NOT NULL,
    [updated_at]                  DATETIME2(3)     NOT NULL,

    CONSTRAINT [PK_Queue_Config] PRIMARY KEY ([id]),
    CONSTRAINT [CK_QueueConfig_MaxCap] CHECK ([max_capacity_per_engineer] >= 1),
    CONSTRAINT [CK_QueueConfig_PickupSla] CHECK ([pickup_sla_minutes] >= 5),
    CONSTRAINT [CK_QueueConfig_ResSla] CHECK ([resolution_sla_minutes] >= 30),
    CONSTRAINT [FK_QueueConfig_Tenant] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[Tenants]([id]),
    CONSTRAINT [FK_QueueConfig_Team] FOREIGN KEY ([team_id]) REFERENCES [dbo].[Teams]([id])
);

-- One config per tenant (default) or per team
CREATE UNIQUE INDEX [UX_QueueConfig_TenantTeam]
    ON [dbo].[Queue_Config] ([tenant_id], [team_id])
    WHERE [team_id] IS NOT NULL;

CREATE UNIQUE INDEX [UX_QueueConfig_TenantDefault]
    ON [dbo].[Queue_Config] ([tenant_id])
    WHERE [team_id] IS NULL;

-- Index for quick lookup by tenant
CREATE INDEX [IX_QueueConfig_Tenant] ON [dbo].[Queue_Config] ([tenant_id]);
