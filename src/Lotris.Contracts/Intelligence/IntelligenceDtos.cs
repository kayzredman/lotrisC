namespace Lotris.Contracts.Intelligence;

public record IntelligenceConfigDto(
    string ProviderPath,
    string? EntraTenantId,
    DateTime? EntraConnectedAt,
    string? AzureOpenaiEndpoint,
    string? AzureOpenaiDeploymentChat,
    string? AzureOpenaiDeploymentEmbed,
    bool HasApiKey,
    bool FeatureRcaSuggest,
    bool FeatureKnowledgeCopilot,
    bool FeatureReportNarrative,
    bool TeamsEnabled,
    bool TeamsConfigured,
    int MonthlyQueryQuota,
    int QueriesThisMonth);

public record UpdateIntelligenceConfigRequest(
    string ProviderPath,
    string? EntraTenantId,
    string? AzureOpenaiEndpoint,
    string? AzureOpenaiDeploymentChat,
    string? AzureOpenaiDeploymentEmbed,
    string? AzureOpenaiApiKey,
    bool FeatureRcaSuggest,
    bool FeatureKnowledgeCopilot,
    bool FeatureReportNarrative,
    bool TeamsEnabled,
    string? TeamsWebhookUrl,
    int MonthlyQueryQuota);

public record ConnectEntraRequest(string EntraTenantId);

public record KnowledgeQueryRequest(string Query, int? TopK);

public record KnowledgeCitationDto(
    Guid ArticleId,
    string SourceType,
    Guid SourceId,
    string Title,
    string Excerpt,
    double Score);

public record KnowledgeQueryResponse(
    string Answer,
    IReadOnlyList<KnowledgeCitationDto> Citations,
    int TokensUsed);

public record KnowledgeSearchResultDto(
    Guid ArticleId,
    string SourceType,
    Guid SourceId,
    string Title,
    string Excerpt,
    double Score);

public record RcaSuggestResponse(
    string? IncidentSummary,
    string? ImmediateCause,
    string? RootCauseStatement,
    string? ContributingFactors,
    string? ResolutionSummary,
    IReadOnlyList<KnowledgeCitationDto> Citations);

public record ReportNarrativeDto(string Summary, string? Recommendations);
