namespace Lotris.Application.Intelligence;

public sealed class IntelligenceOptions
{
    public const string SectionName = "Intelligence";

    /// <summary>Qdrant HTTP base URL, e.g. http://localhost:6333. Empty disables vector sidecar.</summary>
    public string? QdrantUrl { get; init; }

    public string CollectionName { get; init; } = "lotris_knowledge";

    public bool IsQdrantEnabled => !string.IsNullOrWhiteSpace(QdrantUrl);
}
