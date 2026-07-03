namespace Lotris.Contracts.Analytics;

public record EngineerLoadDto(
    Guid EngineerId,
    string FullName,
    int OpenTickets,
    int MaxCapacity,
    int LoadPct,
    bool IsUnavailable);

public record WorkloadSuggestionDto(
    Guid TicketId,
    string TicketTitle,
    Guid FromEngineerId,
    string FromEngineerName,
    Guid ToEngineerId,
    string ToEngineerName);

public record TeamWorkloadResultDto(
    Guid TeamId,
    IReadOnlyList<EngineerLoadDto> Engineers,
    IReadOnlyList<WorkloadSuggestionDto> Suggestions);
