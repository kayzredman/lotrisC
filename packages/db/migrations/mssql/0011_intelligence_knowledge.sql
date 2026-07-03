-- Phase 8b-d: Knowledge indexing, intelligence config, usage ledger

-- ── Tenant intelligence / copilot config ───────────────────
CREATE TABLE Tenant_Intelligence_Config (
  tenant_id                      VARCHAR(36)   NOT NULL PRIMARY KEY REFERENCES Tenants(id),
  provider_path                  VARCHAR(20)   NOT NULL DEFAULT 'DISABLED',
  entra_tenant_id                NVARCHAR(100) NULL,
  entra_connected_at             DATETIME2(3)  NULL,
  entra_connected_by_id          VARCHAR(36)   NULL REFERENCES Users(id),
  azure_openai_endpoint          NVARCHAR(500) NULL,
  azure_openai_deployment_chat   NVARCHAR(100) NULL,
  azure_openai_deployment_embed  NVARCHAR(100) NULL,
  azure_openai_api_key           NVARCHAR(MAX) NULL,
  feature_rca_suggest            BIT           NOT NULL DEFAULT 0,
  feature_knowledge_copilot      BIT           NOT NULL DEFAULT 0,
  feature_report_narrative       BIT           NOT NULL DEFAULT 0,
  teams_enabled                  BIT           NOT NULL DEFAULT 0,
  teams_webhook_url              NVARCHAR(1000) NULL,
  monthly_query_quota            INT           NOT NULL DEFAULT 500,
  updated_at                     DATETIME2(3)  NOT NULL
);

-- ── Usage metering (audit + quotas) ────────────────────────
CREATE TABLE Intelligence_Usage_Ledger (
  id            VARCHAR(36)   NOT NULL PRIMARY KEY,
  tenant_id     VARCHAR(36)   NOT NULL REFERENCES Tenants(id),
  user_id       VARCHAR(36)   NULL REFERENCES Users(id),
  feature       VARCHAR(50)   NOT NULL,
  provider      VARCHAR(30)   NOT NULL,
  tokens_in     INT           NOT NULL DEFAULT 0,
  tokens_out    INT           NOT NULL DEFAULT 0,
  created_at    DATETIME2(3)  NOT NULL
);
CREATE INDEX idx_intel_usage_tenant_month ON Intelligence_Usage_Ledger (tenant_id, created_at);

-- ── Knowledge schema (metadata; vectors in chunk row or Qdrant id) ──
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'knowledge')
  EXEC('CREATE SCHEMA knowledge');

CREATE TABLE knowledge.Knowledge_Articles (
  id            VARCHAR(36)   NOT NULL PRIMARY KEY,
  tenant_id     VARCHAR(36)   NOT NULL REFERENCES Tenants(id),
  source_type   VARCHAR(30)   NOT NULL,
  source_id     VARCHAR(36)   NOT NULL,
  title         NVARCHAR(500) NOT NULL,
  body_markdown NVARCHAR(MAX) NULL,
  tags          NVARCHAR(500) NULL,
  status        VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',
  published_at  DATETIME2(3)  NOT NULL,
  updated_at    DATETIME2(3)  NOT NULL
);
CREATE INDEX idx_knowledge_articles_tenant ON knowledge.Knowledge_Articles (tenant_id, status);
CREATE UNIQUE INDEX idx_knowledge_articles_source ON knowledge.Knowledge_Articles (tenant_id, source_type, source_id);

CREATE TABLE knowledge.Knowledge_Chunks (
  id              VARCHAR(36)   NOT NULL PRIMARY KEY,
  tenant_id       VARCHAR(36)   NOT NULL REFERENCES Tenants(id),
  article_id      VARCHAR(36)   NOT NULL REFERENCES knowledge.Knowledge_Articles(id),
  chunk_index     INT           NOT NULL,
  chunk_text      NVARCHAR(MAX) NOT NULL,
  token_count     INT           NOT NULL DEFAULT 0,
  embedding_json  NVARCHAR(MAX) NULL,
  vector_id       VARCHAR(100)  NULL,
  acl_json        NVARCHAR(500) NULL,
  created_at      DATETIME2(3)  NOT NULL
);
CREATE INDEX idx_knowledge_chunks_article ON knowledge.Knowledge_Chunks (article_id);
CREATE INDEX idx_knowledge_chunks_tenant ON knowledge.Knowledge_Chunks (tenant_id);

CREATE TABLE knowledge.Knowledge_Index_Runs (
  id            VARCHAR(36)   NOT NULL PRIMARY KEY,
  tenant_id     VARCHAR(36)   NOT NULL REFERENCES Tenants(id),
  source_type   VARCHAR(30)   NOT NULL,
  source_id     VARCHAR(36)   NOT NULL,
  status        VARCHAR(20)   NOT NULL,
  chunk_count   INT           NOT NULL DEFAULT 0,
  error_message NVARCHAR(1000) NULL,
  started_at    DATETIME2(3)  NOT NULL,
  completed_at  DATETIME2(3)  NULL
);
