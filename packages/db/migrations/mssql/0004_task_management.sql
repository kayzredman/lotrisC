-- ============================================================
-- Migration: 0004_task_management.sql
-- Sprint 7 — Task Management
-- Tables: Tasks, Task_Assignments, Task_Checklist_Items
-- ============================================================

-- ── Tasks ─────────────────────────────────────────────────────────────────

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

CREATE INDEX IX_Tasks_Tenant     ON Tasks (tenant_id);
CREATE INDEX IX_Tasks_TenantTeam ON Tasks (tenant_id, team_id);
CREATE INDEX IX_Tasks_CreatedBy  ON Tasks (created_by);

-- ── Task_Assignments ──────────────────────────────────────────────────────

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

    -- One engineer assigned once per task
    CONSTRAINT UX_TaskAssignments_TaskAssignee UNIQUE (task_id, assignee_id)
);

CREATE INDEX IX_TaskAssignments_Task     ON Task_Assignments (task_id);
CREATE INDEX IX_TaskAssignments_Assignee ON Task_Assignments (tenant_id, assignee_id);

-- ── Task_Checklist_Items ──────────────────────────────────────────────────

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

CREATE INDEX IX_TaskChecklistItems_Task      ON Task_Checklist_Items (task_id);
CREATE INDEX IX_TaskChecklistItems_TaskOrder ON Task_Checklist_Items (task_id, sort_order);
