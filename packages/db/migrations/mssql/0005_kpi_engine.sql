-- ============================================================
-- Migration: 0005_kpi_engine.sql
-- Sprint 8–10 — KPI Engine
-- Tables:
--   KPI_Definitions
--   KPI_Team_Targets
--   KPI_Engineer_Assignments
--   KPI_Agreements
--   KPI_Agreement_Areas
--   KPI_Agreement_Metrics
--   KPI_Actuals
--   KPI_Results
-- ============================================================

-- ── KPI_Definitions ──────────────────────────────────────────────────────

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

    CONSTRAINT CK_KpiDefs_MetricType CHECK (metric_type IN (
        'PERCENTAGE', 'TIME_HOURS', 'TIME_MINUTES', 'COUNT', 'SCORE'
    )),
    CONSTRAINT CK_KpiDefs_Direction CHECK (direction IN ('HIGHER_BETTER', 'LOWER_BETTER')),
    CONSTRAINT CK_KpiDefs_Scope     CHECK (scope IN ('ORG', 'TEAM', 'INDIVIDUAL')),
    CONSTRAINT CK_KpiDefs_Status    CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED'))
);

CREATE INDEX IX_KpiDefs_Tenant       ON KPI_Definitions (tenant_id);
CREATE INDEX IX_KpiDefs_TenantStatus ON KPI_Definitions (tenant_id, status);

-- ── KPI_Team_Targets ─────────────────────────────────────────────────────

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

CREATE INDEX IX_KpiTeamTargets_Tenant  ON KPI_Team_Targets (tenant_id);
CREATE INDEX IX_KpiTeamTargets_DefTeam ON KPI_Team_Targets (kpi_definition_id, team_id);

-- ── KPI_Engineer_Assignments ─────────────────────────────────────────────

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

    CONSTRAINT PK_KpiEngAssignments            PRIMARY KEY (id),
    CONSTRAINT FK_KpiEngAssign_Tenant          FOREIGN KEY (tenant_id)         REFERENCES Tenants(id),
    CONSTRAINT FK_KpiEngAssign_Engineer        FOREIGN KEY (engineer_id)       REFERENCES Users(id),
    CONSTRAINT FK_KpiEngAssign_KpiDef          FOREIGN KEY (kpi_definition_id) REFERENCES KPI_Definitions(id),
    CONSTRAINT FK_KpiEngAssign_AssignedBy      FOREIGN KEY (assigned_by)       REFERENCES Users(id),

    CONSTRAINT CK_KpiEngAssign_MeasurePeriod CHECK (
        measurement_period IN ('MONTHLY', 'QUARTERLY', 'ANNUALLY')
    )
);

CREATE INDEX IX_KpiEngAssign_Tenant         ON KPI_Engineer_Assignments (tenant_id);
CREATE INDEX IX_KpiEngAssign_EngineerPeriod ON KPI_Engineer_Assignments (engineer_id, period_key);
CREATE INDEX IX_KpiEngAssign_DefPeriod      ON KPI_Engineer_Assignments (kpi_definition_id, period_key);

-- ── KPI_Agreements ───────────────────────────────────────────────────────

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

    CONSTRAINT CK_KpiAgreements_Status CHECK (
        status IN ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'CLOSED')
    )
);

CREATE INDEX IX_KpiAgreements_Tenant         ON KPI_Agreements (tenant_id);
CREATE INDEX IX_KpiAgreements_EngineerPeriod ON KPI_Agreements (engineer_id, period_key);

-- ── KPI_Agreement_Areas ──────────────────────────────────────────────────

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

CREATE INDEX IX_KpiAgreementAreas_Agreement ON KPI_Agreement_Areas (agreement_id);

-- ── KPI_Agreement_Metrics ────────────────────────────────────────────────

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

    CONSTRAINT PK_KpiAgreementMetrics           PRIMARY KEY (id),
    CONSTRAINT FK_KpiAgreMetrics_Tenant         FOREIGN KEY (tenant_id)         REFERENCES Tenants(id),
    CONSTRAINT FK_KpiAgreMetrics_Area           FOREIGN KEY (area_id)           REFERENCES KPI_Agreement_Areas(id),
    CONSTRAINT FK_KpiAgreMetrics_KpiDef         FOREIGN KEY (kpi_definition_id) REFERENCES KPI_Definitions(id),

    CONSTRAINT CK_KpiAgreMetrics_MeasurePeriod CHECK (
        measurement_period IN ('MONTHLY', 'QUARTERLY', 'ANNUALLY')
    )
);

CREATE INDEX IX_KpiAgreemetrics_Area       ON KPI_Agreement_Metrics (area_id);
CREATE INDEX IX_KpiAgreemetrics_Definition ON KPI_Agreement_Metrics (kpi_definition_id);

-- ── KPI_Actuals ──────────────────────────────────────────────────────────

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

    CONSTRAINT CK_KpiActuals_Source CHECK (
        source IN ('TICKET_RESOLVE', 'TASK_COMPLETE', 'MANUAL')
    )
);

CREATE INDEX IX_KpiActuals_Tenant   ON KPI_Actuals (tenant_id);
CREATE INDEX IX_KpiActuals_Engineer ON KPI_Actuals (engineer_id);
CREATE INDEX IX_KpiActuals_Metric   ON KPI_Actuals (metric_id);

-- ── KPI_Results ──────────────────────────────────────────────────────────

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
    CONSTRAINT FK_KpiResults_Tenant      FOREIGN KEY (tenant_id)   REFERENCES Tenants(id),
    CONSTRAINT FK_KpiResults_Engineer    FOREIGN KEY (engineer_id) REFERENCES Users(id),
    CONSTRAINT FK_KpiResults_Agreement   FOREIGN KEY (agreement_id) REFERENCES KPI_Agreements(id)
);

CREATE INDEX IX_KpiResults_Tenant         ON KPI_Results (tenant_id);
CREATE INDEX IX_KpiResults_EngineerPeriod ON KPI_Results (engineer_id, period_key);
CREATE INDEX IX_KpiResults_Agreement      ON KPI_Results (agreement_id);
