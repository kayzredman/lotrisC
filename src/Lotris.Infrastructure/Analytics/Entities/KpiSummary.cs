namespace Lotris.Infrastructure.Analytics.Entities;

public class KpiSummary
{
    public Guid Id { get; set; }

    public Guid TenantId { get; set; }

    public Guid EngineerId { get; set; }

    public string PeriodKey { get; set; } = string.Empty;

    public decimal OverallScore { get; set; }

    public DateTime UpdatedAt { get; set; }
}
