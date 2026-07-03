namespace Lotris.Contracts.Tasks;

public sealed record CreateChecklistItemRequest(string Label, int? SortOrder = null);
