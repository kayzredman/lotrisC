namespace Lotris.Infrastructure.Analytics.Entities;

public class EngineerPerf
{
    public Guid Id { get; set; }

    public Guid TenantId { get; set; }

    public Guid EngineerId { get; set; }

    public string WeekKey { get; set; } = string.Empty;

    public int TicketsResolved { get; set; }

    public int TasksCompleted { get; set; }

    public int SlaBreaches { get; set; }

    public decimal? AvgResolutionHours { get; set; }

    public decimal? KpiScore { get; set; }

    public DateTime UpdatedAt { get; set; }
}
