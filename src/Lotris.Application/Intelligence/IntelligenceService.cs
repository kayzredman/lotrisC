using System.Text;
using System.Text.Json;
using Lotris.Application.Common;
using Lotris.Application.ProblemManagement;
using Lotris.Contracts;
using Lotris.Contracts.Intelligence;
using Lotris.Domain;

namespace Lotris.Application.Intelligence;

public sealed class IntelligenceService
{
    private static readonly UserRole[] LeadRoles =
    [
        UserRole.SuperAdmin,
        UserRole.Admin,
        UserRole.ItManager,
        UserRole.TeamLead,
    ];

    private readonly IIntelligenceRepository _repo;
    private readonly IRcaRepository _rca;
    private readonly IChatProvider _chat;
    private readonly IEmbeddingProvider _embeddings;
    private readonly IApiKeyProtector _protector;

    public IntelligenceService(
        IIntelligenceRepository repo,
        IRcaRepository rca,
        IChatProvider chat,
        IEmbeddingProvider embeddings,
        IApiKeyProtector protector)
    {
        _repo = repo;
        _rca = rca;
        _chat = chat;
        _embeddings = embeddings;
        _protector = protector;
    }

    public async Task<IntelligenceConfigDto> GetConfigAsync(LotrisSession session, CancellationToken cancellationToken = default)
    {
        AssertLead(session);
        var config = await _repo.GetOrCreateConfigAsync(session.TenantId, cancellationToken);
        var queries = await _repo.CountQueriesThisMonthAsync(session.TenantId, cancellationToken);
        return MapConfig(config, queries);
    }

    public async Task<IntelligenceConfigDto> UpdateConfigAsync(
        LotrisSession session,
        UpdateIntelligenceConfigRequest request,
        CancellationToken cancellationToken = default)
    {
        AssertLead(session);
        var existing = await _repo.GetOrCreateConfigAsync(session.TenantId, cancellationToken);

        var apiKey = existing.AzureOpenaiApiKey;
        if (!string.IsNullOrWhiteSpace(request.AzureOpenaiApiKey))
        {
            apiKey = _protector.Protect(request.AzureOpenaiApiKey);
        }

        var config = new IntelligenceConfigEntity
        {
            TenantId = session.TenantId,
            ProviderPath = request.ProviderPath is "ENTERPRISE" or "DISABLED" ? request.ProviderPath : "DISABLED",
            EntraTenantId = request.EntraTenantId ?? existing.EntraTenantId,
            EntraConnectedAt = existing.EntraConnectedAt,
            EntraConnectedById = existing.EntraConnectedById,
            AzureOpenaiEndpoint = request.AzureOpenaiEndpoint?.TrimEnd('/'),
            AzureOpenaiDeploymentChat = request.AzureOpenaiDeploymentChat,
            AzureOpenaiDeploymentEmbed = request.AzureOpenaiDeploymentEmbed,
            AzureOpenaiApiKey = apiKey,
            FeatureRcaSuggest = request.FeatureRcaSuggest,
            FeatureKnowledgeCopilot = request.FeatureKnowledgeCopilot,
            FeatureReportNarrative = request.FeatureReportNarrative,
            TeamsEnabled = request.TeamsEnabled,
            TeamsWebhookUrl = request.TeamsWebhookUrl,
            MonthlyQueryQuota = Math.Max(10, request.MonthlyQueryQuota),
            UpdatedAt = DateTime.UtcNow,
        };

        await _repo.SaveConfigAsync(config, cancellationToken);
        var queries = await _repo.CountQueriesThisMonthAsync(session.TenantId, cancellationToken);
        return MapConfig(config, queries);
    }

    public async Task<IntelligenceConfigDto> ConnectEntraAsync(
        LotrisSession session,
        ConnectEntraRequest request,
        CancellationToken cancellationToken = default)
    {
        AssertLead(session);
        var existing = await _repo.GetOrCreateConfigAsync(session.TenantId, cancellationToken);
        var config = new IntelligenceConfigEntity
        {
            TenantId = session.TenantId,
            ProviderPath = "ENTERPRISE",
            EntraTenantId = request.EntraTenantId,
            EntraConnectedAt = DateTime.UtcNow,
            EntraConnectedById = session.UserId,
            AzureOpenaiEndpoint = existing.AzureOpenaiEndpoint,
            AzureOpenaiDeploymentChat = existing.AzureOpenaiDeploymentChat,
            AzureOpenaiDeploymentEmbed = existing.AzureOpenaiDeploymentEmbed,
            AzureOpenaiApiKey = existing.AzureOpenaiApiKey,
            FeatureRcaSuggest = existing.FeatureRcaSuggest,
            FeatureKnowledgeCopilot = existing.FeatureKnowledgeCopilot,
            FeatureReportNarrative = existing.FeatureReportNarrative,
            TeamsEnabled = existing.TeamsEnabled,
            TeamsWebhookUrl = existing.TeamsWebhookUrl,
            MonthlyQueryQuota = existing.MonthlyQueryQuota,
            UpdatedAt = DateTime.UtcNow,
        };
        await _repo.SaveConfigAsync(config, cancellationToken);
        var queries = await _repo.CountQueriesThisMonthAsync(session.TenantId, cancellationToken);
        return MapConfig(config, queries);
    }

    public async Task<KnowledgeQueryResponse> QueryAsync(
        LotrisSession session,
        KnowledgeQueryRequest request,
        CancellationToken cancellationToken = default)
    {
        var config = await _repo.GetOrCreateConfigAsync(session.TenantId, cancellationToken);
        await EnsureFeatureEnabled(config, config.FeatureKnowledgeCopilot, "KNOWLEDGE_COPILOT", session, cancellationToken);

        var topK = Math.Clamp(request.TopK ?? 5, 1, 10);
        var hits = await SearchAsync(session.TenantId, request.Query, topK, cancellationToken);
        if (hits.Count == 0)
        {
            return new KnowledgeQueryResponse(
                "I could not find relevant knowledge articles for this question. Try publishing RCAs to the knowledge base first.",
                [],
                0);
        }

        var context = string.Join("\n\n", hits.Select((h, i) => $"[{i + 1}] {h.Title}\n{h.Excerpt}"));
        var system = """
            You are Lotris IT knowledge copilot. Answer only using the provided context.
            Always cite sources as [1], [2], etc. If the context is insufficient, say so.
            Be concise and actionable for IT engineers.
            """;
        var user = $"Context:\n{context}\n\nQuestion: {request.Query}";

        var (answer, tokensIn, tokensOut) = await _chat.CompleteAsync(system, user, config, cancellationToken);
        await RecordUsage(session, "KNOWLEDGE_COPILOT", tokensIn, tokensOut, cancellationToken);

        var citations = hits.Select(h => new KnowledgeCitationDto(
            h.ArticleId, h.SourceType, h.SourceId, h.Title, h.Excerpt, h.Score)).ToList();

        return new KnowledgeQueryResponse(answer, citations, tokensIn + tokensOut);
    }

    public async Task<IReadOnlyList<KnowledgeSearchResultDto>> SearchAsync(
        Guid tenantId,
        string query,
        int topK,
        CancellationToken cancellationToken = default)
    {
        var config = await _repo.GetOrCreateConfigAsync(tenantId, cancellationToken);
        var chunks = await _repo.ListChunksForTenantAsync(tenantId, cancellationToken);

        if (chunks.Count == 0)
        {
            var articles = await _repo.SearchArticlesKeywordAsync(tenantId, query, topK, cancellationToken);
            return articles.Select(a => new KnowledgeSearchResultDto(
                a.Id, a.SourceType, a.SourceId, a.Title,
                (a.BodyMarkdown ?? "").Length > 240 ? a.BodyMarkdown![..240] + "…" : a.BodyMarkdown ?? "",
                0.5)).ToList();
        }

        var canEmbed = IsEnterpriseReady(config);
        if (canEmbed)
        {
            try
            {
                var queryVec = await _embeddings.EmbedAsync(query, config, cancellationToken);
                var scored = chunks
                    .Select(c =>
                    {
                        var vec = ParseEmbedding(c.EmbeddingJson);
                        var score = vec is null ? 0 : CosineSimilarity(queryVec, vec);
                        return (Chunk: c, Score: score);
                    })
                    .Where(x => x.Score > 0.1)
                    .OrderByDescending(x => x.Score)
                    .Take(topK)
                    .ToList();

                if (scored.Count > 0)
                {
                    return await MapChunkHits(tenantId, scored, cancellationToken);
                }
            }
            catch
            {
                // Fall through to keyword.
            }
        }

        return await KeywordChunkSearchAsync(tenantId, query, chunks, topK, cancellationToken);
    }

    public async Task<RcaSuggestResponse> SuggestRcaAsync(
        LotrisSession session,
        Guid rcaId,
        CancellationToken cancellationToken = default)
    {
        var config = await _repo.GetOrCreateConfigAsync(session.TenantId, cancellationToken);
        await EnsureFeatureEnabled(config, config.FeatureRcaSuggest, "RCA_AI_SUGGEST", session, cancellationToken);

        var rca = await _rca.GetRcaByIdAsync(session.TenantId, rcaId, cancellationToken)
            ?? throw new NotFoundException("RCA not found");
        var links = await _rca.GetTicketLinksAsync(session.TenantId, rcaId, cancellationToken);
        var ticketContext = string.Join("\n", links.Select(l => $"- Ticket {l.TicketRef}: {l.TicketTitle}"));

        var hits = await SearchAsync(session.TenantId, rca.IncidentSummary ?? rca.RootCauseStatement ?? "incident", 3, cancellationToken);
        var kbContext = string.Join("\n", hits.Select((h, i) => $"[{i + 1}] {h.Title}: {h.Excerpt}"));

        var system = """
            You are an IT root cause analysis assistant. Suggest draft RCA fields using ticket and knowledge context.
            Return JSON only with keys: incidentSummary, immediateCause, rootCauseStatement, contributingFactors, resolutionSummary.
            Cite similar incidents as [1], [2] in rootCauseStatement when relevant.
            """;
        var user = $"""
            Linked tickets:
            {ticketContext}

            Similar knowledge:
            {kbContext}

            Current RCA status: {rca.Status}
            """;

        var (raw, tokensIn, tokensOut) = await _chat.CompleteAsync(system, user, config, cancellationToken);
        await RecordUsage(session, "RCA_AI_SUGGEST", tokensIn, tokensOut, cancellationToken);

        var citations = hits.Select(h => new KnowledgeCitationDto(
            h.ArticleId, "RCA", h.SourceId, h.Title, h.Excerpt, h.Score)).ToList();

        try
        {
            var json = ExtractJson(raw);
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            return new RcaSuggestResponse(
                root.TryGetProperty("incidentSummary", out var i) ? i.GetString() : null,
                root.TryGetProperty("immediateCause", out var ic) ? ic.GetString() : null,
                root.TryGetProperty("rootCauseStatement", out var rc) ? rc.GetString() : null,
                root.TryGetProperty("contributingFactors", out var cf) ? cf.GetString() : null,
                root.TryGetProperty("resolutionSummary", out var rs) ? rs.GetString() : null,
                citations);
        }
        catch
        {
            return new RcaSuggestResponse(null, null, raw, null, null, citations);
        }
    }

    public async Task<ReportNarrativeDto?> TryGenerateReportNarrativeAsync(
        Guid tenantId,
        string reportType,
        string dataSnapshotJson,
        CancellationToken cancellationToken = default)
    {
        var config = await _repo.GetOrCreateConfigAsync(tenantId, cancellationToken);
        if (!config.FeatureReportNarrative || !IsEnterpriseReady(config))
        {
            return null;
        }

        var system = "Write a concise executive summary (2-3 paragraphs) and 3 bullet recommendations for an IT operations report. Use only the JSON data provided.";
        var user = $"Report type: {reportType}\nData:\n{dataSnapshotJson}";
        var (content, _, _) = await _chat.CompleteAsync(system, user, config, cancellationToken);
        var parts = content.Split("Recommendations:", 2, StringSplitOptions.TrimEntries);
        return new ReportNarrativeDto(parts[0], parts.Length > 1 ? parts[1] : null);
    }

    private async Task EnsureFeatureEnabled(
        IntelligenceConfigEntity config,
        bool featureFlag,
        string feature,
        LotrisSession session,
        CancellationToken cancellationToken)
    {
        if (!featureFlag)
        {
            throw new ForbiddenException("This intelligence feature is disabled for your tenant.");
        }

        if (!IsEnterpriseReady(config))
        {
            throw new BadRequestException("Connect Azure OpenAI via Admin → Intelligence (Enterprise / Microsoft) first.");
        }

        var used = await _repo.CountQueriesThisMonthAsync(session.TenantId, cancellationToken);
        if (used >= config.MonthlyQueryQuota)
        {
            throw new BadRequestException("Monthly intelligence query quota exceeded.");
        }
    }

    private async Task RecordUsage(
        LotrisSession session,
        string feature,
        int tokensIn,
        int tokensOut,
        CancellationToken cancellationToken)
    {
        await _repo.InsertUsageAsync(new UsageLedgerEntry
        {
            Id = Guid.NewGuid(),
            TenantId = session.TenantId,
            UserId = session.UserId,
            Feature = feature,
            Provider = "AZURE_OPENAI",
            TokensIn = tokensIn,
            TokensOut = tokensOut,
            CreatedAt = DateTime.UtcNow,
        }, cancellationToken);
    }

    private async Task<IReadOnlyList<KnowledgeSearchResultDto>> MapChunkHits(
        Guid tenantId,
        List<(KnowledgeChunkEntity Chunk, double Score)> scored,
        CancellationToken cancellationToken)
    {
        var results = new List<KnowledgeSearchResultDto>();
        foreach (var (chunk, score) in scored)
        {
            var article = await _repo.GetArticleAsync(tenantId, chunk.ArticleId, cancellationToken);
            if (article is null) continue;
            results.Add(new KnowledgeSearchResultDto(
                article.Id,
                article.SourceType,
                article.SourceId,
                article.Title,
                chunk.ChunkText.Length > 240 ? chunk.ChunkText[..240] + "…" : chunk.ChunkText,
                score));
        }

        return results;
    }

    private async Task<IReadOnlyList<KnowledgeSearchResultDto>> KeywordChunkSearchAsync(
        Guid tenantId,
        string query,
        IReadOnlyList<KnowledgeChunkEntity> chunks,
        int topK,
        CancellationToken cancellationToken)
    {
        var terms = query.ToLowerInvariant().Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var scored = chunks
            .Select(c =>
            {
                var text = c.ChunkText.ToLowerInvariant();
                var score = terms.Count(t => text.Contains(t)) / (double)Math.Max(1, terms.Length);
                return (Chunk: c, Score: score);
            })
            .Where(x => x.Score > 0)
            .OrderByDescending(x => x.Score)
            .Take(topK)
            .ToList();

        return await MapChunkHits(tenantId, scored, cancellationToken);
    }

    private static bool IsEnterpriseReady(IntelligenceConfigEntity config) =>
        config.ProviderPath == "ENTERPRISE" &&
        !string.IsNullOrWhiteSpace(config.AzureOpenaiEndpoint) &&
        !string.IsNullOrWhiteSpace(config.AzureOpenaiDeploymentChat) &&
        !string.IsNullOrWhiteSpace(config.AzureOpenaiApiKey);

    private IntelligenceConfigDto MapConfig(IntelligenceConfigEntity config, int queries) => new(
        config.ProviderPath,
        config.EntraTenantId,
        config.EntraConnectedAt,
        config.AzureOpenaiEndpoint,
        config.AzureOpenaiDeploymentChat,
        config.AzureOpenaiDeploymentEmbed,
        !string.IsNullOrWhiteSpace(config.AzureOpenaiApiKey),
        config.FeatureRcaSuggest,
        config.FeatureKnowledgeCopilot,
        config.FeatureReportNarrative,
        config.TeamsEnabled,
        !string.IsNullOrWhiteSpace(config.TeamsWebhookUrl),
        config.MonthlyQueryQuota,
        queries);

    private static void AssertLead(LotrisSession session)
    {
        if (!LeadRoles.Contains(session.Role))
        {
            throw new ForbiddenException("Admin access required");
        }
    }

    private static float[]? ParseEmbedding(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            return JsonSerializer.Deserialize<float[]>(json);
        }
        catch
        {
            return null;
        }
    }

    private static double CosineSimilarity(float[] a, float[] b)
    {
        if (a.Length != b.Length) return 0;
        double dot = 0, na = 0, nb = 0;
        for (var i = 0; i < a.Length; i++)
        {
            dot += a[i] * b[i];
            na += a[i] * a[i];
            nb += b[i] * b[i];
        }

        return na == 0 || nb == 0 ? 0 : dot / (Math.Sqrt(na) * Math.Sqrt(nb));
    }

    private static string ExtractJson(string raw)
    {
        var start = raw.IndexOf('{');
        var end = raw.LastIndexOf('}');
        return start >= 0 && end > start ? raw[start..(end + 1)] : raw;
    }
}
