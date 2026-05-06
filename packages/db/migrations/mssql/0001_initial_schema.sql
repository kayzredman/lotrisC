-- ============================================================
-- 0001_initial_schema.sql
-- Lotris — Foundation: tenants, roles, teams, users, audit logs
-- Run via: pnpm db:migrate
-- ============================================================

-- ── Tenants ──────────────────────────────────────────────────
CREATE TABLE Tenants (
  id            VARCHAR(36)    NOT NULL PRIMARY KEY,
  clerk_org_id  VARCHAR(255)   NOT NULL UNIQUE,
  name          NVARCHAR(255)  NOT NULL,
  slug          VARCHAR(100)   NOT NULL UNIQUE,
  is_active     BIT            NOT NULL DEFAULT 1,
  created_at    DATETIME2(3)   NOT NULL DEFAULT GETUTCDATE(),
  updated_at    DATETIME2(3)   NOT NULL DEFAULT GETUTCDATE()
);

-- ── Roles (seeded, not tenant-scoped) ────────────────────────
CREATE TABLE Roles (
  id    INT          NOT NULL PRIMARY KEY IDENTITY(1,1),
  name  VARCHAR(50)  NOT NULL UNIQUE
  -- SUPERADMIN | ADMIN | IT_MANAGER | TEAM_LEAD | ENGINEER | EXECUTIVE
);

INSERT INTO Roles (name) VALUES
  ('SUPERADMIN'),
  ('ADMIN'),
  ('IT_MANAGER'),
  ('TEAM_LEAD'),
  ('ENGINEER'),
  ('EXECUTIVE');

-- ── Teams ────────────────────────────────────────────────────
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

CREATE INDEX idx_teams_tenant ON Teams (tenant_id);

-- ── Users ────────────────────────────────────────────────────
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

CREATE INDEX idx_users_tenant        ON Users (tenant_id);
CREATE INDEX idx_users_tenant_role   ON Users (tenant_id, role_id);
CREATE INDEX idx_users_tenant_team   ON Users (tenant_id, team_id);
CREATE INDEX idx_users_clerk         ON Users (clerk_user_id);

-- ── Audit Logs ───────────────────────────────────────────────
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

CREATE INDEX idx_audit_tenant         ON Audit_Logs (tenant_id);
CREATE INDEX idx_audit_tenant_created ON Audit_Logs (tenant_id, created_at);
