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
    private readonly IAiProviderValidator _aiValidator;

    public IntelligenceService(
        IIntelligenceRepository repo,
        IRcaRepository rca,
        IChatProvider chat,
        IEmbeddingProvider embeddings,
        IApiKeyProtector protector,
        IAiProviderValidator aiValidator)
    {
        _repo = repo;
        _rca = rca;
        _chat = chat;
        _embeddings = embeddings;
        _protector = protector;
        _aiValidator = aiValidator;
    }

    public IReadOnlyList<AiProviderOptionDto> ListAiProviders()
        =>
        [
            new(AiProviders.ChatGpt, "ChatGPT", "credentials", "Recommended for local development — email + OpenAI API key (sk-…) as password"),
            new(AiProviders.OpenAi, "OpenAI", "credentials", "Recommended for local development — email + OpenAI API key (sk-…) as password"),
            new(AiProviders.Claude, "Claude", "credentials", "Email + Anthropic API key as password"),
            new(AiProviders.Cursor, "Cursor", "credentials", "Verification only — connect ChatGPT or OpenAI for AI chat. Email + Cursor API key (crsr_…) as password"),
            new(AiProviders.Copilot, "Copilot", "microsoft", "Enterprise — requires your Azure tenant (see INTELLIGENCE-ENTERPRISE-SETUP.md)"),
        ];

    public async Task<ConnectAiProviderResponse> ConnectAiProviderAsync(
        LotrisSession session,
        ConnectAiProviderRequest request,
        CancellationToken cancellationToken = default)
    {
        AssertLead(session);
        var provider = request.Provider?.Trim().ToUpperInvariant() ?? "";
        if (!AiProviders.IsValid(provider))
        {
            throw new BadRequestException("Select a supported AI provider.");
        }

        if (AiProviders.UsesMicrosoftOAuth(provider))
        {
            throw new BadRequestException("Copilot uses Sign in with Microsoft — use the Microsoft button.");
        }

        if (string.IsNullOrWhiteSpace(request.Username))
        {
            throw new BadRequestException("Username or email is required.");
        }

        await _aiValidator.ValidateAsync(provider, request.Username.Trim(), request.Password, cancellationToken);

        var existing = await _repo.GetOrCreateConfigAsync(session.TenantId, cancellationToken);
        var now = DateTime.UtcNow;
        var config = new IntelligenceConfigEntity
        {
            TenantId = session.TenantId,
            ProviderPath = provider,
            AiUsername = request.Username.Trim(),
            AiConnectedAt = now,
            AiConnectedById = session.UserId,
            AzureOpenaiApiKey = _protector.Protect(request.Password.Trim()),
            EntraTenantId = existing.EntraTenantId,
            EntraConnectedAt = existing.EntraConnectedAt,
            EntraConnectedById = existing.EntraConnectedById,
            AzureOpenaiEndpoint = existing.AzureOpenaiEndpoint,
            AzureOpenaiDeploymentChat = existing.AzureOpenaiDeploymentChat,
            AzureOpenaiDeploymentEmbed = existing.AzureOpenaiDeploymentEmbed,
            FeatureRcaSuggest = existing.FeatureRcaSuggest || true,
            FeatureKnowledgeCopilot = existing.FeatureKnowledgeCopilot || true,
            FeatureReportNarrative = existing.FeatureReportNarrative,
            TeamsEnabled = existing.TeamsEnabled,
            TeamsWebhookUrl = existing.TeamsWebhookUrl,
            MonthlyQueryQuota = existing.MonthlyQueryQuota,
            UpdatedAt = now,
        };

        await _repo.SaveConfigAsync(config, cancellationToken);
        return new ConnectAiProviderResponse(
            true,
            provider,
            config.AiUsername,
            config.AiConnectedAt,
            $"{provider} connected. AI intelligence features will use this provider.");
    }

    public async Task<KnowledgeQueryResponse> TestConnectionAsync(
        LotrisSession session,
        CancellationToken cancellationToken = default)
    {
        var config = await _repo.GetOrCreateConfigAsync(session.TenantId, cancellationToken);
        if (!IsProviderReady(config))
        {
            throw new BadRequestException("Connect an AI provider first.");
        }

        if (string.Equals(config.ProviderPath, AiProviders.Cursor, StringComparison.OrdinalIgnoreCase))
        {
            var cred = _protector.Unprotect(config.AzureOpenaiApiKey!);
            if (cred.StartsWith("crsr_", StringComparison.OrdinalIgnoreCase))
            {
                return new KnowledgeQueryResponse(
                    "Cursor account linked successfully. Your API key is valid — intelligence features are enabled for this tenant.",
                    [],
                    0);
            }
        }

        var (answer, tokensIn, tokensOut) = await _chat.CompleteAsync(
            "You are Lotris AI setup assistant.",
            "Reply with one short sentence confirming the AI provider connection works.",
            config,
            cancellationToken);

        await RecordUsage(session, "AI_SETUP_TEST", tokensIn, tokensOut, config.ProviderPath, cancellationToken);
        return new KnowledgeQueryResponse(answer, [], tokensIn + tokensOut);
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
            ProviderPath = AiProviders.IsValid(request.ProviderPath) || request.ProviderPath is "ENTERPRISE" or "DISABLED"
                ? request.ProviderPath.ToUpperInvariant()
                : existing.ProviderPath,
            EntraTenantId = request.EntraTenantId ?? existing.EntraTenantId,
            EntraConnectedAt = existing.EntraConnectedAt,
            EntraConnectedById = existing.EntraConnectedById,
            AzureOpenaiEndpoint = request.AzureOpenaiEndpoint?.TrimEnd('/'),
            AzureOpenaiDeploymentChat = request.AzureOpenaiDeploymentChat,
            AzureOpenaiDeploymentEmbed = request.AzureOpenaiDeploymentEmbed,
            AzureOpenaiApiKey = apiKey,
            AiUsername = existing.AiUsername,
            AiConnectedAt = existing.AiConnectedAt,
            AiConnectedById = existing.AiConnectedById,
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
        return await ConnectEntraForTenantAsync(session.TenantId, session.UserId, request.EntraTenantId, cancellationToken);
    }

    public async Task<IntelligenceConfigDto> ConnectEntraForTenantAsync(
        Guid tenantId,
        Guid userId,
        string entraTenantId,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(entraTenantId))
        {
            throw new BadRequestException("Entra tenant ID is required.");
        }

        var existing = await _repo.GetOrCreateConfigAsync(tenantId, cancellationToken);
        var config = new IntelligenceConfigEntity
        {
            TenantId = tenantId,
            ProviderPath = AiProviders.Copilot,
            EntraTenantId = entraTenantId.Trim(),
            EntraConnectedAt = DateTime.UtcNow,
            EntraConnectedById = userId,
            AiUsername = existing.AiUsername,
            AiConnectedAt = existing.AiConnectedAt,
            AiConnectedById = existing.AiConnectedById,
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
        var queries = await _repo.CountQueriesThisMonthAsync(tenantId, cancellationToken);
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
                "No knowledge articles match your question yet. Publish RCAs from Problem Management to add them to the knowledge base, then try again.",
                [],
                0);
        }

        var context = string.Join("\n\n", hits.Select((h, i) => $"[{i + 1}] {h.Title}\n{h.Excerpt}"));
        var system = """
            You are Lotris IT knowledge assistant. Answer only using the provided context.
            Always cite sources as [1], [2], etc. If the context is insufficient, say so.
            Be concise and actionable for IT engineers.
            """;
        var user = $"Context:\n{context}\n\nQuestion: {request.Query}";

        string answer;
        int tokensIn;
        int tokensOut;
        try
        {
            (answer, tokensIn, tokensOut) = await _chat.CompleteAsync(system, user, config, cancellationToken);
            await RecordUsage(session, "KNOWLEDGE_COPILOT", tokensIn, tokensOut, cancellationToken);
        }
        catch (InvalidOperationException)
        {
            answer = BuildRetrievalOnlyAnswer(request.Query, hits);
            tokensIn = 0;
            tokensOut = 0;
        }

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

        var canEmbed = IsProviderReady(config) &&
                       (config.ProviderPath is AiProviders.Enterprise or AiProviders.Copilot);
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

        var citations = hits.Select(h => new KnowledgeCitationDto(
            h.ArticleId, "RCA", h.SourceId, h.Title, h.Excerpt, h.Score)).ToList();

        string raw;
        int tokensIn;
        int tokensOut;
        try
        {
            (raw, tokensIn, tokensOut) = await _chat.CompleteAsync(system, user, config, cancellationToken);
            await RecordUsage(session, "RCA_AI_SUGGEST", tokensIn, tokensOut, cancellationToken);
        }
        catch (InvalidOperationException)
        {
            return BuildRcaSuggestFromKnowledge(rca, hits, citations);
        }

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
        if (!config.FeatureReportNarrative || !IsProviderReady(config))
        {
            return null;
        }

        var system = "Write a concise executive summary (2-3 paragraphs) and 3 bullet recommendations for an IT operations report. Use only the JSON data provided.";
        var user = $"Report type: {reportType}\nData:\n{dataSnapshotJson}";
        try
        {
            var (content, _, _) = await _chat.CompleteAsync(system, user, config, cancellationToken);
            var parts = content.Split("Recommendations:", 2, StringSplitOptions.TrimEntries);
            return new ReportNarrativeDto(parts[0], parts.Length > 1 ? parts[1] : null);
        }
        catch (InvalidOperationException)
        {
            return null;
        }
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

        if (!IsProviderReady(config))
        {
            throw new BadRequestException("Connect an AI provider via Admin → Intelligence and AI Setup first.");
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
        => await RecordUsage(session, feature, tokensIn, tokensOut, "AZURE_OPENAI", cancellationToken);

    private async Task RecordUsage(
        LotrisSession session,
        string feature,
        int tokensIn,
        int tokensOut,
        string provider,
        CancellationToken cancellationToken)
    {
        await _repo.InsertUsageAsync(new UsageLedgerEntry
        {
            Id = Guid.NewGuid(),
            TenantId = session.TenantId,
            UserId = session.UserId,
            Feature = feature,
            Provider = provider,
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

    private static bool IsProviderReady(IntelligenceConfigEntity config)
    {
        if (config.ProviderPath == AiProviders.Disabled)
        {
            return false;
        }

        if (AiProviders.UsesCredentialLogin(config.ProviderPath))
        {
            return config.AiConnectedAt.HasValue && !string.IsNullOrWhiteSpace(config.AzureOpenaiApiKey);
        }

        if (string.Equals(config.ProviderPath, AiProviders.Copilot, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(config.ProviderPath, AiProviders.Enterprise, StringComparison.OrdinalIgnoreCase))
        {
            return !string.IsNullOrWhiteSpace(config.AzureOpenaiApiKey) &&
                   !string.IsNullOrWhiteSpace(config.AzureOpenaiEndpoint) &&
                   !string.IsNullOrWhiteSpace(config.AzureOpenaiDeploymentChat);
        }

        return false;
    }

    private static bool IsConnected(IntelligenceConfigEntity config) =>
        (AiProviders.UsesCredentialLogin(config.ProviderPath) && config.AiConnectedAt.HasValue) ||
        (string.Equals(config.ProviderPath, AiProviders.Copilot, StringComparison.OrdinalIgnoreCase) && config.EntraConnectedAt.HasValue);

    private IntelligenceConfigDto MapConfig(IntelligenceConfigEntity config, int queries) => new(
        config.ProviderPath,
        config.AiUsername,
        config.AiConnectedAt,
        config.EntraTenantId,
        config.EntraConnectedAt,
        config.AzureOpenaiEndpoint,
        config.AzureOpenaiDeploymentChat,
        config.AzureOpenaiDeploymentEmbed,
        !string.IsNullOrWhiteSpace(config.AzureOpenaiApiKey),
        IsConnected(config),
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

    private static string BuildRetrievalOnlyAnswer(
        string query,
        IReadOnlyList<KnowledgeSearchResultDto> hits)
    {
        var excerpts = string.Join("\n\n", hits.Select((h, i) => $"[{i + 1}] {h.Title}\n{h.Excerpt}"));
        return $"""
            Here is what we found in the knowledge base for "{query}":

            {excerpts}

            Connect ChatGPT or OpenAI in Intelligence and AI Setup for full AI-generated answers.
            """;
    }

    private static RcaSuggestResponse BuildRcaSuggestFromKnowledge(
        RcaEntity rca,
        IReadOnlyList<KnowledgeSearchResultDto> hits,
        IReadOnlyList<KnowledgeCitationDto> citations)
    {
        if (hits.Count == 0)
        {
            return new RcaSuggestResponse(
                rca.IncidentSummary,
                null,
                "No similar knowledge articles were found. Connect ChatGPT or OpenAI in Intelligence and AI Setup for AI-generated RCA drafts.",
                null,
                null,
                citations);
        }

        var primary = hits[0];
        var incident = string.IsNullOrWhiteSpace(rca.IncidentSummary)
            ? $"{primary.Title}: {primary.Excerpt}"
            : rca.IncidentSummary;
        var root = string.Join(
            "\n\n",
            hits.Select((h, i) => $"[{i + 1}] {h.Title}\n{h.Excerpt}"));
        var contributing = hits.Count > 1
            ? string.Join(", ", hits.Skip(1).Select(h => h.Title))
            : null;
        var resolution = hits.Count > 1
            ? $"Review related incident [{2}] {hits[1].Title} for resolution patterns."
            : null;

        return new RcaSuggestResponse(
            incident,
            null,
            root + "\n\n(Suggestions from knowledge base only — connect ChatGPT or OpenAI for full AI drafts.)",
            contributing,
            resolution,
            citations);
    }

    private static string ExtractJson(string raw)
    {
        var start = raw.IndexOf('{');
        var end = raw.LastIndexOf('}');
        return start >= 0 && end > start ? raw[start..(end + 1)] : raw;
    }
}
