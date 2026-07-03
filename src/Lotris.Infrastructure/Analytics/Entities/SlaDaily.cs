namespace Lotris.Infrastructure.Analytics.Entities;

public class SlaDaily
{
    public Guid Id { get; set; }

    public Guid TenantId { get; set; }

    public DateOnly Date { get; set; }

    public int TotalTickets { get; set; }

    public int PickupBreaches { get; set; }

    public int ResolutionBreaches { get; set; }

    public decimal? CompliancePct { get; set; }

    public DateTime UpdatedAt { get; set; }
}
