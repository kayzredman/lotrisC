namespace Lotris.Contracts.Queue;

public record QueueConfigDto(
    int MaxCapacityPerEngineer,
    int PickupSlaMinutes,
    int ResolutionSlaMinutes,
    bool AutoAssignEnabled);
