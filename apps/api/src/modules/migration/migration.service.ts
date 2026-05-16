import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { getMssqlPool, ensureMssqlDatabase } from '@lotris/db';

// ── Migration SQL embedded inline (webpack-bundled, no fs access needed) ───────

const MIGRATIONS: { name: string; sql: string }[] = [
  {
    name: '0001_initial_schema.sql',
    sql: `
CREATE TABLE Tenants (
  id            VARCHAR(36)    NOT NULL PRIMARY KEY,
  clerk_org_id  VARCHAR(255)   NOT NULL UNIQUE,
  name          NVARCHAR(255)  NOT NULL,
  slug          VARCHAR(100)   NOT NULL UNIQUE,
  is_active     BIT            NOT NULL DEFAULT 1,
  created_at    DATETIME2(3)   NOT NULL DEFAULT GETUTCDATE(),
  updated_at    DATETIME2(3)   NOT NULL DEFAULT GETUTCDATE()
);
GO
CREATE TABLE Roles (
  id    INT          NOT NULL PRIMARY KEY IDENTITY(1,1),
  name  VARCHAR(50)  NOT NULL UNIQUE
);
GO
INSERT INTO Roles (name) VALUES
  ('SUPERADMIN'),
  ('ADMIN'),
  ('IT_MANAGER'),
  ('TEAM_LEAD'),
  ('ENGINEER'),
  ('EXECUTIVE');
GO
CREATE TABLE Teams (
  id                        VARCHAR(36)   NOT NULL PRIMARY KEY,
  tenant_id                 VARCHAR(36)   NOT NULL REFERENCES Tenants(id),
  name                      NVARCHAR(255) NOT NULL,
  max_tickets_per_engineer  INT           NOT NULL DEFAULT 5,
  pickup_sla_minutes        INT           NOT NULL DEFAULT 30,
  is_active                 BIT           NOT NULL DEFAULT 1,
  created_at                DATETIME2(3)  NOT NULL DEFAULT GETUTCDATE(),
  updated_at                DATETIME2(3)  NOT NULL DEFAULT GETUTCDATE()
);
GO
CREATE INDEX idx_teams_tenant ON Teams (tenant_id);
GO
CREATE TABLE Users (
  id               VARCHAR(36)   NOT NULL PRIMARY KEY,
  tenant_id        VARCHAR(36)   NOT NULL REFERENCES Tenants(id),
  clerk_user_id    VARCHAR(255)  NOT NULL UNIQUE,
  email            VARCHAR(255)  NOT NULL,
  full_name        NVARCHAR(255) NOT NULL,
  role_id          INT           NOT NULL REFERENCES Roles(id),
  team_id          VARCHAR(36)   REFERENCES Teams(id),
  is_active        BIT           NOT NULL DEFAULT 1,
  is_unavailable   BIT           NOT NULL DEFAULT 0,
  created_at       DATETIME2(3)  NOT NULL DEFAULT GETUTCDATE(),
  updated_at       DATETIME2(3)  NOT NULL DEFAULT GETUTCDATE()
);
GO
CREATE INDEX idx_users_tenant        ON Users (tenant_id);
CREATE INDEX idx_users_tenant_role   ON Users (tenant_id, role_id);
CREATE INDEX idx_users_tenant_team   ON Users (tenant_id, team_id);
CREATE INDEX idx_users_clerk         ON Users (clerk_user_id);
GO
CREATE TABLE Audit_Logs (
  id           BIGINT        NOT NULL PRIMARY KEY IDENTITY(1,1),
  tenant_id    VARCHAR(36)   NOT NULL,
  user_id      VARCHAR(36)   NOT NULL,
  action       VARCHAR(100)  NOT NULL,
  entity_type  VARCHAR(100),
  entity_id    VARCHAR(36),
  details      NVARCHAR(MAX),
  created_at   DATETIME2(3)  NOT NULL DEFAULT GETUTCDATE()
);
GO
CREATE INDEX idx_audit_tenant         ON Audit_Logs (tenant_id);
CREATE INDEX idx_audit_tenant_created ON Audit_Logs (tenant_id, created_at);
`,
  },
  {
    name: '0002_ticket_core.sql',
    sql: `
CREATE TABLE dbo.Tickets (
    id                      VARCHAR(36)       NOT NULL,
    tenant_id               VARCHAR(36)       NOT NULL,
    title                   NVARCHAR(500)     NOT NULL,
    description             NVARCHAR(4000)    NOT NULL,
    priority                INT               NOT NULL DEFAULT 2,
    status                  VARCHAR(50)       NOT NULL DEFAULT 'NEW',
    team_id                 VARCHAR(36)       NULL,
    assignee_id             VARCHAR(36)       NULL,
    created_by              VARCHAR(36)       NOT NULL,
    sla_pickup_deadline     DATETIME2(3)      NULL,
    sla_resolution_deadline DATETIME2(3)      NULL,
    sla_pickup_breached     BIT               NOT NULL DEFAULT 0,
    sla_resolution_breached BIT               NOT NULL DEFAULT 0,
    assigned_at             DATETIME2(3)      NULL,
    resolved_at             DATETIME2(3)      NULL,
    closed_at               DATETIME2(3)      NULL,
    created_at              DATETIME2(3)      NOT NULL,
    updated_at              DATETIME2(3)      NOT NULL,
    CONSTRAINT PK_Tickets PRIMARY KEY (id),
    CONSTRAINT FK_Tickets_Tenant    FOREIGN KEY (tenant_id)   REFERENCES dbo.Tenants(id),
    CONSTRAINT FK_Tickets_Team      FOREIGN KEY (team_id)     REFERENCES dbo.Teams(id),
    CONSTRAINT FK_Tickets_Assignee  FOREIGN KEY (assignee_id) REFERENCES dbo.Users(id),
    CONSTRAINT FK_Tickets_CreatedBy FOREIGN KEY (created_by)  REFERENCES dbo.Users(id),
    CONSTRAINT CK_Tickets_Priority  CHECK (priority IN (1, 2, 3, 4)),
    CONSTRAINT CK_Tickets_Status    CHECK (status IN (
        'NEW', 'TEAM_ASSIGNED', 'UNASSIGNED', 'ASSIGNED',
        'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'
    ))
);
GO
CREATE INDEX idx_tickets_tenant          ON dbo.Tickets (tenant_id);
CREATE INDEX idx_tickets_tenant_status   ON dbo.Tickets (tenant_id, status);
CREATE INDEX idx_tickets_tenant_team     ON dbo.Tickets (tenant_id, team_id);
CREATE INDEX idx_tickets_tenant_assignee ON dbo.Tickets (tenant_id, assignee_id);
CREATE INDEX idx_tickets_queue           ON dbo.Tickets (tenant_id, priority ASC, sla_resolution_deadline ASC);
GO
CREATE TABLE dbo.Ticket_Comments (
    id          VARCHAR(36)     NOT NULL,
    tenant_id   VARCHAR(36)     NOT NULL,
    ticket_id   VARCHAR(36)     NOT NULL,
    author_id   VARCHAR(36)     NOT NULL,
    body        NVARCHAR(4000)  NOT NULL,
    is_internal BIT             NOT NULL DEFAULT 0,
    created_at  DATETIME2(3)    NOT NULL,
    updated_at  DATETIME2(3)    NOT NULL,
    CONSTRAINT PK_Ticket_Comments        PRIMARY KEY (id),
    CONSTRAINT FK_TktComments_Tenant     FOREIGN KEY (tenant_id) REFERENCES dbo.Tenants(id),
    CONSTRAINT FK_TktComments_Ticket     FOREIGN KEY (ticket_id) REFERENCES dbo.Tickets(id),
    CONSTRAINT FK_TktComments_Author     FOREIGN KEY (author_id) REFERENCES dbo.Users(id)
);
GO
CREATE INDEX idx_ticket_comments_ticket        ON dbo.Ticket_Comments (ticket_id);
CREATE INDEX idx_ticket_comments_tenant_ticket ON dbo.Ticket_Comments (tenant_id, ticket_id);
GO
CREATE TABLE dbo.Ticket_History (
    id          BIGINT IDENTITY(1,1) NOT NULL,
    tenant_id   VARCHAR(36)          NOT NULL,
    ticket_id   VARCHAR(36)          NOT NULL,
    actor_id    VARCHAR(36)          NULL,
    event_type  VARCHAR(100)         NOT NULL,
    from_value  NVARCHAR(500)        NULL,
    to_value    NVARCHAR(500)        NULL,
    metadata    NVARCHAR(2000)       NULL,
    created_at  DATETIME2(3)         NOT NULL,
    CONSTRAINT PK_Ticket_History     PRIMARY KEY (id),
    CONSTRAINT FK_TktHistory_Tenant  FOREIGN KEY (tenant_id) REFERENCES dbo.Tenants(id),
    CONSTRAINT FK_TktHistory_Ticket  FOREIGN KEY (ticket_id) REFERENCES dbo.Tickets(id),
    CONSTRAINT FK_TktHistory_Actor   FOREIGN KEY (actor_id)  REFERENCES dbo.Users(id)
);
GO
CREATE INDEX idx_ticket_history_ticket         ON dbo.Ticket_History (ticket_id);
CREATE INDEX idx_ticket_history_tenant_ticket  ON dbo.Ticket_History (tenant_id, ticket_id);
CREATE INDEX idx_ticket_history_tenant_created ON dbo.Ticket_History (tenant_id, created_at);
GO
CREATE TABLE dbo.SLA_Configs (
    id                      VARCHAR(36)  NOT NULL,
    tenant_id               VARCHAR(36)  NOT NULL,
    team_id                 VARCHAR(36)  NULL,
    pickup_sla_minutes      INT          NOT NULL DEFAULT 30,
    resolution_sla_minutes  INT          NOT NULL DEFAULT 240,
    created_at              DATETIME2(3) NOT NULL,
    updated_at              DATETIME2(3) NOT NULL,
    CONSTRAINT PK_SLA_Configs        PRIMARY KEY (id),
    CONSTRAINT FK_SLAConfig_Tenant   FOREIGN KEY (tenant_id) REFERENCES dbo.Tenants(id),
    CONSTRAINT FK_SLAConfig_Team     FOREIGN KEY (team_id)   REFERENCES dbo.Teams(id)
);
GO
CREATE INDEX idx_sla_configs_tenant      ON dbo.SLA_Configs (tenant_id);
CREATE INDEX idx_sla_configs_tenant_team ON dbo.SLA_Configs (tenant_id, team_id);
GO
CREATE TABLE dbo.Attachment_Refs (
    id              VARCHAR(36)     NOT NULL,
    tenant_id       VARCHAR(36)     NOT NULL,
    ticket_id       VARCHAR(36)     NOT NULL,
    uploaded_by     VARCHAR(36)     NOT NULL,
    storage_key     VARCHAR(1000)   NOT NULL,
    original_name   NVARCHAR(500)   NOT NULL,
    mime_type       VARCHAR(127)    NOT NULL,
    size_bytes      BIGINT          NOT NULL,
    created_at      DATETIME2(3)    NOT NULL,
    CONSTRAINT PK_Attachment_Refs        PRIMARY KEY (id),
    CONSTRAINT FK_AttachRef_Tenant       FOREIGN KEY (tenant_id)   REFERENCES dbo.Tenants(id),
    CONSTRAINT FK_AttachRef_Ticket       FOREIGN KEY (ticket_id)   REFERENCES dbo.Tickets(id),
    CONSTRAINT FK_AttachRef_UploadedBy   FOREIGN KEY (uploaded_by) REFERENCES dbo.Users(id)
);
GO
CREATE INDEX idx_attachment_refs_ticket        ON dbo.Attachment_Refs (ticket_id);
CREATE INDEX idx_attachment_refs_tenant_ticket ON dbo.Attachment_Refs (tenant_id, ticket_id);
`,
  },
  {
    name: '0003_queue_engine.sql',
    sql: `
CREATE TABLE [dbo].[Queue_Config] (
    [id]                          VARCHAR(36)      NOT NULL,
    [tenant_id]                   VARCHAR(36)      NOT NULL,
    [team_id]                     VARCHAR(36)      NULL,
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
GO
CREATE UNIQUE INDEX [UX_QueueConfig_TenantTeam]
    ON [dbo].[Queue_Config] ([tenant_id], [team_id])
    WHERE [team_id] IS NOT NULL;
GO
CREATE UNIQUE INDEX [UX_QueueConfig_TenantDefault]
    ON [dbo].[Queue_Config] ([tenant_id])
    WHERE [team_id] IS NULL;
GO
CREATE INDEX [IX_QueueConfig_Tenant] ON [dbo].[Queue_Config] ([tenant_id]);
`,
  },
  {
    name: '0004_task_management.sql',
    sql: `
CREATE TABLE Tasks (
    id                  VARCHAR(36)      NOT NULL,
    tenant_id           VARCHAR(36)      NOT NULL,
    team_id             VARCHAR(36)      NULL,
    title               NVARCHAR(500)    NOT NULL,
    description         NVARCHAR(4000)   NULL,
    task_type           VARCHAR(50)      NOT NULL CONSTRAINT DF_Tasks_TaskType DEFAULT 'AD_HOC',
    source              VARCHAR(20)      NOT NULL CONSTRAINT DF_Tasks_Source DEFAULT 'SELF_LOGGED',
    status              VARCHAR(30)      NOT NULL CONSTRAINT DF_Tasks_Status DEFAULT 'OPEN',
    progress_override   INT              NULL,
    due_date            DATETIME2(3)     NULL,
    kpi_definition_id   VARCHAR(36)      NULL,
    created_by          VARCHAR(36)      NOT NULL,
    completed_at        DATETIME2(3)     NULL,
    created_at          DATETIME2(3)     NOT NULL,
    updated_at          DATETIME2(3)     NOT NULL,
    CONSTRAINT PK_Tasks PRIMARY KEY (id),
    CONSTRAINT FK_Tasks_Tenant FOREIGN KEY (tenant_id) REFERENCES Tenants(id),
    CONSTRAINT FK_Tasks_Team   FOREIGN KEY (team_id)   REFERENCES Teams(id),
    CONSTRAINT FK_Tasks_CreatedBy FOREIGN KEY (created_by) REFERENCES Users(id),
    CONSTRAINT CK_Tasks_TaskType CHECK (task_type IN (
        'MAINTENANCE', 'DR_BCP', 'CHANGE_REQUEST', 'DOCUMENTATION', 'TRAINING', 'AD_HOC'
    )),
    CONSTRAINT CK_Tasks_Source CHECK (source IN ('LEAD_ASSIGNED', 'SELF_LOGGED')),
    CONSTRAINT CK_Tasks_Status CHECK (status IN ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT CK_Tasks_Progress CHECK (progress_override IS NULL OR (progress_override BETWEEN 0 AND 100))
);
GO
CREATE INDEX IX_Tasks_Tenant     ON Tasks (tenant_id);
CREATE INDEX IX_Tasks_TenantTeam ON Tasks (tenant_id, team_id);
CREATE INDEX IX_Tasks_CreatedBy  ON Tasks (created_by);
GO
CREATE TABLE Task_Assignments (
    id           VARCHAR(36)  NOT NULL,
    tenant_id    VARCHAR(36)  NOT NULL,
    task_id      VARCHAR(36)  NOT NULL,
    assignee_id  VARCHAR(36)  NOT NULL,
    is_completed BIT          NOT NULL CONSTRAINT DF_TaskAssignments_IsCompleted DEFAULT 0,
    completed_at DATETIME2(3) NULL,
    assigned_at  DATETIME2(3) NOT NULL,
    CONSTRAINT PK_TaskAssignments PRIMARY KEY (id),
    CONSTRAINT FK_TaskAssignments_Tenant   FOREIGN KEY (tenant_id)   REFERENCES Tenants(id),
    CONSTRAINT FK_TaskAssignments_Task     FOREIGN KEY (task_id)     REFERENCES Tasks(id),
    CONSTRAINT FK_TaskAssignments_Assignee FOREIGN KEY (assignee_id) REFERENCES Users(id),
    CONSTRAINT UX_TaskAssignments_TaskAssignee UNIQUE (task_id, assignee_id)
);
GO
CREATE INDEX IX_TaskAssignments_Task     ON Task_Assignments (task_id);
CREATE INDEX IX_TaskAssignments_Assignee ON Task_Assignments (tenant_id, assignee_id);
GO
CREATE TABLE Task_Checklist_Items (
    id           VARCHAR(36)   NOT NULL,
    tenant_id    VARCHAR(36)   NOT NULL,
    task_id      VARCHAR(36)   NOT NULL,
    label        NVARCHAR(500) NOT NULL,
    sort_order   INT           NOT NULL CONSTRAINT DF_TaskChecklistItems_SortOrder DEFAULT 0,
    is_completed BIT           NOT NULL CONSTRAINT DF_TaskChecklistItems_IsCompleted DEFAULT 0,
    completed_at DATETIME2(3)  NULL,
    created_at   DATETIME2(3)  NOT NULL,
    CONSTRAINT PK_TaskChecklistItems PRIMARY KEY (id),
    CONSTRAINT FK_TaskChecklistItems_Tenant FOREIGN KEY (tenant_id) REFERENCES Tenants(id),
    CONSTRAINT FK_TaskChecklistItems_Task   FOREIGN KEY (task_id)   REFERENCES Tasks(id)
);
GO
CREATE INDEX IX_TaskChecklistItems_Task      ON Task_Checklist_Items (task_id);
CREATE INDEX IX_TaskChecklistItems_TaskOrder ON Task_Checklist_Items (task_id, sort_order);
`,
  },
  {
    name: '0005_kpi_engine.sql',
    sql: `
CREATE TABLE KPI_Definitions (
    id               VARCHAR(36)      NOT NULL,
    tenant_id        VARCHAR(36)      NOT NULL,
    name             NVARCHAR(200)    NOT NULL,
    description      NVARCHAR(2000)   NULL,
    metric_type      VARCHAR(30)      NOT NULL CONSTRAINT DF_KpiDefs_MetricType   DEFAULT 'PERCENTAGE',
    direction        VARCHAR(20)      NOT NULL CONSTRAINT DF_KpiDefs_Direction    DEFAULT 'HIGHER_BETTER',
    scope            VARCHAR(20)      NOT NULL CONSTRAINT DF_KpiDefs_Scope        DEFAULT 'INDIVIDUAL',
    default_target   DECIMAL(10,2)    NOT NULL,
    weight           DECIMAL(5,2)     NOT NULL CONSTRAINT DF_KpiDefs_Weight       DEFAULT 0,
    status           VARCHAR(20)      NOT NULL CONSTRAINT DF_KpiDefs_Status       DEFAULT 'DRAFT',
    created_at       DATETIME2(3)     NOT NULL,
    updated_at       DATETIME2(3)     NOT NULL,
    CONSTRAINT PK_KpiDefinitions PRIMARY KEY (id),
    CONSTRAINT FK_KpiDefs_Tenant  FOREIGN KEY (tenant_id) REFERENCES Tenants(id),
    CONSTRAINT CK_KpiDefs_MetricType CHECK (metric_type IN ('PERCENTAGE', 'TIME_HOURS', 'TIME_MINUTES', 'COUNT', 'SCORE')),
    CONSTRAINT CK_KpiDefs_Direction CHECK (direction IN ('HIGHER_BETTER', 'LOWER_BETTER')),
    CONSTRAINT CK_KpiDefs_Scope     CHECK (scope IN ('ORG', 'TEAM', 'INDIVIDUAL')),
    CONSTRAINT CK_KpiDefs_Status    CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED'))
);
GO
CREATE INDEX IX_KpiDefs_Tenant       ON KPI_Definitions (tenant_id);
CREATE INDEX IX_KpiDefs_TenantStatus ON KPI_Definitions (tenant_id, status);
GO
CREATE TABLE KPI_Team_Targets (
    id                  VARCHAR(36)   NOT NULL,
    tenant_id           VARCHAR(36)   NOT NULL,
    kpi_definition_id   VARCHAR(36)   NOT NULL,
    team_id             VARCHAR(36)   NOT NULL,
    target_value        DECIMAL(10,2) NOT NULL,
    CONSTRAINT PK_KpiTeamTargets           PRIMARY KEY (id),
    CONSTRAINT FK_KpiTeamTargets_Tenant    FOREIGN KEY (tenant_id)         REFERENCES Tenants(id),
    CONSTRAINT FK_KpiTeamTargets_KpiDef    FOREIGN KEY (kpi_definition_id) REFERENCES KPI_Definitions(id),
    CONSTRAINT FK_KpiTeamTargets_Team      FOREIGN KEY (team_id)           REFERENCES Teams(id),
    CONSTRAINT UQ_KpiTeamTargets_DefTeam   UNIQUE (kpi_definition_id, team_id)
);
GO
CREATE INDEX IX_KpiTeamTargets_Tenant  ON KPI_Team_Targets (tenant_id);
CREATE INDEX IX_KpiTeamTargets_DefTeam ON KPI_Team_Targets (kpi_definition_id, team_id);
GO
CREATE TABLE KPI_Engineer_Assignments (
    id                  VARCHAR(36)   NOT NULL,
    tenant_id           VARCHAR(36)   NOT NULL,
    engineer_id         VARCHAR(36)   NOT NULL,
    kpi_definition_id   VARCHAR(36)   NOT NULL,
    period_key          VARCHAR(20)   NOT NULL,
    measurement_period  VARCHAR(20)   NOT NULL CONSTRAINT DF_KpiEngAssign_MeasurePeriod DEFAULT 'MONTHLY',
    target_override     DECIMAL(10,2) NULL,
    assigned_by         VARCHAR(36)   NOT NULL,
    created_at          DATETIME2(3)  NOT NULL,
    CONSTRAINT PK_KpiEngAssignments       PRIMARY KEY (id),
    CONSTRAINT FK_KpiEngAssign_Tenant     FOREIGN KEY (tenant_id)         REFERENCES Tenants(id),
    CONSTRAINT FK_KpiEngAssign_Engineer   FOREIGN KEY (engineer_id)       REFERENCES Users(id),
    CONSTRAINT FK_KpiEngAssign_KpiDef     FOREIGN KEY (kpi_definition_id) REFERENCES KPI_Definitions(id),
    CONSTRAINT FK_KpiEngAssign_AssignedBy FOREIGN KEY (assigned_by)       REFERENCES Users(id),
    CONSTRAINT CK_KpiEngAssign_MeasurePeriod CHECK (measurement_period IN ('MONTHLY', 'QUARTERLY', 'ANNUALLY'))
);
GO
CREATE INDEX IX_KpiEngAssign_Tenant         ON KPI_Engineer_Assignments (tenant_id);
CREATE INDEX IX_KpiEngAssign_EngineerPeriod ON KPI_Engineer_Assignments (engineer_id, period_key);
CREATE INDEX IX_KpiEngAssign_DefPeriod      ON KPI_Engineer_Assignments (kpi_definition_id, period_key);
GO
CREATE TABLE KPI_Agreements (
    id           VARCHAR(36)  NOT NULL,
    tenant_id    VARCHAR(36)  NOT NULL,
    engineer_id  VARCHAR(36)  NOT NULL,
    lead_id      VARCHAR(36)  NOT NULL,
    period_key   VARCHAR(20)  NOT NULL,
    status       VARCHAR(20)  NOT NULL CONSTRAINT DF_KpiAgreements_Status DEFAULT 'DRAFT',
    submitted_at DATETIME2(3) NULL,
    accepted_at  DATETIME2(3) NULL,
    closed_at    DATETIME2(3) NULL,
    created_at   DATETIME2(3) NOT NULL,
    updated_at   DATETIME2(3) NOT NULL,
    CONSTRAINT PK_KpiAgreements         PRIMARY KEY (id),
    CONSTRAINT FK_KpiAgreements_Tenant  FOREIGN KEY (tenant_id)   REFERENCES Tenants(id),
    CONSTRAINT FK_KpiAgreements_Eng     FOREIGN KEY (engineer_id) REFERENCES Users(id),
    CONSTRAINT FK_KpiAgreements_Lead    FOREIGN KEY (lead_id)     REFERENCES Users(id),
    CONSTRAINT CK_KpiAgreements_Status CHECK (status IN ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'CLOSED'))
);
GO
CREATE INDEX IX_KpiAgreements_Tenant         ON KPI_Agreements (tenant_id);
CREATE INDEX IX_KpiAgreements_EngineerPeriod ON KPI_Agreements (engineer_id, period_key);
GO
CREATE TABLE KPI_Agreement_Areas (
    id           VARCHAR(36)   NOT NULL,
    tenant_id    VARCHAR(36)   NOT NULL,
    agreement_id VARCHAR(36)   NOT NULL,
    name         NVARCHAR(200) NOT NULL,
    weight       DECIMAL(5,2)  NOT NULL,
    sort_order   INT           NOT NULL CONSTRAINT DF_KpiAgreementAreas_SortOrder DEFAULT 0,
    CONSTRAINT PK_KpiAgreementAreas           PRIMARY KEY (id),
    CONSTRAINT FK_KpiAgreementAreas_Tenant    FOREIGN KEY (tenant_id)    REFERENCES Tenants(id),
    CONSTRAINT FK_KpiAgreementAreas_Agreement FOREIGN KEY (agreement_id) REFERENCES KPI_Agreements(id)
);
GO
CREATE INDEX IX_KpiAgreementAreas_Agreement ON KPI_Agreement_Areas (agreement_id);
GO
CREATE TABLE KPI_Agreement_Metrics (
    id                  VARCHAR(36)    NOT NULL,
    tenant_id           VARCHAR(36)    NOT NULL,
    area_id             VARCHAR(36)    NOT NULL,
    kpi_definition_id   VARCHAR(36)    NULL,
    description         NVARCHAR(2000) NOT NULL,
    measurement_period  VARCHAR(20)    NOT NULL CONSTRAINT DF_KpiAgreMetrics_MeasurePeriod DEFAULT 'MONTHLY',
    weight              DECIMAL(5,2)   NOT NULL,
    target_score        DECIMAL(10,2)  NOT NULL,
    actual_score        DECIMAL(10,2)  NULL,
    sort_order          INT            NOT NULL CONSTRAINT DF_KpiAgreMetrics_SortOrder DEFAULT 0,
    CONSTRAINT PK_KpiAgreementMetrics    PRIMARY KEY (id),
    CONSTRAINT FK_KpiAgreMetrics_Tenant  FOREIGN KEY (tenant_id)         REFERENCES Tenants(id),
    CONSTRAINT FK_KpiAgreMetrics_Area    FOREIGN KEY (area_id)           REFERENCES KPI_Agreement_Areas(id),
    CONSTRAINT FK_KpiAgreMetrics_KpiDef  FOREIGN KEY (kpi_definition_id) REFERENCES KPI_Definitions(id),
    CONSTRAINT CK_KpiAgreMetrics_MeasurePeriod CHECK (measurement_period IN ('MONTHLY', 'QUARTERLY', 'ANNUALLY'))
);
GO
CREATE INDEX IX_KpiAgreemetrics_Area       ON KPI_Agreement_Metrics (area_id);
CREATE INDEX IX_KpiAgreemetrics_Definition ON KPI_Agreement_Metrics (kpi_definition_id);
GO
CREATE TABLE KPI_Actuals (
    id                VARCHAR(36)    NOT NULL,
    tenant_id         VARCHAR(36)    NOT NULL,
    engineer_id       VARCHAR(36)    NOT NULL,
    metric_id         VARCHAR(36)    NOT NULL,
    kpi_definition_id VARCHAR(36)    NULL,
    value             DECIMAL(10,2)  NOT NULL,
    source            VARCHAR(30)    NOT NULL CONSTRAINT DF_KpiActuals_Source DEFAULT 'MANUAL',
    source_ref_id     VARCHAR(36)    NULL,
    note              NVARCHAR(1000) NULL,
    recorded_at       DATETIME2(3)   NOT NULL,
    CONSTRAINT PK_KpiActuals            PRIMARY KEY (id),
    CONSTRAINT FK_KpiActuals_Tenant     FOREIGN KEY (tenant_id)         REFERENCES Tenants(id),
    CONSTRAINT FK_KpiActuals_Engineer   FOREIGN KEY (engineer_id)       REFERENCES Users(id),
    CONSTRAINT FK_KpiActuals_Metric     FOREIGN KEY (metric_id)         REFERENCES KPI_Agreement_Metrics(id),
    CONSTRAINT FK_KpiActuals_KpiDef     FOREIGN KEY (kpi_definition_id) REFERENCES KPI_Definitions(id),
    CONSTRAINT CK_KpiActuals_Source CHECK (source IN ('TICKET_RESOLVE', 'TASK_COMPLETE', 'MANUAL'))
);
GO
CREATE INDEX IX_KpiActuals_Tenant   ON KPI_Actuals (tenant_id);
CREATE INDEX IX_KpiActuals_Engineer ON KPI_Actuals (engineer_id);
CREATE INDEX IX_KpiActuals_Metric   ON KPI_Actuals (metric_id);
GO
CREATE TABLE KPI_Results (
    id               VARCHAR(36)   NOT NULL,
    tenant_id        VARCHAR(36)   NOT NULL,
    engineer_id      VARCHAR(36)   NOT NULL,
    agreement_id     VARCHAR(36)   NOT NULL,
    period_key       VARCHAR(20)   NOT NULL,
    area_scores_json VARCHAR(4000) NULL,
    overall_score    DECIMAL(5,2)  NOT NULL,
    computed_at      DATETIME2(3)  NOT NULL,
    CONSTRAINT PK_KpiResults             PRIMARY KEY (id),
    CONSTRAINT FK_KpiResults_Tenant      FOREIGN KEY (tenant_id)    REFERENCES Tenants(id),
    CONSTRAINT FK_KpiResults_Engineer    FOREIGN KEY (engineer_id)  REFERENCES Users(id),
    CONSTRAINT FK_KpiResults_Agreement   FOREIGN KEY (agreement_id) REFERENCES KPI_Agreements(id)
);
GO
CREATE INDEX IX_KpiResults_Tenant         ON KPI_Results (tenant_id);
CREATE INDEX IX_KpiResults_EngineerPeriod ON KPI_Results (engineer_id, period_key);
CREATE INDEX IX_KpiResults_Agreement      ON KPI_Results (agreement_id);
`,
  },
  {
    name: '0006_team_access_grants.sql',
    sql: `
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
`,
  },
  {
    name: '0007_ticket_intake.sql',
    sql: `
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Tickets') AND name = 'requester_email'
)
BEGIN
  ALTER TABLE Tickets ADD requester_email VARCHAR(255) NULL;
END
GO
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Tickets') AND name = 'requester_name'
)
BEGIN
  ALTER TABLE Tickets ADD requester_name NVARCHAR(255) NULL;
END
GO
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
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Tickets') AND name = 'related_ticket_id'
)
BEGIN
  ALTER TABLE Tickets ADD related_ticket_id VARCHAR(36) NULL
    REFERENCES Tickets(id);
END
GO
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
`,
  },
  {
    name: '0008_sla_prediction.sql',
    sql: `
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
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE object_id = OBJECT_ID('Tickets') AND name = 'idx_tickets_sla_warning'
)
BEGIN
  CREATE INDEX idx_tickets_sla_warning
    ON Tickets (tenant_id, sla_warning_level)
    WHERE sla_warning_level IN ('AMBER', 'RED');
END
`,
  },
  {
    name: '0009_onboarding_state.sql',
    sql: `
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Tenants') AND name = 'onboarding_completed_at'
)
BEGIN
  ALTER TABLE Tenants ADD onboarding_completed_at DATETIME2(3) NULL;
END
`,
  },
];

@Injectable()
export class MigrationService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MigrationService.name);

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.runMigrations();
    } catch (err) {
      this.logger.error(`Migration run failed: ${(err as Error).message}`);
      throw err;
    }
  }

  private async runMigrations(): Promise<void> {
    this.logger.log('Running MSSQL migrations...');

    // Ensure the target database exists (fresh server starts with only system DBs)
    await ensureMssqlDatabase();

    const pool = await getMssqlPool();

    // Ensure tracking table exists
    await pool.request().query(`
      IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = '__migrations')
      CREATE TABLE __migrations (
        name       VARCHAR(255) NOT NULL PRIMARY KEY,
        applied_at DATETIME2(3) NOT NULL DEFAULT GETUTCDATE()
      )
    `);

    let applied = 0;
    let skipped = 0;

    for (const migration of MIGRATIONS) {
      const check = await pool
        .request()
        .input('name', migration.name)
        .query('SELECT 1 AS found FROM __migrations WHERE name = @name');

      if (check.recordset.length > 0) {
        skipped++;
        continue;
      }

      this.logger.log(`Applying ${migration.name}...`);

      // Split on GO (T-SQL batch separator) and run each batch
      const batches = migration.sql
        .split(/^\s*GO\s*$/im)
        .map((b) => b.trim())
        .filter(Boolean);

      for (const batch of batches) {
        await pool.request().query(batch);
      }

      await pool
        .request()
        .input('name', migration.name)
        .query('INSERT INTO __migrations (name) VALUES (@name)');

      this.logger.log(`Applied ${migration.name}`);
      applied++;
    }

    this.logger.log(
      `Migrations complete — ${applied} applied, ${skipped} already up to date`,
    );
  }
}
