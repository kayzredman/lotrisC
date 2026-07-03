namespace Lotris.Contracts.Queue;

public record QueueHealthResponse(
    IReadOnlyList<QueueStatusCount> StatusCounts,
    int PickupSlaBreaches,
    int ResolutionSlaBreaches,
    IReadOnlyList<EngineerWorkload> EngineerWorkloads);

public record QueueStatusCount(string Status, Guid? TeamId, int Count);

public record EngineerWorkload(Guid AssigneeId, int OpenCount);
