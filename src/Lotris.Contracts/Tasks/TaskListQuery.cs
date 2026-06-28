namespace Lotris.Contracts.Tasks;

public sealed class TaskListQuery
{
    public string? Status { get; set; }
    public string? Source { get; set; }
    public Guid? TeamId { get; set; }
    public Guid? AssigneeId { get; set; }
    public int Page { get; set; } = 1;
    public int Limit { get; set; } = 25;
}
