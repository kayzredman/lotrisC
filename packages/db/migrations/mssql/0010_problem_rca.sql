-- Phase 8a: Problem Management + RCA + CAPA + KEDB
-- ITIL-aligned problem records, brief root-cause form, P1 auto-trigger support

-- ── RCA categories (tenant taxonomy) ───────────────────────
CREATE TABLE RCA_Categories (
  id          VARCHAR(36)   NOT NULL PRIMARY KEY,
  tenant_id   VARCHAR(36)   NOT NULL REFERENCES Tenants(id),
  parent_id   VARCHAR(36)   NULL,
  name        NVARCHAR(100) NOT NULL,
  sort_order  INT           NOT NULL DEFAULT 0,
  is_active   BIT           NOT NULL DEFAULT 1
);
CREATE INDEX idx_rca_categories_tenant ON RCA_Categories (tenant_id);

-- ── Problem records (ITIL container) ───────────────────────
CREATE TABLE Problem_Records (
  id                VARCHAR(36)   NOT NULL PRIMARY KEY,
  tenant_id         VARCHAR(36)   NOT NULL REFERENCES Tenants(id),
  problem_ref       VARCHAR(20)   NOT NULL,
  title             NVARCHAR(500) NOT NULL,
  status            VARCHAR(30)   NOT NULL DEFAULT 'IDENTIFIED',
  priority          INT           NOT NULL DEFAULT 1,
  recurrence_count  INT           NOT NULL DEFAULT 1,
  category_id       VARCHAR(36)   NULL REFERENCES RCA_Categories(id),
  created_at        DATETIME2(3)  NOT NULL,
  updated_at        DATETIME2(3)  NOT NULL,
  closed_at         DATETIME2(3)  NULL
);
CREATE UNIQUE INDEX idx_problem_ref_tenant ON Problem_Records (tenant_id, problem_ref);
CREATE INDEX idx_problem_tenant_status ON Problem_Records (tenant_id, status);

-- ── RCA investigation documents ──────────────────────────────
CREATE TABLE RCA_Records (
  id                    VARCHAR(36)   NOT NULL PRIMARY KEY,
  tenant_id             VARCHAR(36)   NOT NULL REFERENCES Tenants(id),
  rca_ref               VARCHAR(20)   NOT NULL,
  problem_id            VARCHAR(36)   NOT NULL REFERENCES Problem_Records(id),
  status                VARCHAR(30)   NOT NULL DEFAULT 'DRAFT',
  incident_summary      NVARCHAR(4000) NULL,
  business_impact       NVARCHAR(2000) NULL,
  detection_method      NVARCHAR(500)  NULL,
  immediate_cause       NVARCHAR(2000) NULL,
  root_cause_statement  NVARCHAR(2000) NULL,
  contributing_factors  NVARCHAR(MAX)  NULL,
  resolution_summary    NVARCHAR(2000) NULL,
  lessons_learned       NVARCHAR(2000) NULL,
  category_id           VARCHAR(36)   NULL REFERENCES RCA_Categories(id),
  process_owner_id      VARCHAR(36)   NOT NULL REFERENCES Users(id),
  technical_owner_id    VARCHAR(36)   NOT NULL REFERENCES Users(id),
  delegate_id           VARCHAR(36)   NULL REFERENCES Users(id),
  review_due_at         DATETIME2(3)  NULL,
  published_at          DATETIME2(3)  NULL,
  created_at            DATETIME2(3)  NOT NULL,
  updated_at            DATETIME2(3)  NOT NULL
);
CREATE UNIQUE INDEX idx_rca_ref_tenant ON RCA_Records (tenant_id, rca_ref);
CREATE INDEX idx_rca_tenant_status ON RCA_Records (tenant_id, status);
CREATE INDEX idx_rca_problem ON RCA_Records (problem_id);

-- ── Ticket ↔ problem/RCA links ─────────────────────────────
CREATE TABLE RCA_Ticket_Links (
  id          VARCHAR(36)  NOT NULL PRIMARY KEY,
  tenant_id   VARCHAR(36)  NOT NULL REFERENCES Tenants(id),
  problem_id  VARCHAR(36)  NOT NULL REFERENCES Problem_Records(id),
  rca_id      VARCHAR(36)  NOT NULL REFERENCES RCA_Records(id),
  ticket_id   VARCHAR(36)  NOT NULL REFERENCES Tickets(id),
  link_type   VARCHAR(20)  NOT NULL DEFAULT 'PRIMARY',
  created_at  DATETIME2(3) NOT NULL,
  CONSTRAINT uq_rca_ticket_link UNIQUE (ticket_id, rca_id)
);
CREATE INDEX idx_rca_ticket_links_problem ON RCA_Ticket_Links (problem_id);

-- ── CAPA actions ───────────────────────────────────────────
CREATE TABLE RCA_Actions (
  id              VARCHAR(36)   NOT NULL PRIMARY KEY,
  tenant_id       VARCHAR(36)   NOT NULL REFERENCES Tenants(id),
  rca_id          VARCHAR(36)   NOT NULL REFERENCES RCA_Records(id),
  action_type     VARCHAR(20)   NOT NULL,
  description     NVARCHAR(2000) NOT NULL,
  owner_id        VARCHAR(36)   NOT NULL REFERENCES Users(id),
  due_at          DATETIME2(3)  NULL,
  status          VARCHAR(20)   NOT NULL DEFAULT 'OPEN',
  verified_at     DATETIME2(3)  NULL,
  verified_by_id  VARCHAR(36)   NULL REFERENCES Users(id),
  created_at      DATETIME2(3)  NOT NULL,
  updated_at      DATETIME2(3)  NOT NULL
);
CREATE INDEX idx_rca_actions_rca ON RCA_Actions (rca_id);
CREATE INDEX idx_rca_actions_due ON RCA_Actions (tenant_id, status, due_at);

-- ── Tenant RCA trigger rules ───────────────────────────────
CREATE TABLE RCA_Trigger_Rules (
  tenant_id              VARCHAR(36) NOT NULL PRIMARY KEY REFERENCES Tenants(id),
  auto_p1                BIT         NOT NULL DEFAULT 1,
  auto_p2                BIT         NOT NULL DEFAULT 0,
  auto_p2_sla_breach     BIT         NOT NULL DEFAULT 0,
  auto_security          BIT         NOT NULL DEFAULT 0,
  recurrence_threshold   INT         NOT NULL DEFAULT 3,
  recurrence_window_days INT         NOT NULL DEFAULT 90,
  rca_completion_days    INT         NOT NULL DEFAULT 5,
  updated_at             DATETIME2(3) NOT NULL
);

-- ── Known Error Database (published from RCA) ──────────────
CREATE TABLE Known_Errors (
  id                 VARCHAR(36)   NOT NULL PRIMARY KEY,
  tenant_id          VARCHAR(36)   NOT NULL REFERENCES Tenants(id),
  rca_id             VARCHAR(36)   NOT NULL REFERENCES RCA_Records(id),
  title              NVARCHAR(500) NOT NULL,
  error_description  NVARCHAR(2000) NOT NULL,
  workaround         NVARCHAR(2000) NULL,
  permanent_fix      NVARCHAR(2000) NULL,
  status             VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',
  published_at       DATETIME2(3)  NOT NULL
);
CREATE INDEX idx_known_errors_tenant ON Known_Errors (tenant_id, status);
