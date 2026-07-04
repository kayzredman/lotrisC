using Dapper;
using Lotris.Application.Intelligence;
using Lotris.Infrastructure.Data;

namespace Lotris.Infrastructure.Intelligence;

public sealed class DapperIntelligenceRepository : IIntelligenceRepository
{
    private readonly ISqlConnectionFactory _connections;

    public DapperIntelligenceRepository(ISqlConnectionFactory connections) => _connections = connections;

    public async Task<IntelligenceConfigEntity> GetOrCreateConfigAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        const string selectSql = """
            SELECT tenant_id AS TenantId, provider_path AS ProviderPath, entra_tenant_id AS EntraTenantId,
                   entra_connected_at AS EntraConnectedAt, entra_connected_by_id AS EntraConnectedById,
                   azure_openai_endpoint AS AzureOpenaiEndpoint, azure_openai_deployment_chat AS AzureOpenaiDeploymentChat,
                   azure_openai_deployment_embed AS AzureOpenaiDeploymentEmbed, azure_openai_api_key AS AzureOpenaiApiKey,
                   ai_username AS AiUsername, ai_connected_at AS AiConnectedAt, ai_connected_by_id AS AiConnectedById,
                   feature_rca_suggest AS FeatureRcaSuggest, feature_knowledge_copilot AS FeatureKnowledgeCopilot,
                   feature_report_narrative AS FeatureReportNarrative, teams_enabled AS TeamsEnabled,
                   teams_webhook_url AS TeamsWebhookUrl, monthly_query_quota AS MonthlyQueryQuota, updated_at AS UpdatedAt
            FROM dbo.Tenant_Intelligence_Config WHERE tenant_id = @TenantId
            """;

        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var row = await connection.QuerySingleOrDefaultAsync<ConfigRow>(
            new CommandDefinition(selectSql, new { TenantId = SqlGuid.ToSql(tenantId) }, cancellationToken: cancellationToken));

        if (row is not null)
        {
            return MapConfig(row);
        }

        const string insertSql = """
            INSERT INTO dbo.Tenant_Intelligence_Config (tenant_id, provider_path, updated_at)
            VALUES (@TenantId, 'DISABLED', @Now)
            """;
        await connection.ExecuteAsync(new CommandDefinition(insertSql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
            Now = DateTime.UtcNow,
        }, cancellationToken: cancellationToken));

        return new IntelligenceConfigEntity
        {
            TenantId = tenantId,
            ProviderPath = "DISABLED",
            MonthlyQueryQuota = 500,
            UpdatedAt = DateTime.UtcNow,
        };
    }

    public async Task SaveConfigAsync(IntelligenceConfigEntity config, CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE dbo.Tenant_Intelligence_Config SET
                provider_path = @ProviderPath, entra_tenant_id = @EntraTenantId,
                entra_connected_at = @EntraConnectedAt, entra_connected_by_id = @EntraConnectedById,
                azure_openai_endpoint = @AzureOpenaiEndpoint, azure_openai_deployment_chat = @AzureOpenaiDeploymentChat,
                azure_openai_deployment_embed = @AzureOpenaiDeploymentEmbed, azure_openai_api_key = @AzureOpenaiApiKey,
                ai_username = @AiUsername, ai_connected_at = @AiConnectedAt, ai_connected_by_id = @AiConnectedById,
                feature_rca_suggest = @FeatureRcaSuggest, feature_knowledge_copilot = @FeatureKnowledgeCopilot,
                feature_report_narrative = @FeatureReportNarrative, teams_enabled = @TeamsEnabled,
                teams_webhook_url = @TeamsWebhookUrl, monthly_query_quota = @MonthlyQueryQuota, updated_at = @UpdatedAt
            WHERE tenant_id = @TenantId
            """;
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(config.TenantId),
            config.ProviderPath,
            config.EntraTenantId,
            EntraConnectedAt = config.EntraConnectedAt,
            EntraConnectedById = config.EntraConnectedById.HasValue ? SqlGuid.ToSql(config.EntraConnectedById.Value) : null,
            config.AzureOpenaiEndpoint,
            config.AzureOpenaiDeploymentChat,
            config.AzureOpenaiDeploymentEmbed,
            config.AzureOpenaiApiKey,
            config.AiUsername,
            AiConnectedAt = config.AiConnectedAt,
            AiConnectedById = config.AiConnectedById.HasValue ? SqlGuid.ToSql(config.AiConnectedById.Value) : null,
            config.FeatureRcaSuggest,
            config.FeatureKnowledgeCopilot,
            config.FeatureReportNarrative,
            config.TeamsEnabled,
            config.TeamsWebhookUrl,
            config.MonthlyQueryQuota,
            UpdatedAt = config.UpdatedAt,
        }, cancellationToken: cancellationToken));
    }

    public async Task<int> CountQueriesThisMonthAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT COUNT(1) FROM dbo.Intelligence_Usage_Ledger
            WHERE tenant_id = @TenantId AND created_at >= DATEADD(month, DATEDIFF(month, 0, SYSUTCDATETIME()), 0)
            """;
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        return await connection.ExecuteScalarAsync<int>(
            new CommandDefinition(sql, new { TenantId = SqlGuid.ToSql(tenantId) }, cancellationToken: cancellationToken));
    }

    public async Task InsertUsageAsync(UsageLedgerEntry entry, CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO dbo.Intelligence_Usage_Ledger (id, tenant_id, user_id, feature, provider, tokens_in, tokens_out, created_at)
            VALUES (@Id, @TenantId, @UserId, @Feature, @Provider, @TokensIn, @TokensOut, @CreatedAt)
            """;
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            Id = SqlGuid.ToSql(entry.Id),
            TenantId = SqlGuid.ToSql(entry.TenantId),
            UserId = entry.UserId.HasValue ? SqlGuid.ToSql(entry.UserId.Value) : null,
            entry.Feature,
            entry.Provider,
            entry.TokensIn,
            entry.TokensOut,
            entry.CreatedAt,
        }, cancellationToken: cancellationToken));
    }

    public async Task<Guid> UpsertArticleAsync(KnowledgeArticleEntity article, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var existingId = await connection.ExecuteScalarAsync<string?>(new CommandDefinition(
            """
            SELECT id FROM knowledge.Knowledge_Articles
            WHERE tenant_id = @TenantId AND source_type = @SourceType AND source_id = @SourceId
            """,
            new
            {
                TenantId = SqlGuid.ToSql(article.TenantId),
                article.SourceType,
                SourceId = SqlGuid.ToSql(article.SourceId),
            },
            cancellationToken: cancellationToken));

        if (existingId is not null)
        {
            await connection.ExecuteAsync(new CommandDefinition(
                """
                UPDATE knowledge.Knowledge_Articles SET title = @Title, body_markdown = @BodyMarkdown,
                    tags = @Tags, status = @Status, updated_at = @UpdatedAt
                WHERE id = @Id
                """,
                new
                {
                    Id = existingId,
                    article.Title,
                    article.BodyMarkdown,
                    article.Tags,
                    article.Status,
                    article.UpdatedAt,
                },
                cancellationToken: cancellationToken));
            return SqlGuid.FromSql(existingId);
        }

        var id = article.Id == Guid.Empty ? Guid.NewGuid() : article.Id;
        await connection.ExecuteAsync(new CommandDefinition(
            """
            INSERT INTO knowledge.Knowledge_Articles (id, tenant_id, source_type, source_id, title, body_markdown, tags, status, published_at, updated_at)
            VALUES (@Id, @TenantId, @SourceType, @SourceId, @Title, @BodyMarkdown, @Tags, @Status, @PublishedAt, @UpdatedAt)
            """,
            new
            {
                Id = SqlGuid.ToSql(id),
                TenantId = SqlGuid.ToSql(article.TenantId),
                article.SourceType,
                SourceId = SqlGuid.ToSql(article.SourceId),
                article.Title,
                article.BodyMarkdown,
                article.Tags,
                article.Status,
                article.PublishedAt,
                article.UpdatedAt,
            },
            cancellationToken: cancellationToken));
        return id;
    }

    public async Task DeleteChunksForArticleAsync(Guid tenantId, Guid articleId, CancellationToken cancellationToken = default)
    {
        const string sql = "DELETE FROM knowledge.Knowledge_Chunks WHERE tenant_id = @TenantId AND article_id = @ArticleId";
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
            ArticleId = SqlGuid.ToSql(articleId),
        }, cancellationToken: cancellationToken));
    }

    public async Task InsertChunkAsync(KnowledgeChunkEntity chunk, CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO knowledge.Knowledge_Chunks (id, tenant_id, article_id, chunk_index, chunk_text, token_count, embedding_json, vector_id, acl_json, created_at)
            VALUES (@Id, @TenantId, @ArticleId, @ChunkIndex, @ChunkText, @TokenCount, @EmbeddingJson, @VectorId, @AclJson, @CreatedAt)
            """;
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            Id = SqlGuid.ToSql(chunk.Id),
            TenantId = SqlGuid.ToSql(chunk.TenantId),
            ArticleId = SqlGuid.ToSql(chunk.ArticleId),
            chunk.ChunkIndex,
            chunk.ChunkText,
            chunk.TokenCount,
            chunk.EmbeddingJson,
            chunk.VectorId,
            chunk.AclJson,
            chunk.CreatedAt,
        }, cancellationToken: cancellationToken));
    }

    public async Task<IReadOnlyList<KnowledgeChunkEntity>> ListChunksForTenantAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT id AS Id, tenant_id AS TenantId, article_id AS ArticleId, chunk_index AS ChunkIndex,
                   chunk_text AS ChunkText, token_count AS TokenCount, embedding_json AS EmbeddingJson,
                   vector_id AS VectorId, acl_json AS AclJson, created_at AS CreatedAt
            FROM knowledge.Knowledge_Chunks WHERE tenant_id = @TenantId
            """;
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<ChunkRow>(
            new CommandDefinition(sql, new { TenantId = SqlGuid.ToSql(tenantId) }, cancellationToken: cancellationToken));
        return rows.Select(r => new KnowledgeChunkEntity
        {
            Id = SqlGuid.FromSql(r.Id),
            TenantId = SqlGuid.FromSql(r.TenantId),
            ArticleId = SqlGuid.FromSql(r.ArticleId),
            ChunkIndex = r.ChunkIndex,
            ChunkText = r.ChunkText,
            TokenCount = r.TokenCount,
            EmbeddingJson = r.EmbeddingJson,
            VectorId = r.VectorId,
            AclJson = r.AclJson,
            CreatedAt = r.CreatedAt,
        }).ToList();
    }

    public async Task<IReadOnlyList<KnowledgeArticleEntity>> SearchArticlesKeywordAsync(
        Guid tenantId, string query, int limit, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT TOP (@Limit) id AS Id, tenant_id AS TenantId, source_type AS SourceType, source_id AS SourceId,
                   title AS Title, body_markdown AS BodyMarkdown, tags AS Tags, status AS Status,
                   published_at AS PublishedAt, updated_at AS UpdatedAt
            FROM knowledge.Knowledge_Articles
            WHERE tenant_id = @TenantId AND status = 'ACTIVE'
              AND (title LIKE @Like OR body_markdown LIKE @Like)
            ORDER BY updated_at DESC
            """;
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<ArticleRow>(new CommandDefinition(sql, new
        {
            TenantId = SqlGuid.ToSql(tenantId),
            Limit = limit,
            Like = $"%{query}%",
        }, cancellationToken: cancellationToken));
        return rows.Select(MapArticle).ToList();
    }

    public async Task<KnowledgeArticleEntity?> GetArticleAsync(Guid tenantId, Guid articleId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT id AS Id, tenant_id AS TenantId, source_type AS SourceType, source_id AS SourceId,
                   title AS Title, body_markdown AS BodyMarkdown, tags AS Tags, status AS Status,
                   published_at AS PublishedAt, updated_at AS UpdatedAt
            FROM knowledge.Knowledge_Articles WHERE tenant_id = @TenantId AND id = @Id
            """;
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        var row = await connection.QuerySingleOrDefaultAsync<ArticleRow>(
            new CommandDefinition(sql, new { TenantId = SqlGuid.ToSql(tenantId), Id = SqlGuid.ToSql(articleId) }, cancellationToken: cancellationToken));
        return row is null ? null : MapArticle(row);
    }

    public async Task InsertIndexRunAsync(Guid id, Guid tenantId, string sourceType, Guid sourceId, string status, CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO knowledge.Knowledge_Index_Runs (id, tenant_id, source_type, source_id, status, chunk_count, started_at)
            VALUES (@Id, @TenantId, @SourceType, @SourceId, @Status, 0, @StartedAt)
            """;
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            Id = SqlGuid.ToSql(id),
            TenantId = SqlGuid.ToSql(tenantId),
            SourceType = sourceType,
            SourceId = SqlGuid.ToSql(sourceId),
            Status = status,
            StartedAt = DateTime.UtcNow,
        }, cancellationToken: cancellationToken));
    }

    public async Task CompleteIndexRunAsync(Guid id, int chunkCount, string? error, CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE knowledge.Knowledge_Index_Runs SET status = @Status, chunk_count = @ChunkCount,
                error_message = @Error, completed_at = @CompletedAt WHERE id = @Id
            """;
        await using var connection = await _connections.OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, new
        {
            Id = SqlGuid.ToSql(id),
            Status = string.IsNullOrEmpty(error) ? "COMPLETED" : "FAILED",
            ChunkCount = chunkCount,
            Error = error,
            CompletedAt = DateTime.UtcNow,
        }, cancellationToken: cancellationToken));
    }

    private static IntelligenceConfigEntity MapConfig(ConfigRow row) => new()
    {
        TenantId = SqlGuid.FromSql(row.TenantId),
        ProviderPath = row.ProviderPath,
        EntraTenantId = row.EntraTenantId,
        EntraConnectedAt = row.EntraConnectedAt,
        EntraConnectedById = row.EntraConnectedById is null ? null : SqlGuid.FromSql(row.EntraConnectedById),
        AzureOpenaiEndpoint = row.AzureOpenaiEndpoint,
        AzureOpenaiDeploymentChat = row.AzureOpenaiDeploymentChat,
        AzureOpenaiDeploymentEmbed = row.AzureOpenaiDeploymentEmbed,
        AzureOpenaiApiKey = row.AzureOpenaiApiKey,
        AiUsername = row.AiUsername,
        AiConnectedAt = row.AiConnectedAt,
        AiConnectedById = row.AiConnectedById is null ? null : SqlGuid.FromSql(row.AiConnectedById),
        FeatureRcaSuggest = row.FeatureRcaSuggest,
        FeatureKnowledgeCopilot = row.FeatureKnowledgeCopilot,
        FeatureReportNarrative = row.FeatureReportNarrative,
        TeamsEnabled = row.TeamsEnabled,
        TeamsWebhookUrl = row.TeamsWebhookUrl,
        MonthlyQueryQuota = row.MonthlyQueryQuota,
        UpdatedAt = row.UpdatedAt,
    };

    private static KnowledgeArticleEntity MapArticle(ArticleRow row) => new()
    {
        Id = SqlGuid.FromSql(row.Id),
        TenantId = SqlGuid.FromSql(row.TenantId),
        SourceType = row.SourceType,
        SourceId = SqlGuid.FromSql(row.SourceId),
        Title = row.Title,
        BodyMarkdown = row.BodyMarkdown,
        Tags = row.Tags,
        Status = row.Status,
        PublishedAt = row.PublishedAt,
        UpdatedAt = row.UpdatedAt,
    };

    private sealed class ConfigRow
    {
        public string TenantId { get; init; } = "";
        public string ProviderPath { get; init; } = "";
        public string? EntraTenantId { get; init; }
        public DateTime? EntraConnectedAt { get; init; }
        public string? EntraConnectedById { get; init; }
        public string? AzureOpenaiEndpoint { get; init; }
        public string? AzureOpenaiDeploymentChat { get; init; }
        public string? AzureOpenaiDeploymentEmbed { get; init; }
        public string? AzureOpenaiApiKey { get; init; }
        public string? AiUsername { get; init; }
        public DateTime? AiConnectedAt { get; init; }
        public string? AiConnectedById { get; init; }
        public bool FeatureRcaSuggest { get; init; }
        public bool FeatureKnowledgeCopilot { get; init; }
        public bool FeatureReportNarrative { get; init; }
        public bool TeamsEnabled { get; init; }
        public string? TeamsWebhookUrl { get; init; }
        public int MonthlyQueryQuota { get; init; }
        public DateTime UpdatedAt { get; init; }
    }

    private sealed class ArticleRow
    {
        public string Id { get; init; } = "";
        public string TenantId { get; init; } = "";
        public string SourceType { get; init; } = "";
        public string SourceId { get; init; } = "";
        public string Title { get; init; } = "";
        public string? BodyMarkdown { get; init; }
        public string? Tags { get; init; }
        public string Status { get; init; } = "";
        public DateTime PublishedAt { get; init; }
        public DateTime UpdatedAt { get; init; }
    }

    private sealed class ChunkRow
    {
        public string Id { get; init; } = "";
        public string TenantId { get; init; } = "";
        public string ArticleId { get; init; } = "";
        public int ChunkIndex { get; init; }
        public string ChunkText { get; init; } = "";
        public int TokenCount { get; init; }
        public string? EmbeddingJson { get; init; }
        public string? VectorId { get; init; }
        public string? AclJson { get; init; }
        public DateTime CreatedAt { get; init; }
    }
}
