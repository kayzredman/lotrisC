namespace Lotris.Contracts.Health;

public record LivenessResponse(string Status, DateTime Timestamp);

public record ReadinessResponse(
    string Status,
    IReadOnlyDictionary<string, DependencyHealth> Dependencies,
    DateTime Timestamp);

public record DependencyHealth(string Status, string? Description, double? DurationMs);
