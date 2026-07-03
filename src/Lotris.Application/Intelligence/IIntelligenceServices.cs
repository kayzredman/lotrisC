using Lotris.Domain;

namespace Lotris.Application.Intelligence;

public interface IIntelligenceRepository
{
    Task<IntelligenceConfigEntity> GetOrCreateConfigAsync(Guid tenantId, CancellationToken cancellationToken = default);
    Task SaveConfigAsync(IntelligenceConfigEntity config, CancellationToken cancellationToken = default);
    Task<int> CountQueriesThisMonthAsync(Guid tenantId, CancellationToken cancellationToken = default);
    Task InsertUsageAsync(UsageLedgerEntry entry, CancellationToken cancellationToken = default);

    Task<Guid> UpsertArticleAsync(KnowledgeArticleEntity article, CancellationToken cancellationToken = default);
    Task DeleteChunksForArticleAsync(Guid tenantId, Guid articleId, CancellationToken cancellationToken = default);
    Task InsertChunkAsync(KnowledgeChunkEntity chunk, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<KnowledgeChunkEntity>> ListChunksForTenantAsync(Guid tenantId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<KnowledgeArticleEntity>> SearchArticlesKeywordAsync(Guid tenantId, string query, int limit, CancellationToken cancellationToken = default);
    Task<KnowledgeArticleEntity?> GetArticleAsync(Guid tenantId, Guid articleId, CancellationToken cancellationToken = default);

    Task InsertIndexRunAsync(Guid id, Guid tenantId, string sourceType, Guid sourceId, string status, CancellationToken cancellationToken = default);
    Task CompleteIndexRunAsync(Guid id, int chunkCount, string? error, CancellationToken cancellationToken = default);
}

public interface IEmbeddingProvider
{
    Task<float[]> EmbedAsync(string text, IntelligenceConfigEntity config, CancellationToken cancellationToken = default);
}

public interface IChatProvider
{
    Task<(string Content, int TokensIn, int TokensOut)> CompleteAsync(
        string systemPrompt,
        string userPrompt,
        IntelligenceConfigEntity config,
        CancellationToken cancellationToken = default);
}

public interface IApiKeyProtector
{
    string Protect(string plainText);
    string Unprotect(string protectedText);
}
