namespace Lotris.Application.Intelligence;

public interface IVectorStore
{
    bool IsEnabled { get; }

    Task EnsureCollectionAsync(CancellationToken cancellationToken = default);

    Task UpsertChunkAsync(
        Guid tenantId,
        Guid chunkId,
        Guid articleId,
        float[] embedding,
        string chunkText,
        CancellationToken cancellationToken = default);

    Task DeleteArticleVectorsAsync(Guid tenantId, Guid articleId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<VectorSearchHit>> SearchAsync(
        Guid tenantId,
        float[] queryEmbedding,
        int topK,
        CancellationToken cancellationToken = default);
}

public sealed class VectorSearchHit
{
    public Guid ChunkId { get; init; }
    public Guid ArticleId { get; init; }
    public double Score { get; init; }
}

public sealed class NullVectorStore : IVectorStore
{
    public bool IsEnabled => false;

    public Task EnsureCollectionAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;

    public Task UpsertChunkAsync(
        Guid tenantId,
        Guid chunkId,
        Guid articleId,
        float[] embedding,
        string chunkText,
        CancellationToken cancellationToken = default) => Task.CompletedTask;

    public Task DeleteArticleVectorsAsync(Guid tenantId, Guid articleId, CancellationToken cancellationToken = default)
        => Task.CompletedTask;

    public Task<IReadOnlyList<VectorSearchHit>> SearchAsync(
        Guid tenantId,
        float[] queryEmbedding,
        int topK,
        CancellationToken cancellationToken = default)
        => Task.FromResult<IReadOnlyList<VectorSearchHit>>([]);
}
