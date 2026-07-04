namespace Lotris.Contracts.Health;

public record LivenessResponse(string Status, DateTime Timestamp);

public record ReadinessResponse(
    string Status,
    IReadOnlyDictionary<string, DependencyHealth> Dependencies,
    DateTime Timestamp);

public record DependencyHealth(string Status, string? Description, double? DurationMs);

public record ServiceHealthEntryDto(
    string Id,
    string Name,
    string Sub,
    string Status,
    double Cpu,
    int MemUsedMb,
    int MemTotalMb,
    long UptimeSeconds,
    double LastPingMs,
    DateTime CheckedAt);

public record QueueDepthEntryDto(
    string Name,
    string Sub,
    int Waiting,
    int Active,
    int Failed,
    int Delayed,
    int CompletedLastHour);

public record HealthSnapshotDto(
    IReadOnlyList<ServiceHealthEntryDto> Services,
    IReadOnlyList<QueueDepthEntryDto> Queues,
    DateTime Timestamp);

public record IncidentEntryDto(
    long Id,
    string Title,
    string Service,
    DateTime? ResolvedAt,
    DateTime CreatedAt,
    string? Details);

public record RestartServiceResponse(bool Queued, int? CooldownSeconds, string? Error);

public record StoreHealthDto(
    bool Healthy,
    IReadOnlyList<string> CorruptedPackages,
    string RepairState,
    DateTime? StartedAt);
