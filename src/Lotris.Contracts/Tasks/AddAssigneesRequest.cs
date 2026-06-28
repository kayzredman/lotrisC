namespace Lotris.Contracts.Tasks;

public sealed record AddAssigneesRequest(IReadOnlyList<Guid> AssigneeIds);
