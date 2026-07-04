using System.Net.Http.Json;
using System.Text.Json;
using Lotris.Application.Intelligence;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Lotris.Infrastructure.Intelligence;

public sealed class QdrantVectorStore : IVectorStore
{
    private readonly IntelligenceOptions _options;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<QdrantVectorStore> _logger;

    public QdrantVectorStore(
        IOptions<IntelligenceOptions> options,
        IHttpClientFactory httpClientFactory,
        ILogger<QdrantVectorStore> logger)
    {
        _options = options.Value;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public bool IsEnabled => _options.IsQdrantEnabled;

    public async Task EnsureCollectionAsync(CancellationToken cancellationToken = default)
    {
        if (!IsEnabled)
        {
            return;
        }

        try
        {
            var client = CreateClient();
            var name = _options.CollectionName;
            using var getRes = await client.GetAsync($"collections/{name}", cancellationToken);
            if (getRes.IsSuccessStatusCode)
            {
                return;
            }

            using var createRes = await client.PutAsJsonAsync($"collections/{name}", new
            {
                vectors = new { size = 1536, distance = "Cosine" },
            }, cancellationToken);

            if (!createRes.IsSuccessStatusCode)
            {
                var body = await createRes.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogWarning("Qdrant create collection failed: {Status} {Body}", createRes.StatusCode, body);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Qdrant unavailable — semantic search will fall back to keyword/SQL");
        }
    }

    public async Task UpsertChunkAsync(
        Guid tenantId,
        Guid chunkId,
        Guid articleId,
        float[] embedding,
        string chunkText,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled)
        {
            return;
        }

        var client = CreateClient();
        var payload = new
        {
            points = new[]
            {
                new
                {
                    id = chunkId.ToString(),
                    vector = embedding,
                    payload = new Dictionary<string, object>
                    {
                        ["tenant_id"] = tenantId.ToString(),
                        ["article_id"] = articleId.ToString(),
                        ["preview"] = chunkText.Length > 200 ? chunkText[..200] : chunkText,
                    },
                },
            },
        };

        using var res = await client.PutAsJsonAsync(
            $"collections/{_options.CollectionName}/points?wait=true",
            payload,
            cancellationToken);

        if (!res.IsSuccessStatusCode)
        {
            _logger.LogWarning("Qdrant upsert failed for chunk {ChunkId}: {Status}", chunkId, res.StatusCode);
        }
    }

    public async Task DeleteArticleVectorsAsync(Guid tenantId, Guid articleId, CancellationToken cancellationToken = default)
    {
        if (!IsEnabled)
        {
            return;
        }

        var client = CreateClient();
        var body = new
        {
            filter = new
            {
                must = new object[]
                {
                    new { key = "tenant_id", match = new { value = tenantId.ToString() } },
                    new { key = "article_id", match = new { value = articleId.ToString() } },
                },
            },
        };

        using var res = await client.PostAsJsonAsync(
            $"collections/{_options.CollectionName}/points/delete?wait=true",
            body,
            cancellationToken);

        if (!res.IsSuccessStatusCode)
        {
            _logger.LogWarning("Qdrant delete failed for article {ArticleId}: {Status}", articleId, res.StatusCode);
        }
    }

    public async Task<IReadOnlyList<VectorSearchHit>> SearchAsync(
        Guid tenantId,
        float[] queryEmbedding,
        int topK,
        CancellationToken cancellationToken = default)
    {
        if (!IsEnabled)
        {
            return [];
        }

        var client = CreateClient();
        var body = new
        {
            vector = queryEmbedding,
            limit = topK,
            with_payload = true,
            filter = new
            {
                must = new[]
                {
                    new { key = "tenant_id", match = new { value = tenantId.ToString() } },
                },
            },
        };

        using var res = await client.PostAsJsonAsync($"collections/{_options.CollectionName}/points/search", body, cancellationToken);
        if (!res.IsSuccessStatusCode)
        {
            return [];
        }

        using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync(cancellationToken));
        if (!doc.RootElement.TryGetProperty("result", out var results))
        {
            return [];
        }

        var hits = new List<VectorSearchHit>();
        foreach (var item in results.EnumerateArray())
        {
            if (!item.TryGetProperty("id", out var idEl))
            {
                continue;
            }

            var chunkId = Guid.Parse(idEl.GetString()!);
            var score = item.TryGetProperty("score", out var scoreEl) ? scoreEl.GetDouble() : 0;
            Guid articleId = Guid.Empty;
            if (item.TryGetProperty("payload", out var payload) &&
                payload.TryGetProperty("article_id", out var articleEl))
            {
                Guid.TryParse(articleEl.GetString(), out articleId);
            }

            hits.Add(new VectorSearchHit { ChunkId = chunkId, ArticleId = articleId, Score = score });
        }

        return hits;
    }

    private HttpClient CreateClient()
    {
        var client = _httpClientFactory.CreateClient("qdrant");
        client.BaseAddress = new Uri(_options.QdrantUrl!.TrimEnd('/'));
        return client;
    }
}
