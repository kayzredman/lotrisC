namespace Lotris.Infrastructure.Analytics.Entities;

public class TicketDaily
{
    public Guid Id { get; set; }

    public Guid TenantId { get; set; }

    public DateOnly Date { get; set; }

    public int TotalCreated { get; set; }

    public int TotalResolved { get; set; }

    public int TotalEscalated { get; set; }

    public int TotalOpen { get; set; }

    public int SlaBreachCount { get; set; }

    public decimal? AvgResolutionHours { get; set; }

    public DateTime UpdatedAt { get; set; }
}
