using System.Text;
using System.Text.Json;
using Lotris.Application.ProblemManagement;

namespace Lotris.Application.Intelligence;

public sealed class KnowledgeIngestionService
{
    private readonly IIntelligenceRepository _repo;
    private readonly IEmbeddingProvider _embeddings;
    private readonly IVectorStore _vectors;

    public KnowledgeIngestionService(
        IIntelligenceRepository repo,
        IEmbeddingProvider embeddings,
        IVectorStore vectors)
    {
        _repo = repo;
        _embeddings = embeddings;
        _vectors = vectors;
    }

    public async Task IngestPublishedRcaAsync(
        Guid tenantId,
        Guid rcaId,
        string title,
        string? incidentSummary,
        string? rootCause,
        string? workaround,
        string? permanentFix,
        string? lessonsLearned,
        CancellationToken cancellationToken = default)
    {
        var body = BuildRcaMarkdown(title, incidentSummary, rootCause, workaround, permanentFix, lessonsLearned);
        await IndexArticleAsync(tenantId, "RCA", rcaId, title, body, "rca,kedb", cancellationToken);
    }

    public async Task IngestClosedTicketAsync(
        Guid tenantId,
        Guid ticketId,
        string title,
        string? description,
        CancellationToken cancellationToken = default)
    {
        var body = BuildTicketMarkdown(title, description);
        await IndexArticleAsync(tenantId, "TICKET", ticketId, title, body, "ticket,incident", cancellationToken);
    }

    private async Task IndexArticleAsync(
        Guid tenantId,
        string sourceType,
        Guid sourceId,
        string title,
        string body,
        string tags,
        CancellationToken cancellationToken)
    {
        var runId = Guid.NewGuid();
        await _repo.InsertIndexRunAsync(runId, tenantId, sourceType, sourceId, "RUNNING", cancellationToken);

        try
        {
            var config = await _repo.GetOrCreateConfigAsync(tenantId, cancellationToken);
            var now = DateTime.UtcNow;
            var articleId = await _repo.UpsertArticleAsync(new KnowledgeArticleEntity
            {
                Id = Guid.NewGuid(),
                TenantId = tenantId,
                SourceType = sourceType,
                SourceId = sourceId,
                Title = title,
                BodyMarkdown = body,
                Tags = tags,
                Status = "ACTIVE",
                PublishedAt = now,
                UpdatedAt = now,
            }, cancellationToken);

            await _vectors.DeleteArticleVectorsAsync(tenantId, articleId, cancellationToken);
            await _repo.DeleteChunksForArticleAsync(tenantId, articleId, cancellationToken);

            var chunks = ChunkText(body, 1200);
            for (var i = 0; i < chunks.Count; i++)
            {
                var chunkId = Guid.NewGuid();
                string? embeddingJson = null;
                if (CanEmbed(config))
                {
                    try
                    {
                        var vec = await _embeddings.EmbedAsync(chunks[i], config, cancellationToken);
                        embeddingJson = JsonSerializer.Serialize(vec);
                        if (_vectors.IsEnabled)
                        {
                            await _vectors.UpsertChunkAsync(tenantId, chunkId, articleId, vec, chunks[i], cancellationToken);
                        }
                    }
                    catch
                    {
                        // Keyword search still works without embeddings.
                    }
                }

                await _repo.InsertChunkAsync(new KnowledgeChunkEntity
                {
                    Id = chunkId,
                    TenantId = tenantId,
                    ArticleId = articleId,
                    ChunkIndex = i,
                    ChunkText = chunks[i],
                    TokenCount = EstimateTokens(chunks[i]),
                    EmbeddingJson = embeddingJson,
                    VectorId = _vectors.IsEnabled ? chunkId.ToString() : null,
                    AclJson = """{"roles":["ENGINEER","TEAM_LEAD","IT_MANAGER","ADMIN","SUPERADMIN"]}""",
                    CreatedAt = now,
                }, cancellationToken);
            }

            await _repo.CompleteIndexRunAsync(runId, chunks.Count, null, cancellationToken);
        }
        catch (Exception ex)
        {
            await _repo.CompleteIndexRunAsync(runId, 0, ex.Message, cancellationToken);
            throw;
        }
    }

    private static bool CanEmbed(IntelligenceConfigEntity config) =>
        config.ProviderPath != AiProviders.Disabled &&
        !string.IsNullOrWhiteSpace(config.AzureOpenaiApiKey) &&
        (AiProviders.UsesCredentialLogin(config.ProviderPath) ||
         !string.IsNullOrWhiteSpace(config.AzureOpenaiEndpoint));

    private static string BuildTicketMarkdown(string title, string? description) =>
        new StringBuilder()
            .AppendLine($"# {title}")
            .AppendLine()
            .AppendLine("## Description")
            .AppendLine(description ?? "—")
            .ToString();

    private static string BuildRcaMarkdown(
        string title,
        string? incident,
        string? rootCause,
        string? workaround,
        string? permanentFix,
        string? lessons) =>
        new StringBuilder()
            .AppendLine($"# {title}")
            .AppendLine()
            .AppendLine("## Incident")
            .AppendLine(incident ?? "—")
            .AppendLine()
            .AppendLine("## Root cause")
            .AppendLine(rootCause ?? "—")
            .AppendLine()
            .AppendLine("## Workaround")
            .AppendLine(workaround ?? "—")
            .AppendLine()
            .AppendLine("## Permanent fix")
            .AppendLine(permanentFix ?? "—")
            .AppendLine()
            .AppendLine("## Lessons learned")
            .AppendLine(lessons ?? "—")
            .ToString();

    internal static List<string> ChunkText(string text, int maxChars)
    {
        var paragraphs = text.Split("\n\n", StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var chunks = new List<string>();
        var current = new StringBuilder();

        foreach (var p in paragraphs)
        {
            if (current.Length + p.Length + 2 > maxChars && current.Length > 0)
            {
                chunks.Add(current.ToString().Trim());
                current.Clear();
            }

            if (p.Length > maxChars)
            {
                for (var i = 0; i < p.Length; i += maxChars)
                {
                    chunks.Add(p.Substring(i, Math.Min(maxChars, p.Length - i)));
                }

                continue;
            }

            if (current.Length > 0) current.AppendLine().AppendLine();
            current.Append(p);
        }

        if (current.Length > 0) chunks.Add(current.ToString().Trim());
        if (chunks.Count == 0 && !string.IsNullOrWhiteSpace(text)) chunks.Add(text);
        return chunks;
    }

    private static int EstimateTokens(string text) => Math.Max(1, text.Length / 4);
}
