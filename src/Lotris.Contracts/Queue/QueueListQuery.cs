namespace Lotris.Contracts.Queue;

public record QueueListQuery(
    Guid? TeamId = null,
    int Page = 1,
    int Limit = 25);
