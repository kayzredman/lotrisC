-- ============================================================
-- Lotris — Migration 0002: Ticket Core
-- Sprint 3–4
-- ============================================================

-- ── Tickets ───────────────────────────────────────────────────────────────
CREATE TABLE dbo.Tickets (
    id                      VARCHAR(36)       NOT NULL,
    tenant_id               VARCHAR(36)       NOT NULL,
    title                   NVARCHAR(500)     NOT NULL,
    description             NVARCHAR(4000)    NOT NULL,
    -- priority: 1=CRITICAL 2=HIGH 3=MEDIUM 4=LOW
    priority                INT               NOT NULL DEFAULT 2,
    -- status: NEW | TEAM_ASSIGNED | UNASSIGNED | ASSIGNED | IN_PROGRESS | ESCALATED | RESOLVED | CLOSED
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

CREATE INDEX idx_tickets_tenant          ON dbo.Tickets (tenant_id);
CREATE INDEX idx_tickets_tenant_status   ON dbo.Tickets (tenant_id, status);
CREATE INDEX idx_tickets_tenant_team     ON dbo.Tickets (tenant_id, team_id);
CREATE INDEX idx_tickets_tenant_assignee ON dbo.Tickets (tenant_id, assignee_id);
-- Queue ordering: priority ASC (1=highest), sla_resolution_deadline ASC
CREATE INDEX idx_tickets_queue           ON dbo.Tickets (tenant_id, priority ASC, sla_resolution_deadline ASC);

-- ── Ticket_Comments ───────────────────────────────────────────────────────
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

CREATE INDEX idx_ticket_comments_ticket        ON dbo.Ticket_Comments (ticket_id);
CREATE INDEX idx_ticket_comments_tenant_ticket ON dbo.Ticket_Comments (tenant_id, ticket_id);

-- ── Ticket_History ────────────────────────────────────────────────────────
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

CREATE INDEX idx_ticket_history_ticket         ON dbo.Ticket_History (ticket_id);
CREATE INDEX idx_ticket_history_tenant_ticket  ON dbo.Ticket_History (tenant_id, ticket_id);
CREATE INDEX idx_ticket_history_tenant_created ON dbo.Ticket_History (tenant_id, created_at);

-- ── SLA_Configs ───────────────────────────────────────────────────────────
-- team_id NULL = tenant-level default; team_id set = team override
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

CREATE INDEX idx_sla_configs_tenant      ON dbo.SLA_Configs (tenant_id);
CREATE INDEX idx_sla_configs_tenant_team ON dbo.SLA_Configs (tenant_id, team_id);

-- ── Attachment_Refs ───────────────────────────────────────────────────────
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

CREATE INDEX idx_attachment_refs_ticket        ON dbo.Attachment_Refs (ticket_id);
CREATE INDEX idx_attachment_refs_tenant_ticket ON dbo.Attachment_Refs (tenant_id, ticket_id);
