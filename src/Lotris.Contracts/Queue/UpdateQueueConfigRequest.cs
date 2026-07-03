namespace Lotris.Contracts.Queue;

public record UpdateQueueConfigRequest(
    int? MaxCapacityPerEngineer = null,
    int? PickupSlaMinutes = null,
    int? ResolutionSlaMinutes = null,
    bool? AutoAssignEnabled = null,
    Guid? TeamId = null);
