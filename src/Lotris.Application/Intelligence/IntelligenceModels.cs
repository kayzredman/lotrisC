namespace Lotris.Application.Intelligence;

public sealed class IntelligenceConfigEntity
{
    public Guid TenantId { get; init; }
    public string ProviderPath { get; init; } = "DISABLED";
    public string? EntraTenantId { get; init; }
    public DateTime? EntraConnectedAt { get; init; }
    public Guid? EntraConnectedById { get; init; }
    public string? AzureOpenaiEndpoint { get; init; }
    public string? AzureOpenaiDeploymentChat { get; init; }
    public string? AzureOpenaiDeploymentEmbed { get; init; }
    public string? AzureOpenaiApiKey { get; init; }
    public bool FeatureRcaSuggest { get; init; }
    public bool FeatureKnowledgeCopilot { get; init; }
    public bool FeatureReportNarrative { get; init; }
    public bool TeamsEnabled { get; init; }
    public string? TeamsWebhookUrl { get; init; }
    public int MonthlyQueryQuota { get; init; } = 500;
    public DateTime UpdatedAt { get; init; }
}

public sealed class KnowledgeArticleEntity
{
    public Guid Id { get; init; }
    public Guid TenantId { get; init; }
    public string SourceType { get; init; } = "";
    public Guid SourceId { get; init; }
    public string Title { get; init; } = "";
    public string? BodyMarkdown { get; init; }
    public string? Tags { get; init; }
    public string Status { get; init; } = "ACTIVE";
    public DateTime PublishedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public sealed class KnowledgeChunkEntity
{
    public Guid Id { get; init; }
    public Guid TenantId { get; init; }
    public Guid ArticleId { get; init; }
    public int ChunkIndex { get; init; }
    public string ChunkText { get; init; } = "";
    public int TokenCount { get; init; }
    public string? EmbeddingJson { get; init; }
    public string? VectorId { get; init; }
    public string? AclJson { get; init; }
    public DateTime CreatedAt { get; init; }
}

public sealed class UsageLedgerEntry
{
    public Guid Id { get; init; }
    public Guid TenantId { get; init; }
    public Guid? UserId { get; init; }
    public string Feature { get; init; } = "";
    public string Provider { get; init; } = "";
    public int TokensIn { get; init; }
    public int TokensOut { get; init; }
    public DateTime CreatedAt { get; init; }
}
